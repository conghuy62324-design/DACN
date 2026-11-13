import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

export default async function preflight() {
  const require = createRequire(path.resolve(process.cwd(), '../backend/package.json'));
  require('dotenv').config({ path: path.resolve(process.cwd(), '../backend/.env') });
  const { sequelize } = require('./dist/config/database.js');
  const { bookingTestGuard, bookingFingerprint } = require('./dist/tests/bookingFixtures.js');
  try {
    await bookingTestGuard('T07 guard and schema preflight');
    for (const filename of ['20261028_11_trip_planner_metadata.sql', '20261030_12_booking_request_fingerprint.sql']) {
      const expected = createHash('sha256').update(readFileSync(path.resolve(process.cwd(), '../database/migrations', filename))).digest('hex');
      const [rows] = await sequelize.query('SELECT checksum FROM schema_migrations WHERE filename = :filename', { replacements: { filename } });
      assert.equal(rows.length, 1); assert.equal(rows[0].checksum, expected);
    }
    const [columns] = await sequelize.query("SELECT table_name, column_name FROM information_schema.columns WHERE table_schema='public' AND ((table_name='bookings' AND column_name='request_fingerprint') OR (table_name='trip_sessions' AND column_name='planner_metadata'))");
    assert.equal(columns.length, 2);
    console.log(JSON.stringify({ t07Preflight: 'PASS', database: 'travelgo_ai_m0_test', sentinel: 'PASS', migration11and12: 'checksum+columns PASS', fingerprint: await bookingFingerprint() }));
  } finally { await sequelize.close(); }
}
