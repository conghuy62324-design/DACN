-- Additive review intelligence: reuse review_insight_jobs/review_insights, never copy raw comments.
BEGIN;
ALTER TABLE reviews ADD COLUMN ai_revision bigint NOT NULL DEFAULT 1 CHECK(ai_revision>0);
ALTER TABLE review_insight_jobs
 ADD COLUMN state text NOT NULL DEFAULT 'PENDING' CHECK(state IN ('PENDING','RUNNING','COMPLETED','FAILED')),
 ADD COLUMN claimed_revision bigint,
 ADD COLUMN lease_token uuid,
 ADD COLUMN lease_until timestamptz,
 ADD COLUMN heartbeat_at timestamptz,
 ADD COLUMN next_attempt_at timestamptz NOT NULL DEFAULT now(),
 ADD COLUMN last_success_at timestamptz;
CREATE INDEX review_job_due ON review_insight_jobs(state,next_attempt_at,lease_until);
CREATE INDEX review_source_revision ON reviews(target_id,ai_revision);
CREATE TABLE review_processing_events (
 review_id uuid NOT NULL,
 review_revision bigint NOT NULL CHECK(review_revision>0),
 event_kind text NOT NULL CHECK(event_kind IN ('CREATED','EDITED','MODERATION','CONSENT','ATTRIBUTION','DELETED','RECONCILE')),
 processing_version text NOT NULL DEFAULT 'REVIEW_SCOPED_V4',
 place_id uuid NOT NULL REFERENCES places(id) ON DELETE CASCADE,
 place_revision bigint NOT NULL,
 state text NOT NULL DEFAULT 'PENDING' CHECK(state IN ('PENDING','RUNNING','COMPLETED','FAILED')),
 created_at timestamptz NOT NULL DEFAULT now(),
 processed_at timestamptz,
 PRIMARY KEY(review_id,review_revision,event_kind,processing_version)
);
CREATE INDEX review_event_pending ON review_processing_events(place_id,state,place_revision);
CREATE TABLE review_worker_state (
 state_key text PRIMARY KEY,
 heartbeat_at timestamptz,
 last_success_at timestamptz,
 next_reconcile_at timestamptz NOT NULL DEFAULT now(),
 reconcile_cursor uuid,
 reconcile_token uuid,
 reconcile_until timestamptz,
 metrics jsonb NOT NULL DEFAULT '{}' CHECK(jsonb_typeof(metrics)='object'),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE FUNCTION review_ai_revision() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF TG_OP='INSERT' THEN SELECT coalesce(max(review_revision),0)+1 INTO NEW.ai_revision FROM review_processing_events WHERE review_id=NEW.id;
 ELSE NEW.ai_revision=OLD.ai_revision+1; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER review_ai_revision BEFORE INSERT OR UPDATE ON reviews FOR EACH ROW EXECUTE FUNCTION review_ai_revision();

CREATE OR REPLACE FUNCTION queue_place_review_insights(target text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF target ~* '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$' THEN
  INSERT INTO review_insight_jobs(place_id) SELECT id FROM places WHERE id=target::uuid
  ON CONFLICT(place_id) DO UPDATE SET revision=review_insight_jobs.revision+1,updated_at=now(),
   state='PENDING',attempts=0,last_error=NULL,next_attempt_at=now(),lease_token=NULL,lease_until=NULL;
  DELETE FROM review_insights WHERE place_id=target::uuid;
 END IF;
END $$;
REVOKE ALL ON FUNCTION queue_place_review_insights(text) FROM PUBLIC;
CREATE OR REPLACE FUNCTION review_insight_change() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE target text; rid uuid; rev bigint; kind text; place_rev bigint;
BEGIN
 IF TG_OP='DELETE' THEN target=OLD.target_id;rid=OLD.id;rev=OLD.ai_revision+1;kind='DELETED';
 ELSE target=NEW.target_id;rid=NEW.id;rev=NEW.ai_revision;
  kind=CASE WHEN TG_OP='INSERT' THEN 'CREATED'
   WHEN pg_trigger_depth()>1 THEN 'ATTRIBUTION'
   WHEN NEW.ai_usage_allowed IS DISTINCT FROM OLD.ai_usage_allowed THEN 'CONSENT'
   WHEN NEW.moderation_status IS DISTINCT FROM OLD.moderation_status THEN 'MODERATION' ELSE 'EDITED' END;
 END IF;
 IF TG_OP='UPDATE' AND OLD.target_id IS DISTINCT FROM NEW.target_id THEN PERFORM queue_place_review_insights(OLD.target_id); END IF;
 IF (TG_OP='DELETE' AND OLD.target_type IN ('place','hotel')) OR (TG_OP<>'DELETE' AND NEW.target_type IN ('place','hotel')) THEN
  PERFORM queue_place_review_insights(target);
  SELECT revision INTO place_rev FROM review_insight_jobs WHERE place_id=target::uuid;
  IF place_rev IS NOT NULL THEN
   INSERT INTO review_processing_events(review_id,review_revision,event_kind,place_id,place_revision)
    VALUES(rid,rev,kind,target::uuid,place_rev) ON CONFLICT DO NOTHING;
  END IF;
 END IF;
 RETURN NULL;
END $$;
CREATE FUNCTION review_attribution_changed() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 UPDATE reviews SET updated_at=now() WHERE id=COALESCE(NEW.review_id,OLD.review_id);
 RETURN NULL;
END $$;
CREATE TRIGGER review_attribution_changed AFTER INSERT OR UPDATE OR DELETE ON hotel_review_stays
 FOR EACH ROW EXECUTE FUNCTION review_attribution_changed();

-- Only this sanitized, publication/consent-filtered projection is granted to the worker.
CREATE FUNCTION review_ai_safe_text(raw text) RETURNS text LANGUAGE sql IMMUTABLE AS $$
 SELECT left(regexp_replace(regexp_replace(regexp_replace(coalesce(raw,''),
  '[[:alnum:]_.+%-]+@[[:alnum:].-]+\.[[:alpha:]]{2,}',' ','gi'),
  '(\+?[0-9][ .-]*){8,}',' ','g'),
  '(eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+|Bearer[[:space:]]+[^[:space:]]+)',' ','gi'),2000)
$$;
CREATE VIEW review_ai_targets WITH (security_barrier=true) AS
 SELECT p.id place_id,p.category,
  (p.status='APPROVED' AND (p.business_id IS NULL OR b.status='ACTIVE') AND
   (p.category<>'hotel' OR h.approved_content_version=h.content_version)) eligible,
  (coalesce(p.catalog_metadata->>'testOnly','false')='true' OR coalesce(p.catalog_metadata->>'source','')='DEMO') is_demo
 FROM places p LEFT JOIN businesses b ON b.id=p.business_id LEFT JOIN hotel_profiles h ON h.place_id=p.id;
CREATE VIEW review_ai_inputs WITH (security_barrier=true) AS
 SELECT r.id review_id,t.place_id,r.ai_revision,r.rating,r.verification_status,
  r.created_at,r.updated_at,t.category,t.is_demo,
  CASE WHEN r.verification_status='VERIFIED' AND b.booking_status='COMPLETED'
    AND s.check_out<=(now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
    AND r.booking_id=i.booking_id AND r.user_id=b.user_id AND i.place_id=t.place_id
    AND i.quote_snapshot->'room'->>'id'=i.room_type_id::text
    THEN i.room_type_id ELSE NULL END room_type_id,
  review_ai_safe_text(r.comment) comment
 FROM reviews r JOIN review_ai_targets t ON t.place_id::text=r.target_id AND t.eligible
 LEFT JOIN hotel_review_stays a ON a.review_id=r.id
 LEFT JOIN hotel_booking_items i ON i.id=a.booking_item_id
 LEFT JOIN hotel_booking_stays s ON s.booking_id=i.booking_id
 LEFT JOIN bookings b ON b.id=s.booking_id
 WHERE r.target_type IN ('place','hotel') AND r.moderation_status='PUBLISHED' AND r.ai_usage_allowed
 AND (r.consent_policy_version='REVIEW_INSIGHTS_V1' OR r.consent_policy_version='1.0' AND EXISTS
  (SELECT 1 FROM user_telemetry_consents c WHERE c.user_id=r.user_id AND c.analytics_enabled AND c.personalization_enabled));
REVOKE ALL ON review_processing_events,review_worker_state,review_ai_inputs,review_ai_targets FROM PUBLIC;
COMMENT ON TABLE review_processing_events IS 'Transactional review outbox, revision identity and tombstones only; no comment/customer/contact. Retain processed tombstones at most90days under bounded operator policy.';
COMMENT ON TABLE review_worker_state IS 'Persistent bounded daily reconcile cursor/lease and worker heartbeat; timestamps UTC.';
COMMIT;
