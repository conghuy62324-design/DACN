import { sequelize } from '../config/database.js';
import { TelemetryService } from '../services/telemetryService.js';
import { assertDatabaseSentinel, assertTestDatabaseWriteOptIn } from '../utils/testDatabaseGuard.js';

async function run(): Promise<void> {
  assertTestDatabaseWriteOptIn('Telemetry retention purge');
  if (process.env.ALLOW_TELEMETRY_PURGE !== 'true') throw new Error('Telemetry purge requires ALLOW_TELEMETRY_PURGE=true');
  await sequelize.authenticate();
  await assertDatabaseSentinel(sequelize, 'Telemetry retention purge');
  const removed = await TelemetryService.purgeExpired();
  console.log(JSON.stringify({ removed, result: 'PASS' }));
  await sequelize.close();
}

run().catch((error) => {
  console.error('Telemetry purge failed:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
