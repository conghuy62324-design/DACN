-- HuGo Intelligence M1 Task 2: consent-aware, idempotent behavior telemetry.
-- Additive/compatible migration. Existing event rows are retained as LEGACY rows.
BEGIN;

CREATE TABLE IF NOT EXISTS user_telemetry_consents (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    analytics_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    personalization_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    policy_version VARCHAR(20) NOT NULL DEFAULT '1.0',
    consented_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT user_telemetry_consents_personalization_requires_analytics
      CHECK (NOT personalization_enabled OR analytics_enabled)
);

ALTER TABLE user_events
  ADD COLUMN IF NOT EXISTS contract_version VARCHAR(10) NOT NULL DEFAULT '1.0',
  ADD COLUMN IF NOT EXISTS client_event_id UUID,
  ADD COLUMN IF NOT EXISTS environment VARCHAR(20) NOT NULL DEFAULT 'development',
  ADD COLUMN IF NOT EXISTS ui_surface VARCHAR(60) NOT NULL DEFAULT 'legacy',
  ADD COLUMN IF NOT EXISTS origin VARCHAR(20) NOT NULL DEFAULT 'LEGACY',
  ADD COLUMN IF NOT EXISTS personalization_allowed BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;

-- Migration 04 deliberately had a narrower list. Extend it without changing rows.
ALTER TABLE user_events DROP CONSTRAINT IF EXISTS user_events_item_type_check;
ALTER TABLE user_events ADD CONSTRAINT user_events_item_type_check CHECK (
  item_type IN ('place','hotel','restaurant','tour','ticket','blog','booking','trip')
);

ALTER TABLE user_events ADD CONSTRAINT user_events_contract_version_check
  CHECK (contract_version = '1.0');
ALTER TABLE user_events ADD CONSTRAINT user_events_environment_check
  CHECK (environment IN ('production','development','test'));
ALTER TABLE user_events ADD CONSTRAINT user_events_origin_check
  CHECK (origin IN ('CLIENT','SERVER','LEGACY'));
ALTER TABLE user_events ADD CONSTRAINT user_events_context_size_check
  CHECK (octet_length(context::text) <= 2048);
ALTER TABLE user_events ADD CONSTRAINT user_events_client_identity_check
  CHECK (origin <> 'CLIENT' OR (client_event_id IS NOT NULL AND user_id IS NOT NULL));
ALTER TABLE user_events ADD CONSTRAINT user_events_retention_check
  CHECK (origin = 'LEGACY' OR expires_at IS NOT NULL);

CREATE UNIQUE INDEX IF NOT EXISTS uq_user_events_client_event_id
  ON user_events(client_event_id) WHERE client_event_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_events_expiry
  ON user_events(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_events_training_eligibility
  ON user_events(personalization_allowed, occurred_at DESC)
  WHERE personalization_allowed = TRUE;
CREATE INDEX IF NOT EXISTS idx_user_telemetry_consents_updated
  ON user_telemetry_consents(updated_at DESC);

COMMIT;
