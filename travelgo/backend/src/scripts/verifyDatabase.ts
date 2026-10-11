import { Client } from 'pg';
import { ENV } from '../config/env.js';
import { assertIsolatedTestDatabase } from '../utils/testDatabaseGuard.js';

const expectedMigrations = [
  '20261010_01_init_travelgo_schema.sql',
  '20261011_02_rbac_partner_foundation.sql',
  '20261011_03_persistent_travel_resources.sql',
  '20261011_04_hugo_intelligence_foundation.sql',
];
const expectedTables = [
  'audit_logs', 'blog_posts', 'booking_status_history', 'bookings', 'business_members',
  'businesses', 'partner_applications', 'places', 'reviews', 'tickets', 'tour_places',
  'tours', 'trip_sessions', 'user_roles', 'users', 'user_events',
  'recommendation_impressions', 'ai_model_registry',
];
const expectedIndexes = [
  'idx_places_location', 'idx_bookings_user_idempotency', 'idx_tickets_business_status',
  'idx_tours_business_status', 'idx_trip_sessions_user_created',
  'idx_user_events_user_time', 'idx_recommendation_impressions_model_time',
  'idx_ai_model_registry_type_status',
];
const expectedChecks = [
  'places_status_check', 'tickets_capacity_check', 'bookings_status_phase3_check',
  'bookings_quantity_check',
  'user_events_item_type_check', 'user_events_event_type_check',
  'recommendation_impressions_score_check', 'ai_model_registry_status_check',
];

function assertContains(actual: string[], expected: string[], label: string): void {
  const missing = expected.filter((item) => !actual.includes(item));
  if (missing.length) throw new Error(`Missing ${label}: ${missing.join(', ')}`);
}

async function run(): Promise<void> {
  assertIsolatedTestDatabase('Database verification');
  const client = new Client({ host: ENV.DB_HOST, port: ENV.DB_PORT, user: ENV.DB_USER, password: ENV.DB_PASSWORD, database: ENV.DB_NAME, ssl: false });
  await client.connect();
  try {
    const identity = await client.query('SELECT current_database() AS database, current_user AS username');
    if (identity.rows[0].database !== ENV.DB_NAME) throw new Error('Connected database does not match DB_NAME');

    const extension = await client.query("SELECT extversion FROM pg_extension WHERE extname='postgis'");
    if (extension.rowCount !== 1) throw new Error('PostGIS extension is not installed in the target database');

    const migrations = await client.query('SELECT filename FROM schema_migrations ORDER BY filename');
    assertContains(migrations.rows.map((row) => row.filename), expectedMigrations, 'migrations');

    const tables = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'");
    assertContains(tables.rows.map((row) => row.table_name), expectedTables, 'tables');

    const indexes = await client.query("SELECT indexname FROM pg_indexes WHERE schemaname='public'");
    assertContains(indexes.rows.map((row) => row.indexname), expectedIndexes, 'indexes');

    const constraints = await client.query("SELECT conname, contype FROM pg_constraint WHERE connamespace='public'::regnamespace");
    assertContains(constraints.rows.filter((row) => row.contype === 'c').map((row) => row.conname), expectedChecks, 'check constraints');
    const foreignKeyCount = constraints.rows.filter((row) => row.contype === 'f').length;
    if (foreignKeyCount < 18) throw new Error(`Expected at least 18 foreign keys, found ${foreignKeyCount}`);

    const columnTypes = await client.query(`
      SELECT table_name, column_name, data_type, udt_name
      FROM information_schema.columns
      WHERE table_schema='public' AND (
        (table_name='bookings' AND column_name IN ('booking_date','return_date')) OR
        (table_name='places' AND column_name='location')
      )
    `);
    const typeMap = new Map(columnTypes.rows.map((row) => [`${row.table_name}.${row.column_name}`, row.udt_name || row.data_type]));
    if (typeMap.get('bookings.booking_date') !== 'date' || typeMap.get('bookings.return_date') !== 'date') {
      throw new Error('Booking date columns must use PostgreSQL DATE');
    }
    if (typeMap.get('places.location') !== 'geometry') throw new Error('places.location must use PostGIS geometry');

    console.log(JSON.stringify({
      database: identity.rows[0].database,
      user: identity.rows[0].username,
      postgis: extension.rows[0].extversion,
      migrations: migrations.rowCount,
      applicationTables: expectedTables.length,
      foreignKeys: foreignKeyCount,
      result: 'PASS',
    }, null, 2));
  } finally {
    await client.end();
  }
}

run().catch((error) => {
  console.error('Database verification failed:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
