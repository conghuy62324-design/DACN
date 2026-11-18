-- Additive; no catalog/review/memory/Trip changes. No seed facts.
BEGIN;
CREATE TABLE verified_travel_knowledge (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 location_id varchar(120) NOT NULL,
 place_id uuid REFERENCES places(id) ON DELETE CASCADE,
 topic varchar(30) NOT NULL CHECK(topic IN ('overview','experience','culture','family','visit','preparation','hours','rules')),
 title varchar(160) NOT NULL,
 content text NOT NULL CHECK(length(content) BETWEEN 1 AND 900),
 source_type varchar(30) NOT NULL CHECK(source_type IN ('INTERNAL_CATALOG','OFFICIAL','PARTNER_VERIFIED')),
 source_url varchar(600), internal_source_id varchar(120),
 provenance jsonb NOT NULL,
 status varchar(20) NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','APPROVED','REVOKED')),
 public_use boolean NOT NULL DEFAULT false,
 reviewed_at timestamptz, valid_from timestamptz, expires_at timestamptz,
 version integer NOT NULL DEFAULT 1 CHECK(version>0),
 reviewed_by uuid REFERENCES users(id),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK(status<>'APPROVED' OR (reviewed_at IS NOT NULL AND reviewed_by IS NOT NULL AND public_use)),
 CHECK(expires_at IS NULL OR valid_from IS NULL OR expires_at>valid_from),
 CHECK((source_type='INTERNAL_CATALOG' AND internal_source_id IS NOT NULL AND place_id IS NOT NULL) OR (source_type<>'INTERNAL_CATALOG' AND source_url IS NOT NULL))
);
CREATE INDEX verified_knowledge_location_topic ON verified_travel_knowledge(location_id,topic) WHERE status='APPROVED' AND public_use;
COMMIT;
