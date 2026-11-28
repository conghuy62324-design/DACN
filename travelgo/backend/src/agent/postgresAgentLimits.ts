import { createHash, createHmac, randomUUID } from 'node:crypto';
import { Pool, type PoolClient } from 'pg';
import { HttpError } from '../utils/httpError.js';
import type { AgentRequestIdentity, AgentRequestLimits } from './limits.js';

export const agentStateUnavailable = () => new HttpError(503,
  'Giới hạn Agent tạm thời không khả dụng. Vui lòng thử lại sau.', 'AGENT_STATE_UNAVAILABLE');
const busy = () => new HttpError(503, 'Agent đang bận. Vui lòng thử lại sau.', 'AGENT_BUSY');
const fenced = () => new HttpError(503, 'Phiên xử lý model đã hết hiệu lực.', 'AGENT_MODEL_LEASE_LOST');
const source = 'agent_reliability';
const methods = {
  consume: 'SELECT agent_reliability.consume($1::bytea,$2::bytea,$3::bytea) AS value',
  claim: 'SELECT agent_reliability.claim_provider($1::bytea,$2::uuid,$3::uuid) AS value',
  finish: 'SELECT agent_reliability.finish_provider($1::bytea,$2::smallint,$3::uuid,$4::uuid) AS value',
};
type PgValue = string | number | boolean | null;
export type CoordinationQuery = (sql: string, values: readonly unknown[]) => Promise<PgValue>;

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function agentRequestHeader(raw?: string) {
  if (raw === undefined) return;
  if (!uuid.test(raw)) throw new HttpError(400, 'Idempotency-Key của Agent phải là UUID.', 'AGENT_REQUEST_ID_INVALID');
  return raw.toLowerCase();
}

export class PostgresAgentLimits implements AgentRequestLimits {
  private readonly ownerToken = randomUUID();
  private readonly fingerprint: Buffer;
  constructor(private readonly query: CoordinationQuery, private readonly key: Buffer) {
    if (key.length !== 32) throw agentStateUnavailable();
    this.fingerprint = createHash('sha256').update(key).digest();
  }
  private keyFor(domain: string, parts: string[]) {
    return createHmac('sha256', this.key).update(JSON.stringify([domain, ...parts])).digest();
  }
  private async call(sql: string, ...values: unknown[]) {
    try { return await this.query(sql, [this.fingerprint, ...values]); }
    catch { throw agentStateUnavailable(); }
  }
  async consume(principal: string, request?: AgentRequestIdentity) {
    if (!principal) throw agentStateUnavailable();
    const owner = this.keyFor('agent-owner-v1', [principal.toLowerCase()]);
    // A client retry routed to another chat surface should still use the original claim.
    const requestKey = request ? this.keyFor('agent-request-v1',
      [request.lane.endsWith('-confirm') ? 'confirm' : 'chat',
        request.sessionId?.toLowerCase() ?? '', request.requestId.toLowerCase()]) : null;
    const result = await this.call(methods.consume, owner, requestKey);
    if (result === 'ACCEPTED') return;
    if (result === 'LIMIT') throw new HttpError(429, 'Bạn đã đạt giới hạn yêu cầu Agent.', 'AGENT_RATE_LIMITED');
    if (result === 'REPLAY') throw new HttpError(409, 'Yêu cầu Agent đã được tiếp nhận. Hãy dùng mã mới để truy vấn dữ liệu hiện tại.', 'AGENT_G2_REPLAY');
    throw agentStateUnavailable();
  }
  async providerCall<T>(work: (signal: AbortSignal) => Promise<T>,
    caller = new AbortController().signal): Promise<T> {
    caller.throwIfAborted();
    const safetyDeadline = AbortSignal.timeout(30000);
    const signal = AbortSignal.any([caller, safetyDeadline]);
    const token = randomUUID();
    const slot = await this.call(methods.claim, this.ownerToken, token);
    if (slot === null) throw busy();
    if (typeof slot !== 'number' || !Number.isInteger(slot) || slot < 1 || slot > 8) throw agentStateUnavailable();
    let result: T;
    try {
      signal.throwIfAborted();
      // Hold the lease until the underlying operation settles, even if the caller stops waiting.
      result = await work(signal);
      signal.throwIfAborted();
    } catch (error) {
      await this.call(methods.finish, slot, this.ownerToken, token).catch(() => {});
      throw error;
    }
    // This atomically checks the fencing token and DB expiry before any result escapes.
    const valid = await this.call(methods.finish, slot, this.ownerToken, token);
    signal.throwIfAborted();
    if (valid !== true) throw fenced();
    return result;
  }
}

const identitySql = "SELECT current_database() AS db,session_user AS role,shobj_description(d.oid,'pg_database') AS sentinel,"+
  "r.rolsuper OR r.rolcreatedb OR r.rolcreaterole OR r.rolbypassrls AS elevated,"+
  "current_setting('default_transaction_read_only')='on' AS readonly,"+
  "EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND ("+
  "has_table_privilege(format('%I.%I',schemaname,tablename),'INSERT,UPDATE,DELETE,TRUNCATE') OR "+
  "tablename IN ('users','reviews','bookings') AND has_table_privilege(format('%I.%I',schemaname,tablename),'SELECT'))) AS public_access,"+
  "EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='agent_reliability' AND "+
  "has_table_privilege(format('%I.%I',schemaname,tablename),'SELECT,INSERT,UPDATE,DELETE,TRUNCATE')) AS direct_access "+
  "FROM pg_database d JOIN pg_roles r ON r.rolname=session_user WHERE d.datname=current_database()";

export function openAgentCoordination(env: NodeJS.ProcessEnv, production: boolean) {
  const { AGENT_STATE_DATABASE_URL: dsn, AGENT_STATE_DATABASE_NAME: db,
    AGENT_STATE_HMAC_KEY_HEX: key } = env;
  if (!dsn || !db || !key || !/^[a-f0-9]{64}$/i.test(key)) throw agentStateUnavailable();
  let url: URL;
  try { url=new URL(dsn); } catch { throw agentStateUnavailable(); }
  const role = production ? 'agent_state_runtime' : 'agent_p12_runtime';
  const sentinel = production ? 'hugotravel-production-v1' : 'hugotravel-isolated-test-database-v1';
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.hostname || url.search || url.hash ||
    url.pathname !== '/' + db || url.username !== role || !url.password ||
    (!production && (env.NODE_ENV !== 'test' || url.hostname !== '127.0.0.1' || url.port !== '15457' ||
      db !== 'hugotravel_web_integration_test_20261125' ||
      !Number.isFinite(Date.parse(env.AGENT_STATE_TEST_UNTIL ?? ''))))) throw agentStateUnavailable();
  // The approval window gates isolated acceptance queries, including already-open connections.
  const checkWindow = () => {
    if (production) return;
    const remaining = Date.parse(env.AGENT_STATE_TEST_UNTIL ?? '') - Date.now();
    if (!Number.isFinite(remaining) || remaining <= 0 || remaining > 7200000) throw agentStateUnavailable();
  };
  checkWindow();
  const pool = new Pool({
    connectionString: dsn, max:4, connectionTimeoutMillis:2000, idleTimeoutMillis:5000,
    statement_timeout:1500, query_timeout:2200, application_name:source, allowExitOnIdle:true,
    ssl:env.AGENT_STATE_TLS==='true'?{rejectUnauthorized:true}:false,
  });
  // Idle connection errors are surfaced to the next protected request; log no database strings.
  pool.on('error', () => {});
  const verified = new WeakSet<PoolClient>();
  const query: CoordinationQuery = async (sql, values) => {
    checkWindow();
    const client = await pool.connect();
    let error: unknown;
    try {
      if (!verified.has(client)) {
        const {rows:[r]} = await client.query(identitySql);
        if (!r || r.db !== db || r.role !== role || r.sentinel !== sentinel || r.elevated !== false ||
          r.readonly !== false || r.public_access !== false || r.direct_access !== false) throw agentStateUnavailable();
        verified.add(client);
      }
      checkWindow();
      const { rows:[row] } = await client.query(sql, [...values]);
      if (!row || !Object.hasOwn(row, 'value')) throw agentStateUnavailable();
      return row.value;
    } catch (e) { error=e; throw e; }
    finally { client.release(!!error); }
  };
  return { limits:new PostgresAgentLimits(query, Buffer.from(key, 'hex')), close:() => pool.end() };
}
