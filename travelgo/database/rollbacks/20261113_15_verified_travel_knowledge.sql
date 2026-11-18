-- Export this table before rollback if it contains reviewed content. Never cascade to baseline tables.
BEGIN;
DROP TABLE verified_travel_knowledge;
DELETE FROM schema_migrations WHERE filename='20261113_15_verified_travel_knowledge.sql';
COMMIT;
