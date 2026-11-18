-- Reuse reviews; analysis contains only aggregate evidence, never reviewer profiles/transcripts.
BEGIN;
CREATE TABLE review_insight_jobs (
 place_id UUID PRIMARY KEY REFERENCES places(id) ON DELETE CASCADE,
 revision BIGINT NOT NULL DEFAULT 1,
 processed_revision BIGINT NOT NULL DEFAULT 0,
 attempts INTEGER NOT NULL DEFAULT 0,
 last_error VARCHAR(80),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE review_insights (
 place_id UUID PRIMARY KEY REFERENCES places(id) ON DELETE CASCADE,
 source_revision BIGINT NOT NULL,
 method VARCHAR(80) NOT NULL,
 status VARCHAR(20) NOT NULL CHECK(status IN ('READY','INSUFFICIENT')),
 data JSONB NOT NULL CHECK(jsonb_typeof(data)='object'),
 computed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE review_reports (
 review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
 reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 reason VARCHAR(30) NOT NULL CHECK(reason IN ('SPAM','ABUSE','PRIVACY','MISLEADING')),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 PRIMARY KEY(review_id,reporter_id)
);
CREATE TABLE customer_memory_settings (
 customer_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
 enabled BOOLEAN NOT NULL DEFAULT false,
 allow_new BOOLEAN NOT NULL DEFAULT false,
 policy_version VARCHAR(32),
 consented_at TIMESTAMPTZ,
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 CHECK(NOT enabled OR (policy_version='TRAVELGO_MEMORY_V1' AND consented_at IS NOT NULL))
);
CREATE TABLE customer_travel_preferences (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 type VARCHAR(30) NOT NULL,
 value JSONB NOT NULL,
 source VARCHAR(20) NOT NULL CHECK(source IN ('DECLARED','CONFIRMED')),
 status VARCHAR(10) NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE','INACTIVE')),
 scope VARCHAR(30) NOT NULL DEFAULT 'TRAVEL_ADVICE' CHECK(scope='TRAVEL_ADVICE'),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(customer_id,type,value),
 CHECK((type='quality' AND value IN ('"quiet"'::jsonb,'"clean"'::jsonb,'"value"'::jsonb))
 OR(type='interest' AND value IN ('"nature"'::jsonb,'"culture"'::jsonb,'"food"'::jsonb,'"relax"'::jsonb))
 OR(type='transportation' AND value IN ('"car"'::jsonb,'"motorbike"'::jsonb))
 OR(type='pace' AND value IN ('"relaxed"'::jsonb,'"balanced"'::jsonb,'"packed"'::jsonb)))
);
CREATE INDEX idx_customer_preferences_active ON customer_travel_preferences(customer_id,status);
CREATE FUNCTION queue_place_review_insights(target TEXT) RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
 IF target ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
  INSERT INTO review_insight_jobs(place_id) SELECT id FROM places WHERE id=target::uuid
  ON CONFLICT(place_id) DO UPDATE SET revision=review_insight_jobs.revision+1,updated_at=now();
 END IF;
END; $$;
CREATE FUNCTION review_insight_change() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP IN ('UPDATE','DELETE') AND OLD.target_type='place' THEN PERFORM queue_place_review_insights(OLD.target_id); END IF;
 IF TG_OP IN ('INSERT','UPDATE') AND NEW.target_type='place' AND (TG_OP='INSERT' OR NEW.target_id IS DISTINCT FROM OLD.target_id) THEN PERFORM queue_place_review_insights(NEW.target_id); END IF;
 RETURN NULL;
END; $$;
CREATE TRIGGER trg_review_insight_change AFTER INSERT OR UPDATE OR DELETE ON reviews FOR EACH ROW EXECUTE FUNCTION review_insight_change();
INSERT INTO review_insight_jobs(place_id) SELECT id FROM places WHERE id::text IN (SELECT target_id FROM reviews WHERE target_type='place');
COMMIT;
