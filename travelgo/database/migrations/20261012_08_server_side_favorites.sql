-- HuGo Intelligence M1 Task 4: account-owned, server-side Favorite source of truth.
-- Functional favorites live for the account lifetime. AI/analytics usage is
-- represented separately by consent-aware, retained user_events.
BEGIN;

CREATE TABLE IF NOT EXISTS user_favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    place_id UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT user_favorites_user_place_unique UNIQUE (user_id, place_id)
);

CREATE INDEX IF NOT EXISTS idx_user_favorites_user_created
  ON user_favorites(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_favorites_place
  ON user_favorites(place_id);

COMMIT;
