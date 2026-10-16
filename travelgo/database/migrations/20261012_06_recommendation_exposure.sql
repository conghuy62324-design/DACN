-- HuGo Intelligence M1 Task 3: reproducible recommendation requests,
-- ranked candidates and client-acknowledged visible impressions.
-- Additive only. The migration-04 recommendation_impressions table remains
-- untouched and is treated as LEGACY because it did not distinguish a
-- returned candidate from a genuinely visible exposure.
BEGIN;

CREATE TABLE IF NOT EXISTS recommendation_requests (
    request_id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_id VARCHAR(120) NOT NULL,
    ui_surface VARCHAR(60) NOT NULL,
    filters JSONB NOT NULL DEFAULT '{}'::jsonb,
    explicit_preferences JSONB NOT NULL DEFAULT '[]'::jsonb,
    algorithm_version VARCHAR(100) NOT NULL,
    policy_version VARCHAR(100) NOT NULL,
    model_version VARCHAR(100) NOT NULL,
    config_version VARCHAR(100) NOT NULL,
    environment VARCHAR(20) NOT NULL,
    analytics_consent BOOLEAN NOT NULL,
    personalization_consent BOOLEAN NOT NULL,
    experiment_key VARCHAR(100),
    experiment_variant VARCHAR(60) NOT NULL DEFAULT 'CONTROL',
    assignment_probability NUMERIC(6,5),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT recommendation_requests_session_check CHECK (char_length(session_id) BETWEEN 8 AND 120),
    CONSTRAINT recommendation_requests_environment_check CHECK (environment IN ('production','development','test')),
    CONSTRAINT recommendation_requests_filters_check CHECK (jsonb_typeof(filters) = 'object' AND octet_length(filters::text) <= 2048),
    CONSTRAINT recommendation_requests_preferences_check CHECK (jsonb_typeof(explicit_preferences) = 'array' AND octet_length(explicit_preferences::text) <= 1024),
    CONSTRAINT recommendation_requests_consent_check CHECK (NOT personalization_consent OR analytics_consent),
    CONSTRAINT recommendation_requests_experiment_check CHECK (
      (experiment_key IS NULL AND experiment_variant = 'CONTROL' AND assignment_probability IS NULL)
      OR (experiment_key IS NOT NULL AND assignment_probability BETWEEN 0 AND 1)
    )
);

CREATE INDEX IF NOT EXISTS idx_recommendation_requests_user_time
  ON recommendation_requests(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_recommendation_requests_session_time
  ON recommendation_requests(session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_recommendation_requests_retention
  ON recommendation_requests(expires_at);
CREATE INDEX IF NOT EXISTS idx_recommendation_requests_export
  ON recommendation_requests(environment, personalization_consent, created_at DESC)
  WHERE personalization_consent = TRUE;

CREATE TABLE IF NOT EXISTS recommendation_candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES recommendation_requests(request_id) ON DELETE CASCADE,
    item_id VARCHAR(120) NOT NULL,
    item_type VARCHAR(30) NOT NULL CHECK (item_type IN ('place','hotel','restaurant','tour','ticket','blog')),
    eligible BOOLEAN NOT NULL,
    eligibility_code VARCHAR(80) NOT NULL,
    returned BOOLEAN NOT NULL DEFAULT TRUE,
    rank_position INTEGER,
    score NUMERIC(8,6),
    score_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
    reason_codes JSONB NOT NULL DEFAULT '[]'::jsonb,
    policy_version VARCHAR(100) NOT NULL,
    model_version VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT recommendation_candidates_rank_check CHECK (
      (returned = FALSE AND rank_position IS NULL)
      OR (returned = TRUE AND eligible = TRUE AND rank_position > 0)
    ),
    CONSTRAINT recommendation_candidates_score_check CHECK (score IS NULL OR score BETWEEN 0 AND 1),
    CONSTRAINT recommendation_candidates_breakdown_check CHECK (jsonb_typeof(score_breakdown) = 'object' AND octet_length(score_breakdown::text) <= 2048),
    CONSTRAINT recommendation_candidates_reasons_check CHECK (jsonb_typeof(reason_codes) = 'array' AND octet_length(reason_codes::text) <= 1024),
    UNIQUE (request_id, item_type, item_id),
    UNIQUE (request_id, rank_position)
);

CREATE INDEX IF NOT EXISTS idx_recommendation_candidates_request_rank
  ON recommendation_candidates(request_id, rank_position);
CREATE INDEX IF NOT EXISTS idx_recommendation_candidates_item
  ON recommendation_candidates(item_type, item_id);

CREATE TABLE IF NOT EXISTS recommendation_visible_impressions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_ack_id UUID NOT NULL UNIQUE,
    request_id UUID NOT NULL REFERENCES recommendation_requests(request_id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL REFERENCES recommendation_candidates(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_id VARCHAR(120) NOT NULL,
    item_id VARCHAR(120) NOT NULL,
    item_type VARCHAR(30) NOT NULL CHECK (item_type IN ('place','hotel','restaurant','tour','ticket','blog')),
    ui_surface VARCHAR(60) NOT NULL,
    visibility_rule_version VARCHAR(80) NOT NULL,
    visible_ratio NUMERIC(4,3) NOT NULL,
    dwell_ms INTEGER NOT NULL,
    visible_at TIMESTAMP WITH TIME ZONE NOT NULL,
    acknowledged_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    environment VARCHAR(20) NOT NULL,
    personalization_allowed BOOLEAN NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT recommendation_visible_session_check CHECK (char_length(session_id) BETWEEN 8 AND 120),
    CONSTRAINT recommendation_visible_ratio_check CHECK (visible_ratio >= 0.5 AND visible_ratio <= 1),
    CONSTRAINT recommendation_visible_dwell_check CHECK (dwell_ms >= 2000 AND dwell_ms <= 3600000),
    CONSTRAINT recommendation_visible_environment_check CHECK (environment IN ('production','development','test')),
    UNIQUE (request_id, item_type, item_id, visibility_rule_version)
);

CREATE INDEX IF NOT EXISTS idx_recommendation_visible_user_time
  ON recommendation_visible_impressions(user_id, visible_at DESC);
CREATE INDEX IF NOT EXISTS idx_recommendation_visible_request
  ON recommendation_visible_impressions(request_id, item_type, item_id);
CREATE INDEX IF NOT EXISTS idx_recommendation_visible_export
  ON recommendation_visible_impressions(environment, personalization_allowed, visible_at DESC)
  WHERE personalization_allowed = TRUE;
CREATE INDEX IF NOT EXISTS idx_recommendation_visible_retention
  ON recommendation_visible_impressions(expires_at);

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS recommendation_request_id UUID REFERENCES recommendation_requests(request_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS recommendation_item_id VARCHAR(120),
  ADD COLUMN IF NOT EXISTS recommendation_item_type VARCHAR(30);

ALTER TABLE bookings ADD CONSTRAINT bookings_recommendation_attribution_check CHECK (
  (recommendation_request_id IS NULL AND recommendation_item_id IS NULL AND recommendation_item_type IS NULL)
  OR
  (recommendation_request_id IS NOT NULL AND recommendation_item_id IS NOT NULL
    AND recommendation_item_type IN ('place','hotel','restaurant','tour','ticket'))
);
CREATE INDEX IF NOT EXISTS idx_bookings_recommendation_request
  ON bookings(recommendation_request_id) WHERE recommendation_request_id IS NOT NULL;

COMMIT;
