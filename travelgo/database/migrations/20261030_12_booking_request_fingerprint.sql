BEGIN;

-- Nullable by design. Historical requests cannot be reconstructed (notably
-- recommendationSessionId and quantity pricing mode). Never backfill/reprice.
ALTER TABLE bookings ADD COLUMN request_fingerprint VARCHAR(64);
ALTER TABLE bookings ADD CONSTRAINT bookings_request_fingerprint_check
  CHECK (request_fingerprint IS NULL OR request_fingerprint ~ '^[0-9a-f]{64}$');

COMMIT;
