-- HuGo Intelligence M1 Task 5: booking-provenance and review data-quality contract.
-- Existing reviews remain functional, but are explicitly legacy/unverified and
-- ineligible for AI use until a new, consented customer submission is created.
BEGIN;

ALTER TABLE reviews
  ADD COLUMN IF NOT EXISTS booking_id UUID,
  ADD COLUMN IF NOT EXISTS verification_status VARCHAR(20) NOT NULL DEFAULT 'UNVERIFIED',
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS moderation_status VARCHAR(20) NOT NULL DEFAULT 'PUBLISHED',
  ADD COLUMN IF NOT EXISTS moderation_reason TEXT,
  ADD COLUMN IF NOT EXISTS moderated_by UUID,
  ADD COLUMN IF NOT EXISTS moderated_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS source VARCHAR(30) NOT NULL DEFAULT 'LEGACY',
  ADD COLUMN IF NOT EXISTS environment VARCHAR(20) NOT NULL DEFAULT 'development',
  ADD COLUMN IF NOT EXISTS criteria_provided JSONB NOT NULL DEFAULT
    '{"service":false,"price":false,"location":false,"experience":false}'::jsonb,
  ADD COLUMN IF NOT EXISTS ai_usage_allowed BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS consent_policy_version VARCHAR(20),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE reviews ALTER COLUMN rating_service DROP DEFAULT;
ALTER TABLE reviews ALTER COLUMN rating_price DROP DEFAULT;
ALTER TABLE reviews ALTER COLUMN rating_location DROP DEFAULT;
ALTER TABLE reviews ALTER COLUMN rating_experience DROP DEFAULT;

ALTER TABLE reviews
  ADD CONSTRAINT reviews_booking_id_fkey
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE RESTRICT,
  ADD CONSTRAINT reviews_moderated_by_fkey
    FOREIGN KEY (moderated_by) REFERENCES users(id) ON DELETE SET NULL,
  ADD CONSTRAINT reviews_verification_status_check
    CHECK (verification_status IN ('VERIFIED', 'UNVERIFIED')),
  ADD CONSTRAINT reviews_verification_provenance_check
    CHECK (
      (verification_status = 'VERIFIED' AND booking_id IS NOT NULL AND verified_at IS NOT NULL)
      OR (verification_status = 'UNVERIFIED' AND verified_at IS NULL)
    ),
  ADD CONSTRAINT reviews_moderation_status_check
    CHECK (moderation_status IN ('PENDING', 'PUBLISHED', 'HIDDEN', 'REJECTED')),
  ADD CONSTRAINT reviews_source_check
    CHECK (source IN ('LEGACY', 'CUSTOMER_SUBMISSION')),
  ADD CONSTRAINT reviews_environment_check
    CHECK (environment IN ('production', 'development', 'test')),
  ADD CONSTRAINT reviews_comment_length_check
    CHECK (char_length(btrim(comment)) BETWEEN 10 AND 2000) NOT VALID,
  ADD CONSTRAINT reviews_rating_service_check
    CHECK (rating_service IS NULL OR (rating_service >= 1 AND rating_service <= 5)),
  ADD CONSTRAINT reviews_rating_price_check
    CHECK (rating_price IS NULL OR (rating_price >= 1 AND rating_price <= 5)),
  ADD CONSTRAINT reviews_rating_location_check
    CHECK (rating_location IS NULL OR (rating_location >= 1 AND rating_location <= 5)),
  ADD CONSTRAINT reviews_rating_experience_check
    CHECK (rating_experience IS NULL OR (rating_experience >= 1 AND rating_experience <= 5));

ALTER TABLE reviews ADD CONSTRAINT reviews_criteria_provided_check CHECK (
  jsonb_typeof(criteria_provided) = 'object'
  AND criteria_provided ?& ARRAY['service','price','location','experience']
  AND (criteria_provided - 'service' - 'price' - 'location' - 'experience') = '{}'::jsonb
  AND jsonb_typeof(criteria_provided->'service') = 'boolean'
  AND jsonb_typeof(criteria_provided->'price') = 'boolean'
  AND jsonb_typeof(criteria_provided->'location') = 'boolean'
  AND jsonb_typeof(criteria_provided->'experience') = 'boolean'
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_reviews_booking
  ON reviews(booking_id) WHERE booking_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reviews_target_moderation_created
  ON reviews(target_type, target_id, moderation_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_user_created
  ON reviews(user_id, created_at DESC) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reviews_ai_export
  ON reviews(environment, moderation_status, verification_status, created_at)
  WHERE ai_usage_allowed = true;

COMMIT;
