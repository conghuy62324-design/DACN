import { createHmac } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Client } from 'pg';
import { ENV } from '../config/env.js';
import { assertIsolatedTestDatabase } from '../utils/testDatabaseGuard.js';

type CsvValue = string | number | boolean | Date | null | undefined | object;
type CsvRow = Record<string, CsvValue>;

const REQUIRED_MIGRATION = '20261012_10_review_account_deletion_privacy.sql';
const EMAIL = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PHONE = /(?<!\d)(?:\+?84|0)(?:[ .-]?\d){8,10}(?!\d)/g;

function redact(value: unknown): string {
  return String(value ?? '').replace(EMAIL, '[REDACTED_EMAIL]').replace(PHONE, '[REDACTED_PHONE]');
}

function pseudonym(value: unknown, salt: string): string {
  if (!value) return '';
  return createHmac('sha256', salt).update(String(value)).digest('hex');
}

function normalize(value: CsvValue): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function csv(rows: CsvRow[], columns: string[]): string {
  const escape = (value: CsvValue): string => `"${normalize(value).replace(/"/g, '""')}"`;
  return `${columns.map(escape).join(',')}\n${rows.map((row) => columns.map((column) => escape(row[column])).join(',')).join('\n')}\n`;
}

async function writeCsv(directory: string, filename: string, rows: CsvRow[], columns: string[]): Promise<void> {
  await writeFile(path.join(directory, filename), csv(rows, columns), 'utf8');
}

async function run(): Promise<void> {
  assertIsolatedTestDatabase('HuGo Intelligence dataset export');
  const salt = process.env.AI_EXPORT_SALT;
  if (!salt || salt.length < 16) throw new Error('AI_EXPORT_SALT is required and must contain at least 16 characters');
  const eventEnvironment = process.env.AI_EXPORT_EVENT_ENVIRONMENT || (ENV.NODE_ENV === 'production' ? 'production' : ENV.NODE_ENV === 'test' ? 'test' : 'development');
  if (!['production', 'development', 'test'].includes(eventEnvironment)) throw new Error('AI_EXPORT_EVENT_ENVIRONMENT is invalid');
  const reviewCutoff = process.env.AI_EXPORT_REVIEW_CUTOFF
    ? new Date(process.env.AI_EXPORT_REVIEW_CUTOFF)
    : new Date();
  if (Number.isNaN(reviewCutoff.getTime())) throw new Error('AI_EXPORT_REVIEW_CUTOFF must be a valid ISO-8601 timestamp');

  const version = new Date().toISOString().replace(/[:.]/g, '-');
  const outputRoot = process.env.AI_EXPORT_DIR
    ? path.resolve(process.env.AI_EXPORT_DIR)
    : path.resolve(process.cwd(), '..', 'ai', 'data', 'exports');
  const outputDirectory = path.join(outputRoot, version);

  const client = new Client({
    host: ENV.DB_HOST,
    port: ENV.DB_PORT,
    user: ENV.DB_USER,
    password: ENV.DB_PASSWORD,
    database: ENV.DB_NAME,
    ssl: false,
  });
  await client.connect();

  try {
    await client.query('BEGIN READ ONLY');
    const identity = await client.query('SELECT current_database() AS database, current_user AS username');
    if (identity.rows[0].database !== ENV.DB_NAME) throw new Error('Connected database does not match DB_NAME');
    const tracked = await client.query('SELECT 1 FROM schema_migrations WHERE filename=$1', [REQUIRED_MIGRATION]);
    if (tracked.rowCount !== 1) throw new Error(`Required migration is not tracked: ${REQUIRED_MIGRATION}`);

    const itemResult = await client.query(`
      SELECT id::text, category::text AS item_type, name AS title, city, province, address,
             latitude, longitude, price_from AS price, rating, review_count,
             summary, description, highlights, amenities, created_at
      FROM places WHERE status='APPROVED'
      UNION ALL
      SELECT id::text, 'tour', title, destination_city, destination_city, COALESCE(meeting_point,''),
             NULL, NULL, price_vnd, rating, review_count,
             summary, description, highlights, inclusions, created_at
      FROM tours WHERE status='APPROVED'
      UNION ALL
      SELECT id::text, 'ticket', title, arrival_city, arrival_city, departure_city,
             NULL, NULL, price, NULL, 0,
             operator, type::text, features, '[]'::jsonb, created_at
      FROM tickets WHERE status='ACTIVE'
      ORDER BY item_type, id
    `);

    const reviewResult = await client.query(`
      SELECT r.id::text, r.target_id::text AS item_id, r.target_type::text AS item_type,
             r.user_id::text, r.rating, r.rating_service, r.rating_price,
             r.rating_location, r.rating_experience, r.criteria_provided,
             r.comment, r.booking_id::text, r.verification_status,
             r.moderation_status, r.source, r.environment,
             (r.environment <> 'production') AS is_test,
             r.ai_usage_allowed, r.consent_policy_version,
             r.verified_at, r.created_at, r.updated_at
      FROM reviews r
      JOIN user_telemetry_consents current_consent ON current_consent.user_id=r.user_id
      WHERE r.ai_usage_allowed=TRUE
        AND current_consent.analytics_enabled=TRUE
        AND current_consent.personalization_enabled=TRUE
        AND r.source='CUSTOMER_SUBMISSION'
        AND r.moderation_status='PUBLISHED'
        AND r.environment=$1
        AND r.created_at <= $2
      ORDER BY r.created_at, r.id
    `, [eventEnvironment, reviewCutoff.toISOString()]);

    const eventResult = await client.query(`
      SELECT e.id::text, e.contract_version, e.user_id::text, e.session_id, e.request_id::text, e.item_id, e.item_type,
             e.event_type, e.source, e.environment, e.ui_surface, e.origin, e.context, e.occurred_at, e.expires_at
      FROM user_events e
      JOIN user_telemetry_consents current_consent ON current_consent.user_id=e.user_id
      WHERE e.personalization_allowed=TRUE AND current_consent.analytics_enabled=TRUE
        AND current_consent.personalization_enabled=TRUE
        AND e.environment=$1 AND e.expires_at > CURRENT_TIMESTAMP
        AND (
          e.request_id IS NULL
          OR EXISTS (
            SELECT 1 FROM recommendation_visible_impressions vi
            WHERE vi.request_id=e.request_id AND vi.user_id=e.user_id
              AND vi.session_id=e.session_id AND vi.item_id=e.item_id
              AND vi.item_type=e.item_type AND vi.personalization_allowed=TRUE
              AND vi.environment=$1 AND vi.expires_at > CURRENT_TIMESTAMP
          )
          OR (e.origin='SERVER' AND e.item_type='booking' AND EXISTS (
            SELECT 1 FROM bookings b
            WHERE b.id::text=e.item_id AND b.recommendation_request_id=e.request_id
          ))
        )
      ORDER BY e.occurred_at, e.id
    `, [eventEnvironment]);

    const requestResult = await client.query(`
      SELECT r.request_id::text, r.user_id::text, r.session_id, r.ui_surface, r.filters, r.explicit_preferences,
             r.algorithm_version, r.policy_version, r.model_version, r.config_version, r.environment,
             r.experiment_key, r.experiment_variant, r.assignment_probability, r.created_at, r.expires_at
      FROM recommendation_requests r
      JOIN user_telemetry_consents current_consent ON current_consent.user_id=r.user_id
      WHERE r.analytics_consent=TRUE AND r.personalization_consent=TRUE
        AND current_consent.analytics_enabled=TRUE AND current_consent.personalization_enabled=TRUE
        AND r.environment=$1 AND r.expires_at > CURRENT_TIMESTAMP
      ORDER BY r.created_at, r.request_id
    `, [eventEnvironment]);

    const candidateResult = await client.query(`
      SELECT c.id::text, c.request_id::text, c.item_id, c.item_type, c.eligible,
             c.eligibility_code, c.returned, c.rank_position, c.score, c.score_breakdown,
             c.reason_codes, c.policy_version, c.model_version, c.created_at
      FROM recommendation_candidates c
      JOIN recommendation_requests r ON r.request_id=c.request_id
      JOIN user_telemetry_consents current_consent ON current_consent.user_id=r.user_id
      WHERE r.analytics_consent=TRUE AND r.personalization_consent=TRUE
        AND current_consent.analytics_enabled=TRUE AND current_consent.personalization_enabled=TRUE
        AND r.environment=$1 AND r.expires_at > CURRENT_TIMESTAMP
      ORDER BY c.request_id, c.rank_position NULLS LAST, c.id
    `, [eventEnvironment]);

    const impressionResult = await client.query(`
      SELECT vi.id::text, vi.client_ack_id::text, vi.request_id::text,
             vi.user_id::text, vi.session_id, vi.item_id, vi.item_type,
             c.rank_position, c.score, c.score_breakdown, c.reason_codes,
             c.policy_version, c.model_version, r.algorithm_version, r.config_version,
             r.ui_surface, vi.visibility_rule_version, vi.visible_ratio, vi.dwell_ms,
             vi.visible_at, vi.acknowledged_at, vi.environment, vi.expires_at
      FROM recommendation_visible_impressions vi
      JOIN recommendation_requests r ON r.request_id=vi.request_id
      JOIN recommendation_candidates c ON c.id=vi.candidate_id
      JOIN user_telemetry_consents current_consent ON current_consent.user_id=r.user_id
      WHERE vi.personalization_allowed=TRUE AND r.personalization_consent=TRUE
        AND current_consent.analytics_enabled=TRUE AND current_consent.personalization_enabled=TRUE
        AND vi.environment=$1 AND r.environment=$1
        AND vi.expires_at > CURRENT_TIMESTAMP AND r.expires_at > CURRENT_TIMESTAMP
      ORDER BY vi.visible_at, vi.request_id, c.rank_position
    `, [eventEnvironment]);

    const blogResult = await client.query(`
      SELECT id::text, place_id::text AS item_id, title, excerpt, content,
             destination_name, tags, likes_count, created_at
      FROM blog_posts WHERE status='APPROVED' ORDER BY created_at, id
    `);

    await mkdir(outputDirectory, { recursive: true });
    const reviews = reviewResult.rows.map((row) => ({
      ...row,
      user_hash: pseudonym(row.user_id, salt),
      booking_hash: pseudonym(row.booking_id, salt),
      user_id: undefined,
      booking_id: undefined,
      comment: redact(row.comment),
    }));
    const events = eventResult.rows.map((row) => ({
      ...row,
      user_hash: pseudonym(row.user_id, salt),
      session_hash: pseudonym(row.session_id, salt),
      user_id: undefined,
      session_id: undefined,
      context: redact(JSON.stringify(row.context ?? {})),
    }));
    const requests = requestResult.rows.map((row) => ({
      ...row,
      user_hash: pseudonym(row.user_id, salt), session_hash: pseudonym(row.session_id, salt),
      user_id: undefined, session_id: undefined,
    }));
    const impressions = impressionResult.rows.map((row) => ({
      ...row,
      user_hash: pseudonym(row.user_id, salt),
      session_hash: pseudonym(row.session_id, salt),
      user_id: undefined,
      session_id: undefined,
    }));
    const blogs = blogResult.rows.map((row) => ({ ...row, excerpt: redact(row.excerpt), content: redact(row.content), source: 'TRAVELGO_BLOG' }));

    await writeCsv(outputDirectory, 'items.csv', itemResult.rows, [
      'id', 'item_type', 'title', 'city', 'province', 'address', 'latitude', 'longitude',
      'price', 'rating', 'review_count', 'summary', 'description', 'highlights', 'amenities', 'created_at',
    ]);
    await writeCsv(outputDirectory, 'reviews.csv', reviews, [
      'id', 'item_id', 'item_type', 'user_hash', 'rating', 'rating_service', 'rating_price',
      'rating_location', 'rating_experience', 'criteria_provided', 'comment', 'booking_hash',
      'verification_status', 'moderation_status', 'source', 'environment', 'is_test',
      'ai_usage_allowed', 'consent_policy_version', 'verified_at', 'created_at', 'updated_at',
    ]);
    await writeCsv(outputDirectory, 'events.csv', events, [
      'id', 'user_hash', 'session_hash', 'request_id', 'item_id', 'item_type', 'event_type',
      'contract_version', 'source', 'environment', 'ui_surface', 'origin', 'context', 'occurred_at', 'expires_at',
    ]);
    await writeCsv(outputDirectory, 'recommendation_requests.csv', requests, [
      'request_id', 'user_hash', 'session_hash', 'ui_surface', 'filters', 'explicit_preferences',
      'algorithm_version', 'policy_version', 'model_version', 'config_version', 'environment',
      'experiment_key', 'experiment_variant', 'assignment_probability', 'created_at', 'expires_at',
    ]);
    await writeCsv(outputDirectory, 'recommendation_candidates.csv', candidateResult.rows, [
      'id', 'request_id', 'item_id', 'item_type', 'eligible', 'eligibility_code', 'returned',
      'rank_position', 'score', 'score_breakdown', 'reason_codes', 'policy_version', 'model_version', 'created_at',
    ]);
    await writeCsv(outputDirectory, 'impressions.csv', impressions, [
      'id', 'client_ack_id', 'request_id', 'user_hash', 'session_hash', 'item_id', 'item_type',
      'rank_position', 'score', 'score_breakdown', 'reason_codes', 'policy_version', 'model_version',
      'algorithm_version', 'config_version', 'ui_surface', 'visibility_rule_version', 'visible_ratio',
      'dwell_ms', 'visible_at', 'acknowledged_at', 'environment', 'expires_at',
    ]);
    await writeCsv(outputDirectory, 'blog_mentions.csv', blogs, [
      'id', 'item_id', 'title', 'excerpt', 'content', 'destination_name', 'tags', 'likes_count', 'source', 'created_at',
    ]);

    const manifest = {
      datasetVersion: version,
      createdAt: new Date().toISOString(),
      sourceDatabase: ENV.DB_NAME,
      sourceHost: ENV.DB_HOST,
      schemaMigration: REQUIRED_MIGRATION,
      containsDirectIdentifiers: false,
      pseudonymization: 'HMAC-SHA256 with an external, non-exported salt',
      googleMapsContentIncluded: false,
      approvedFirstPartyContentOnly: true,
      eventsConsentFiltered: true,
      recommendationConsentFiltered: true,
      recommendationProvenanceRequired: true,
      functionalFavoritesExcluded: true,
      functionalFavoritesPolicy: 'Account data is not exported directly; only consented, retained state-change events are eligible.',
      reviewCutoff: reviewCutoff.toISOString(),
      reviewConsentFiltered: true,
      reviewModerationFiltered: true,
      reviewLegacyExcluded: true,
      reviewBookingIdentifiersPseudonymized: true,
      reviewPolicy: 'Only consented CUSTOMER_SUBMISSION rows that are PUBLISHED, environment-matched and at/before cutoff are exported; verification status remains explicit.',
      legacyRecommendationImpressionsExcluded: true,
      unseenCatalogItemsUsedAsNegative: false,
      eventEnvironment,
      eventRetentionDays: 90,
      rowCounts: {
        items: itemResult.rowCount,
        reviews: reviewResult.rowCount,
        events: eventResult.rowCount,
        recommendationRequests: requestResult.rowCount,
        recommendationCandidates: candidateResult.rowCount,
        visibleImpressions: impressionResult.rowCount,
        blogMentions: blogResult.rowCount,
      },
    };
    await writeFile(path.join(outputDirectory, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
    await client.query('COMMIT');
    console.log(JSON.stringify({ result: 'PASS', outputDirectory, ...manifest }, null, 2));
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }
}

run().catch((error) => {
  console.error('AI dataset export failed:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
