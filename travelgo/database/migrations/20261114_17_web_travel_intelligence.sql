-- Add tracking only. Approved facts remain in verified_travel_knowledge. No seed/source approvals.
BEGIN;
ALTER TABLE verified_travel_knowledge DROP CONSTRAINT verified_travel_knowledge_topic_check;
ALTER TABLE verified_travel_knowledge ADD CONSTRAINT verified_travel_knowledge_topic_check CHECK(topic IN ('overview','experience','culture','family','visit','preparation','hours','rules','cost'));
ALTER TABLE verified_travel_knowledge DROP CONSTRAINT verified_travel_knowledge_source_type_check;
ALTER TABLE verified_travel_knowledge ADD CONSTRAINT verified_travel_knowledge_source_type_check CHECK(source_type IN ('INTERNAL_CATALOG','OFFICIAL','PARTNER_VERIFIED','EXTERNAL_REVIEWED'));
CREATE TABLE travel_web_sources (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), domain varchar(253) UNIQUE NOT NULL,
 config jsonb NOT NULL CHECK(octet_length(config::text)<=180000),
 permission varchar(20) NOT NULL DEFAULT 'UNKNOWN' CHECK(permission IN ('UNKNOWN','ALLOWED','DENIED')),
 review_status varchar(20) NOT NULL DEFAULT 'UNREVIEWED' CHECK(review_status IN ('UNREVIEWED','APPROVED','REVOKED')),
 enabled boolean NOT NULL DEFAULT false, version integer NOT NULL DEFAULT 1 CHECK(version>0),
 history jsonb NOT NULL DEFAULT '[]', last_success timestamptz,last_attempt timestamptz,last_error varchar(80),
 reviewed_by uuid REFERENCES users(id), updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK(NOT enabled OR (permission='ALLOWED' AND review_status='APPROVED' AND reviewed_by IS NOT NULL))
);
CREATE TABLE travel_web_jobs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), source_id uuid NOT NULL REFERENCES travel_web_sources(id) ON DELETE CASCADE,
 url varchar(600) NOT NULL, kind varchar(20) NOT NULL CHECK(kind IN ('DISCOVER','ARTICLE')),
 next_due timestamptz NOT NULL DEFAULT now(), lease_until timestamptz,lease_token uuid,
 attempts integer NOT NULL DEFAULT 0 CHECK(attempts>=0), etag varchar(200),last_modified varchar(100),last_error varchar(80),
 updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(source_id,url)
);
CREATE INDEX web_jobs_due ON travel_web_jobs(next_due,lease_until);
CREATE TABLE travel_web_candidates (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), source_id uuid NOT NULL REFERENCES travel_web_sources(id) ON DELETE CASCADE,
 source_version integer NOT NULL,canonical_url varchar(600) NOT NULL,content_hash char(64) NOT NULL,
 extraction jsonb NOT NULL CHECK(octet_length(extraction::text)<=100000),
 quality varchar(20) NOT NULL CHECK(quality IN ('UNREVIEWED','INCOMPLETE','CORROBORATED','CONFLICTING','STALE')),
 status varchar(20) NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','APPROVED','REJECTED','STALE')),
 knowledge_id uuid REFERENCES verified_travel_knowledge(id),version integer NOT NULL DEFAULT 1,
 reviewed_by uuid REFERENCES users(id),created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(source_id,source_version,canonical_url,content_hash)
);
COMMIT;
