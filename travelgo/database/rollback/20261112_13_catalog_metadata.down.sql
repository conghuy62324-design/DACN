-- Dedicated staging only. Removes classification/provenance; export metadata before manual rollback.
DROP INDEX IF EXISTS idx_places_catalog_metadata;
DROP INDEX IF EXISTS idx_places_approved_at;
ALTER TABLE places DROP COLUMN IF EXISTS approved_at;
ALTER TABLE places DROP COLUMN IF EXISTS catalog_metadata;
