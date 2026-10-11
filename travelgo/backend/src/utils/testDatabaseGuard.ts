import { ENV } from '../config/env.js';

const LOCAL_DATABASE_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

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

export function requireSeedPassword(): string {
  const password = process.env.SEED_PASSWORD;
  if (!password || password.length < 12) {
    throw new Error('SEED_PASSWORD is required and must contain at least 12 characters');
  }
  return password;
}
