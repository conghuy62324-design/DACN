BEGIN;

-- Null preserves unversioned legacy rows. No backfill, repricing or fake activities.
ALTER TABLE trip_sessions ADD COLUMN IF NOT EXISTS planner_metadata JSONB;
ALTER TABLE trip_sessions ADD CONSTRAINT trip_sessions_planner_metadata_check
    CHECK (planner_metadata IS NULL OR
           (jsonb_typeof(planner_metadata) = 'object' AND octet_length(planner_metadata::text) <= 32768));

COMMIT;
