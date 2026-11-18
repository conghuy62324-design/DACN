-- Refuses rollback while linked knowledge remains; review/cleanup exact cohorts first.
BEGIN;
DO $$ BEGIN IF EXISTS(SELECT 1 FROM verified_travel_knowledge WHERE source_type='EXTERNAL_REVIEWED' OR topic='cost' OR provenance->>'method'='WEB_SOURCE_REVIEW') THEN RAISE EXCEPTION 'WEB_KNOWLEDGE_MUST_BE_REVIEWED_BEFORE_ROLLBACK'; END IF; END $$;
DROP TABLE travel_web_candidates;
DROP TABLE travel_web_jobs;
DROP TABLE travel_web_sources;
ALTER TABLE verified_travel_knowledge DROP CONSTRAINT verified_travel_knowledge_topic_check;
ALTER TABLE verified_travel_knowledge ADD CONSTRAINT verified_travel_knowledge_topic_check CHECK(topic IN ('overview','experience','culture','family','visit','preparation','hours','rules'));
ALTER TABLE verified_travel_knowledge DROP CONSTRAINT verified_travel_knowledge_source_type_check;
ALTER TABLE verified_travel_knowledge ADD CONSTRAINT verified_travel_knowledge_source_type_check CHECK(source_type IN ('INTERNAL_CATALOG','OFFICIAL','PARTNER_VERIFIED'));
COMMIT;
