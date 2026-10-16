-- HuGo Intelligence M1 Task 3 follow-up: keep booking attribution compatible
-- with privacy deletion. When a recommendation request is deleted, its FK is
-- SET NULL while the public source item may remain as non-training provenance.
BEGIN;

ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_recommendation_attribution_check;
ALTER TABLE bookings ADD CONSTRAINT bookings_recommendation_attribution_check CHECK (
  (recommendation_item_id IS NULL AND recommendation_item_type IS NULL AND recommendation_request_id IS NULL)
  OR
  (recommendation_item_id IS NOT NULL
    AND recommendation_item_type IN ('place','hotel','restaurant','tour','ticket'))
);

COMMIT;
