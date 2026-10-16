import { Client } from 'pg';
import { ENV } from '../config/env.js';
import { assertDatabaseSentinel, assertIsolatedTestDatabase } from '../utils/testDatabaseGuard.js';

const expectedMigrations = [
  '20261010_01_init_travelgo_schema.sql',
  '20261011_02_rbac_partner_foundation.sql',
  '20261011_03_persistent_travel_resources.sql',
  '20261011_04_hugo_intelligence_foundation.sql',
  '20261012_05_user_behavior_telemetry.sql',
  '20261012_06_recommendation_exposure.sql',
  '20261012_07_recommendation_booking_retention.sql',
  '20261012_08_server_side_favorites.sql',
  '20261012_09_verified_reviews.sql',
  '20261012_10_review_account_deletion_privacy.sql',
];
const expectedTables = [
  'audit_logs', 'blog_posts', 'booking_status_history', 'bookings', 'business_members',
  'businesses', 'partner_applications', 'places', 'reviews', 'tickets', 'tour_places',
  'tours', 'trip_sessions', 'user_roles', 'users', 'user_events',
  'recommendation_impressions', 'ai_model_registry',
  'user_telemetry_consents',
  'recommendation_requests', 'recommendation_candidates', 'recommendation_visible_impressions',
  'user_favorites',
];
const expectedIndexes = [
  'idx_places_location', 'idx_bookings_user_idempotency', 'idx_tickets_business_status',
  'idx_tours_business_status', 'idx_trip_sessions_user_created',
  'idx_user_events_user_time', 'idx_recommendation_impressions_model_time',
  'idx_ai_model_registry_type_status',
  'uq_user_events_client_event_id', 'idx_user_events_expiry',
  'idx_user_events_training_eligibility', 'idx_user_telemetry_consents_updated',
  'idx_recommendation_requests_export', 'idx_recommendation_candidates_request_rank',
  'idx_recommendation_visible_export', 'idx_bookings_recommendation_request',
  'idx_user_favorites_user_created', 'idx_user_favorites_place',
  'uq_reviews_booking', 'idx_reviews_target_moderation_created', 'idx_reviews_user_created',
  'idx_reviews_ai_export',
];
const expectedChecks = [
  'places_status_check', 'tickets_capacity_check', 'bookings_status_phase3_check',
  'bookings_quantity_check',
  'user_events_item_type_check', 'user_events_event_type_check',
  'recommendation_impressions_score_check', 'ai_model_registry_status_check',
  'user_events_contract_version_check', 'user_events_environment_check',
  'user_events_origin_check', 'user_events_context_size_check',
  'user_events_client_identity_check', 'user_events_retention_check',
  'user_telemetry_consents_personalization_requires_analytics',
  'recommendation_requests_environment_check', 'recommendation_requests_consent_check',
  'recommendation_candidates_rank_check', 'recommendation_candidates_score_check',
  'recommendation_visible_ratio_check', 'recommendation_visible_dwell_check',
  'bookings_recommendation_attribution_check',
  'reviews_verification_status_check', 'reviews_verification_provenance_check',
  'reviews_moderation_status_check', 'reviews_source_check', 'reviews_environment_check',
  'reviews_comment_length_check', 'reviews_rating_service_check', 'reviews_rating_price_check',
  'reviews_rating_location_check', 'reviews_rating_experience_check', 'reviews_criteria_provided_check',
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
    await assertDatabaseSentinel(client, 'Database verification');
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
    if (foreignKeyCount < 19) throw new Error(`Expected at least 19 foreign keys, found ${foreignKeyCount}`);

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
