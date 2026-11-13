-- Additive catalog provenance/classification. Apply only to the approved staging in this task.
ALTER TABLE places ADD COLUMN IF NOT EXISTS catalog_metadata JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE places ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
-- Legacy records retain NULL: updated_at and created_at are not approval timestamps.
CREATE INDEX IF NOT EXISTS idx_places_approved_at ON places(approved_at DESC) WHERE status='APPROVED';
CREATE INDEX IF NOT EXISTS idx_places_catalog_metadata ON places USING GIN(catalog_metadata);
