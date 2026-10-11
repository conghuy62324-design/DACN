-- HuGo Intelligence foundation: first-party behavior, recommendation impressions,
-- and model lifecycle metadata. Additive only; no existing rows are changed.
BEGIN;

CREATE TABLE IF NOT EXISTS user_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    session_id VARCHAR(120) NOT NULL,
    request_id UUID,
    item_id VARCHAR(120) NOT NULL,
    item_type VARCHAR(30) NOT NULL CHECK (item_type IN ('place','hotel','restaurant','tour','ticket','blog')),
    event_type VARCHAR(40) NOT NULL CHECK (event_type IN (
        'SEARCH','VIEW','CLICK','FAVORITE','UNFAVORITE','ADD_TO_TRIP','REMOVE_FROM_TRIP',
        'BOOKING_CREATED','BOOKING_CONFIRMED','BOOKING_COMPLETED','BOOKING_CANCELLED',
        'REVIEW_CREATED','MAP_OPENED','ROUTE_VIEWED'
    )),
    source VARCHAR(50) NOT NULL DEFAULT 'organic',
    context JSONB NOT NULL DEFAULT '{}'::jsonb,
    occurred_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (char_length(session_id) BETWEEN 8 AND 120),
    CHECK (char_length(item_id) BETWEEN 1 AND 120),
    CHECK (jsonb_typeof(context) = 'object')
);
CREATE INDEX IF NOT EXISTS idx_user_events_user_time ON user_events(user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_events_session_time ON user_events(session_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_events_item_time ON user_events(item_type, item_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_events_event_time ON user_events(event_type, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_events_request ON user_events(request_id) WHERE request_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS recommendation_impressions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    session_id VARCHAR(120) NOT NULL,
    item_id VARCHAR(120) NOT NULL,
    item_type VARCHAR(30) NOT NULL CHECK (item_type IN ('place','hotel','restaurant','tour','ticket','blog')),
    rank_position INTEGER NOT NULL CHECK (rank_position > 0),
    score NUMERIC(6,5) NOT NULL CHECK (score BETWEEN 0 AND 1),
    score_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
    reason TEXT,
    model_version VARCHAR(100) NOT NULL,
    context JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (request_id, item_type, item_id),
    CHECK (char_length(session_id) BETWEEN 8 AND 120),
    CHECK (jsonb_typeof(score_breakdown) = 'object'),
    CHECK (jsonb_typeof(context) = 'object')
);
CREATE INDEX IF NOT EXISTS idx_recommendation_impressions_user_time ON recommendation_impressions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_recommendation_impressions_session_time ON recommendation_impressions(session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_recommendation_impressions_model_time ON recommendation_impressions(model_version, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_recommendation_impressions_item ON recommendation_impressions(item_type, item_id);

CREATE TABLE IF NOT EXISTS ai_model_registry (
    model_version VARCHAR(100) PRIMARY KEY,
    model_type VARCHAR(40) NOT NULL CHECK (model_type IN ('REVIEW_INTELLIGENCE','QUALITY_SCORER','RECOMMENDER','ITINERARY')),
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','SHADOW','ACTIVE','RETIRED')),
    artifact_checksum CHAR(64) NOT NULL,
    dataset_version VARCHAR(100) NOT NULL,
    metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
    feature_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    activated_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (jsonb_typeof(metrics) = 'object'),
    CHECK (jsonb_typeof(feature_config) = 'object')
);
CREATE INDEX IF NOT EXISTS idx_ai_model_registry_type_status ON ai_model_registry(model_type, status);

COMMIT;
