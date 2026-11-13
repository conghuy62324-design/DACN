import { createHash, randomUUID } from 'node:crypto';
import { object, onlyKeys } from './conversation.js';
import { AGENT_TOOLS, type MissingField, type ToolName, type ToolDecision } from './tools.js';
import { readCurrentTurnProof, readPendingTurnProof, validateCurrentTurnProof, type CurrentTurnProof, type ProofState } from './currentTurnProof.js';
import { checkDecisionAgainstProof } from './toolProvenance.js';
import { HttpError } from '../utils/httpError.js';

export const G2_CONSENT_VERSION = 'LOCAL_DEMO_SLOTS_V1';
export const G2_PRIVACY_NOTICE = Object.freeze({ version: G2_CONSENT_VERSION, mode: 'LOCAL_DEMO', ttlSeconds: 900,
  text: 'Chỉ lưu tạm slots du lịch đã xác minh trong bộ nhớ máy chủ tối đa 15 phút, gắn với tài khoản; mất khi restart, không đồng bộ nhiều máy. Không lưu câu chat, JWT, key, profile, Trip hoặc Booking. Chỉ hỗ trợ provider local. Xóa phiên hoặc revoke-all khi kết thúc/logout; logout hiện tại của website chỉ xóa token phía trình duyệt, không tự gọi API này. Không nhập thông tin riêng tư không cần thiết.' });
const uuid = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const fail = (status: number, code: string) => new HttpError(status, 'Phiên hội thoại chưa thể xử lý yêu cầu. Hãy bắt đầu lại hoặc kiểm tra phiên hiện tại.', code);
export type G2Request = { action: 'start' | 'continue'; requestId: string; consentVersion?: string; id?: string; revision?: number };
export function readG2Envelope(raw: unknown): { input: unknown; request: G2Request | null } {
  if (!raw || typeof raw !== 'object' || !Object.hasOwn(raw, 'conversation')) return { input: raw, request: null };
  const { conversation, ...input } = object(raw), value = object(conversation);
  onlyKeys(value, ['action', 'requestId', 'consentVersion', 'id', 'revision']);
  if (typeof value.action !== 'string' || !['start', 'continue'].includes(value.action) || !uuid(value.requestId) || value.consentVersion !== undefined && typeof value.consentVersion !== 'string') throw fail(400, 'AGENT_G2_INVALID_INPUT');
  if (value.action === 'start' && (value.id !== undefined || value.revision !== undefined) || value.action === 'continue' && (!uuid(value.id) || !Number.isSafeInteger(value.revision) || Number(value.revision) < 0)) throw fail(400, 'AGENT_G2_INVALID_INPUT');
  return { input, request: Object.freeze({ action: value.action as G2Request['action'], requestId: value.requestId.toLowerCase(),
    ...(value.consentVersion === undefined ? {} : { consentVersion: value.consentVersion as string }),
    ...(value.id === undefined ? {} : { id: (value.id as string).toLowerCase(), revision: value.revision as number }) }) };
}
export type G2Metadata = { id: string; revision: number; expiresAt: string; mode: 'LOCAL_DEMO'; persisted: false };
export class G2HttpError extends HttpError {
  constructor(error: HttpError, readonly conversation?: G2Metadata) { super(error.statusCode, error.message, error.code); }
}
type StoredState = ProofState | 'INVALIDATED';
type Slot = { state: StoredState; value?: unknown; revision: number; source: 'CURRENT_TURN_PROOF'; unaccented?: boolean };
type Session = { id: string; owner: string; revision: number; expiresAt: number; intent: ToolName | null; slots: Record<string, Slot>; optional: Record<string, Slot>; seen: Set<string>; active?: AbortController };
export interface VerifiedHistoryTurn {
  readonly historyUsed: boolean;
  readonly intent: ToolName | null;
  readonly missing: readonly MissingField[];
  readonly signal: AbortSignal;
  metadata(): G2Metadata;
  assertCurrent(): void;
  check(decision: ToolDecision): ReturnType<typeof checkDecisionAgainstProof>;
  providerData(): string;
  finish(): void;
}
const ownerHash = (id: string) => createHash('sha256').update(id).digest('hex');

/** Explicit local/demo storage, disabled by default. No raw dialogue/model data.
 * State/replay memory bounded. Not durable or multi-process; not JWT revocation. */
export class LocalVerifiedHistoryStore {
  private readonly sessions = new Map<string, Session>();
  private readonly starts = new Map<string, number>();
  private readonly epochs = new Map<string, { nonce: string; expiresAt: number }>();
  private readonly timer: ReturnType<typeof setInterval>;
  constructor(private readonly now: () => number = Date.now,
    private readonly ttlMs = 900000, private readonly maxSessions = 128, private readonly perOwner = 8,
    private readonly maxTurns = 32, private readonly maxBytes = 4096, private readonly maxStarts = 1024) {
    this.timer = setInterval(() => this.sweep(), 60000); this.timer.unref();
  }
  dispose() { clearInterval(this.timer); for (const record of this.sessions.values()) record.active?.abort(); this.sessions.clear(); this.starts.clear(); this.epochs.clear(); }
  private sweep() { const now = this.now(); for (const [id, record] of this.sessions) if (record.expiresAt <= now) { record.active?.abort(); this.sessions.delete(id); } for (const [id, expiry] of this.starts) if (expiry <= now) this.starts.delete(id); for (const [id, value] of this.epochs) if (value.expiresAt <= now) this.epochs.delete(id); }
  /** Capture before async consent: revoke-all also fences starts still awaiting consent. */
  captureOwnerEpoch(owner: string) { this.sweep(); const key = ownerHash(owner); let epoch = this.epochs.get(key); if (!epoch) { if (this.epochs.size >= this.maxStarts) throw fail(503, 'AGENT_G2_CAPACITY'); epoch = { nonce: randomUUID(), expiresAt: this.now() + this.ttlMs }; this.epochs.set(key, epoch); } return epoch.nonce; }
  private lookup(owner: string, id: string): Session { this.sweep(); const record = uuid(id) ? this.sessions.get(id.toLowerCase()) : undefined; if (!record || record.owner !== ownerHash(owner)) throw fail(404, 'AGENT_G2_SESSION_UNAVAILABLE'); return record; }
  private metadata(record: Session): G2Metadata { return { id: record.id, revision: record.revision, expiresAt: new Date(record.expiresAt).toISOString(), mode: 'LOCAL_DEMO', persisted: false }; }
  private size(record: Session) { return Buffer.byteLength(JSON.stringify({ ...record, active: undefined, seen: [...record.seen] })); }
  stats() { this.sweep(); return { sessions: this.sessions.size, startTombstones: this.starts.size, ownerEpochs: this.epochs.size, serializedBytes: [...this.sessions.values()].reduce((n, record) => n + this.size(record), 0) }; }
  reset(owner: string, id: string) { const record = this.lookup(owner, id); record.active?.abort(); record.active = undefined; record.intent = null; record.slots = {}; record.optional = {}; record.revision++; return this.metadata(record); }
  revoke(owner: string, id: string) { const record = this.lookup(owner, id); record.active?.abort(); this.sessions.delete(record.id); return { revoked: true }; }
  revokeAll(owner: string) { this.sweep(); const hash = ownerHash(owner); for (const [id, record] of this.sessions) if (record.owner === hash) { record.active?.abort(); this.sessions.delete(id); } if (this.epochs.has(hash) || this.epochs.size < this.maxStarts) this.epochs.set(hash, { nonce: randomUUID(), expiresAt: this.now() + this.ttlMs }); return { revoked: true }; }

  begin(owner: string, request: G2Request, message: string, epoch = this.captureOwnerEpoch(owner)): VerifiedHistoryTurn {
    request = readG2Envelope({ conversation: request }).request!;
    this.sweep(); let record: Session;
    const hash = ownerHash(owner);
    if (this.epochs.get(hash)?.nonce !== epoch) throw fail(409, 'AGENT_G2_STALE_TURN');
    if (request.action === 'start') {
      const key = hash + ':' + request.requestId;
      if (this.starts.has(key)) throw fail(409, 'AGENT_G2_REPLAY');
      if (this.sessions.size >= this.maxSessions || [...this.sessions.values()].filter(x => x.owner === hash).length >= this.perOwner || this.starts.size >= this.maxStarts) throw fail(503, 'AGENT_G2_CAPACITY');
      record = { id: randomUUID(), owner: hash, revision: 0, expiresAt: this.now() + this.ttlMs, intent: null, slots: {}, optional: {}, seen: new Set() };
      this.sessions.set(record.id, record); this.starts.set(key, record.expiresAt);
    } else record = this.lookup(owner, request.id!);
    if (record.seen.has(request.requestId)) throw fail(409, 'AGENT_G2_REPLAY');
    if (record.active) throw fail(409, 'AGENT_G2_BUSY');
    if (request.action === 'continue' && record.revision !== request.revision) throw fail(409, 'AGENT_G2_REVISION_CONFLICT');
    if (record.seen.size >= this.maxTurns) throw fail(409, 'AGENT_G2_TURN_LIMIT');
    record.seen.add(request.requestId); record.revision++;
    const controller = new AbortController(); record.active = controller;
    const independent = readCurrentTurnProof(message);
    const historyUsed = !independent && !!record.intent;
    const patch = independent || (record.intent ? readPendingTurnProof(message, record.intent) : null);
    if (independent) { record.intent = independent.toolName; record.slots = {}; record.optional = {}; }
    if (patch && Object.values(patch.states).some(state => state !== 'OMITTED')) {
      for (const field of AGENT_TOOLS.find(x => x.name === patch.toolName)!.parameters.required) {
        const state = patch.states[field];
        if (state === 'OMITTED' && !independent) continue;
        const value = patch.values[field];
        // Field schemas do not make credentials a location. Restrict persisted
        // city text further; model/raw dialogue/credential formats never stored.
        const foldedCity = typeof value === 'string' ? value.normalize('NFD').replace(/\p{M}/gu, '').replace(/[đĐ]/gu, 'd').toLowerCase() : '';
        const safeCity = !field.endsWith('City') || typeof value === 'string' && /^[\p{L}][\p{L}\s-]{0,119}$/u.test(value) && value.split(/\s+/u).every(word => word.length <= 24)
          && !/\b(?:nao|gi|tuy|bat ky|cung duoc|chua|khong)\b/u.test(foldedCity);
        const verified = state === 'SET' && safeCity;
        record.slots[field] = { state: verified ? 'SET' : state === 'OMITTED' ? 'OMITTED' : state === 'CONFLICT' ? 'CONFLICT' : 'UNPROVEN', ...(verified ? { value: structuredClone(value) } : {}), revision: record.revision, source: 'CURRENT_TURN_PROOF', ...(verified && patch.accentInsensitiveCities.includes(field) ? { unaccented: true } : {}) };
      }
      for (const [field, state] of Object.entries(patch.optionalStates || {})) record.optional[field] = { state, ...(state === 'SET' ? { value: structuredClone(patch.optionalValues[field]) } : {}), revision: record.revision, source: 'CURRENT_TURN_PROOF' };
      // Missing optional evidence stays omitted; no model/default populates it.
      for (const [field, value] of Object.entries(patch.optionalValues)) if (!record.optional[field]) record.optional[field] = { state: 'SET', value: structuredClone(value), revision: record.revision, source: 'CURRENT_TURN_PROOF' };
    } else {
      for (const field of Object.keys(record.slots)) record.slots[field] = { state: 'INVALIDATED', revision: record.revision, source: 'CURRENT_TURN_PROOF' };
      record.optional = {};
    }
    const merged: CurrentTurnProof | null = record.intent ? {
      toolName: record.intent, dialect: 'NATURAL', values: Object.fromEntries(Object.entries(record.slots).filter(([, slot]) => slot.state === 'SET').map(([field, slot]) => [field, slot.value])),
      states: Object.fromEntries(AGENT_TOOLS.find(x => x.name === record.intent)!.parameters.required.map(field => [field, record.slots[field]?.state === 'SET' ? 'SET' : record.slots[field]?.state === 'CONFLICT' ? 'CONFLICT' : record.slots[field]?.state === 'UNPROVEN' || record.slots[field]?.state === 'INVALIDATED' ? 'UNPROVEN' : 'OMITTED'])),
      optionalValues: Object.fromEntries(Object.entries(record.optional).filter(([, slot]) => slot.state === 'SET').map(([field, slot]) => [field, slot.value])), optionalStates: Object.fromEntries(Object.entries(record.optional).map(([field, slot]) => [field, slot.state === 'INVALIDATED' ? 'UNPROVEN' : slot.state])),
      accentInsensitiveCities: Object.entries(record.slots).filter(([, slot]) => slot.state === 'SET' && slot.unaccented).map(([field]) => field), valid: true,
    } : null;
    if (merged) {
      validateCurrentTurnProof(merged);
      for (const [field, state] of Object.entries(merged.states)) if (state !== 'SET' && record.slots[field]?.state === 'SET') record.slots[field] = { state, revision: record.revision, source: 'CURRENT_TURN_PROOF' };
    }
    if (this.size(record) > this.maxBytes) { controller.abort(); this.sessions.delete(record.id); throw fail(503, 'AGENT_G2_STATE_LIMIT'); }
    const revision = record.revision, captured = structuredClone(merged), intent = record.intent;
    const assertCurrent = () => { this.sweep(); if (this.sessions.get(record.id) !== record || record.owner !== hash || record.revision !== revision || record.active !== controller || controller.signal.aborted) throw fail(409, 'AGENT_G2_STALE_TURN'); };
    return Object.freeze({ historyUsed, intent, missing: Object.freeze(intent ? AGENT_TOOLS.find(x => x.name === intent)!.parameters.required.filter(field => captured!.states[field] !== 'SET') as MissingField[] : []), signal: controller.signal,
      metadata: () => { assertCurrent(); return this.metadata(record); }, assertCurrent,
      check: (decision: ToolDecision) => { assertCurrent(); return checkDecisionAgainstProof(decision, captured); },
      providerData: () => { assertCurrent(); return JSON.stringify({ type: 'SERVER_VERIFIED_SLOTS', intent, values: { ...captured?.values, ...captured?.optionalValues }, states: { ...captured?.states, ...captured?.optionalStates } }); },
      finish: () => { if (this.sessions.get(record.id) === record && record.active === controller) record.active = undefined; },
    });
  }
}
