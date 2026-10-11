import { createHmac } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Client } from 'pg';
import { ENV } from '../config/env.js';
import { assertIsolatedTestDatabase } from '../utils/testDatabaseGuard.js';

type CsvValue = string | number | boolean | Date | null | undefined | object;
type CsvRow = Record<string, CsvValue>;

const REQUIRED_MIGRATION = '20261011_04_hugo_intelligence_foundation.sql';
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
             r.rating_location, r.rating_experience, r.comment, r.created_at,
             EXISTS (
               SELECT 1 FROM bookings b
               WHERE b.user_id=r.user_id AND b.booking_status='COMPLETED'
                 AND ((r.target_type IN ('place','hotel','restaurant') AND b.place_id::text=r.target_id::text)
                   OR (r.target_type='tour' AND b.tour_id::text=r.target_id::text))
             ) AS verified_booking
      FROM reviews r
      ORDER BY r.created_at, r.id
    `);

    const eventResult = await client.query(`
      SELECT id::text, user_id::text, session_id, request_id::text, item_id, item_type,
             event_type, source, context, occurred_at
      FROM user_events ORDER BY occurred_at, id
    `);

    const impressionResult = await client.query(`
      SELECT id::text, request_id::text, user_id::text, session_id, item_id, item_type,
             rank_position, score, score_breakdown, reason, model_version, context, created_at
      FROM recommendation_impressions ORDER BY created_at, rank_position
    `);

    const blogResult = await client.query(`
      SELECT id::text, place_id::text AS item_id, title, excerpt, content,
             destination_name, tags, likes_count, created_at
      FROM blog_posts WHERE status='APPROVED' ORDER BY created_at, id
    `);

    await mkdir(outputDirectory, { recursive: true });
    const reviews = reviewResult.rows.map((row) => ({
      ...row,
      user_hash: pseudonym(row.user_id, salt),
      user_id: undefined,
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
    const impressions = impressionResult.rows.map((row) => ({
      ...row,
      user_hash: pseudonym(row.user_id, salt),
      session_hash: pseudonym(row.session_id, salt),
      user_id: undefined,
      session_id: undefined,
      reason: redact(row.reason),
      context: redact(JSON.stringify(row.context ?? {})),
    }));
    const blogs = blogResult.rows.map((row) => ({ ...row, excerpt: redact(row.excerpt), content: redact(row.content), source: 'TRAVELGO_BLOG' }));

    await writeCsv(outputDirectory, 'items.csv', itemResult.rows, [
      'id', 'item_type', 'title', 'city', 'province', 'address', 'latitude', 'longitude',
      'price', 'rating', 'review_count', 'summary', 'description', 'highlights', 'amenities', 'created_at',
    ]);
    await writeCsv(outputDirectory, 'reviews.csv', reviews, [
      'id', 'item_id', 'item_type', 'user_hash', 'rating', 'rating_service', 'rating_price',
      'rating_location', 'rating_experience', 'comment', 'verified_booking', 'created_at',
    ]);
    await writeCsv(outputDirectory, 'events.csv', events, [
      'id', 'user_hash', 'session_hash', 'request_id', 'item_id', 'item_type', 'event_type',
      'source', 'context', 'occurred_at',
    ]);
    await writeCsv(outputDirectory, 'impressions.csv', impressions, [
      'id', 'request_id', 'user_hash', 'session_hash', 'item_id', 'item_type', 'rank_position',
      'score', 'score_breakdown', 'reason', 'model_version', 'context', 'created_at',
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
      rowCounts: {
        items: itemResult.rowCount,
        reviews: reviewResult.rowCount,
        events: eventResult.rowCount,
        impressions: impressionResult.rowCount,
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
