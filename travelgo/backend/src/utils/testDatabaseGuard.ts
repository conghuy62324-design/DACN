import { ENV } from '../config/env.js';

const LOCAL_DATABASE_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);
export const TEST_DATABASE_SENTINEL = 'hugotravel-isolated-test-database-v1';

type DatabaseQueryable = {
  query(sql: string): Promise<unknown>;
};

export function assertIsolatedTestDatabase(purpose: string): void {
  if (ENV.NODE_ENV === 'production') {
    throw new Error(`${purpose} is disabled when NODE_ENV=production`);
  }
  if (!LOCAL_DATABASE_HOSTS.has(ENV.DB_HOST.toLowerCase())) {
    throw new Error(`${purpose} only accepts a loopback PostgreSQL host; received ${ENV.DB_HOST}`);
  }
  if (!/(^|[_-])(test|dev)([_-]|$)/i.test(ENV.DB_NAME)) {
    throw new Error(`${purpose} requires a database name containing a test/dev segment; received ${ENV.DB_NAME}`);
  }
  if (process.env.DB_SSL === 'true') {
    throw new Error(`${purpose} refuses DB_SSL=true because the target must be an isolated local database`);
  }
}

/** Require a deliberate, exact database target before any test write. */
export function assertTestDatabaseWriteOptIn(purpose: string): void {
  assertIsolatedTestDatabase(purpose);
  if (process.env.ALLOW_TEST_DB_WRITES !== 'true') {
    throw new Error(`${purpose} requires ALLOW_TEST_DB_WRITES=true`);
  }
  const optedInDatabase = process.env.TEST_DATABASE_NAME;
  if (!optedInDatabase || optedInDatabase !== ENV.DB_NAME) {
    throw new Error(
      `${purpose} requires TEST_DATABASE_NAME to exactly match DB_NAME; ` +
      `received TEST_DATABASE_NAME=${optedInDatabase || '<unset>'}, DB_NAME=${ENV.DB_NAME}`
    );
  }
}

/** Verify the durable marker installed intentionally when the test DB was created. */
export async function assertDatabaseSentinel(queryable: DatabaseQueryable, purpose: string): Promise<void> {
  const result = await queryable.query(
    `SELECT current_database() AS database_name,
            shobj_description(oid, 'pg_database') AS sentinel
       FROM pg_database
      WHERE datname = current_database()`
  );
  const rows = Array.isArray(result)
    ? result[0]
    : (result as { rows?: unknown[] }).rows;
  const identity = Array.isArray(rows)
    ? rows[0] as { database_name?: string; sentinel?: string } | undefined
    : undefined;

  if (!identity || identity.database_name !== ENV.DB_NAME) {
    throw new Error(`${purpose} could not verify the connected database identity`);
  }
  if (identity.sentinel !== TEST_DATABASE_SENTINEL) {
    throw new Error(
      `${purpose} refuses database ${identity.database_name}: isolated-test sentinel is missing or invalid`
    );
  }
}

export function requireSeedPassword(): string {
  const password = process.env.SEED_PASSWORD;
  if (!password || password.length < 12) {
    throw new Error('SEED_PASSWORD is required and must contain at least 12 characters');
  }
  return password;
}
