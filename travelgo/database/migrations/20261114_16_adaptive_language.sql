-- Additive application-language memory. No transcript, executable mapping or model training.
BEGIN;
CREATE TABLE language_learning_settings (
 customer_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
 enabled boolean NOT NULL DEFAULT false, allow_new boolean NOT NULL DEFAULT false,
 contribution_enabled boolean NOT NULL DEFAULT false, policy_version varchar(60), contribution_policy varchar(60),
 revision integer NOT NULL DEFAULT 1 CHECK(revision>0), updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK(NOT enabled OR policy_version='TRAVELGO_LANGUAGE_MEMORY_V1'),
 CHECK(NOT contribution_enabled OR contribution_policy='TRAVELGO_LANGUAGE_CONTRIBUTION_V1')
);
CREATE TABLE personal_language_mappings (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),customer_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 expression varchar(48) NOT NULL,normalized_expression varchar(48) NOT NULL,
 concept_id varchar(160) NOT NULL,concept_type varchar(40) NOT NULL,domain varchar(40) NOT NULL,
 scope varchar(10) NOT NULL DEFAULT 'PERSONAL' CHECK(scope='PERSONAL'),source varchar(30) NOT NULL DEFAULT 'USER_CONFIRMED' CHECK(source='USER_CONFIRMED'),
 status varchar(12) NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE','REVOKED')),
 version integer NOT NULL DEFAULT 1 CHECK(version>0),created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),expires_at timestamptz NOT NULL DEFAULT now()+interval '90 days',
 UNIQUE(customer_id,normalized_expression,domain)
);
CREATE TABLE shared_language_lexicon (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),expression varchar(48) NOT NULL,normalized_expression varchar(48) NOT NULL,
 concept_id varchar(160) NOT NULL,concept_type varchar(40) NOT NULL,domain varchar(40) NOT NULL,
 status varchar(12) NOT NULL DEFAULT 'CANDIDATE' CHECK(status IN ('CANDIDATE','APPROVED','REJECTED','REVOKED')),
 source varchar(30) NOT NULL DEFAULT 'USER_CONTRIBUTION' CHECK(source='USER_CONTRIBUTION'),
 version integer NOT NULL DEFAULT 1 CHECK(version>0),reviewed_by uuid REFERENCES users(id),reviewed_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),expires_at timestamptz NOT NULL DEFAULT now()+interval '30 days',
 UNIQUE(normalized_expression,domain,concept_id),CHECK(status<>'APPROVED' OR (reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL))
);
CREATE TABLE language_contributions (
 candidate_id uuid NOT NULL REFERENCES shared_language_lexicon(id) ON DELETE CASCADE,
 customer_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 consent_version varchar(60) NOT NULL CHECK(consent_version='TRAVELGO_LANGUAGE_CONTRIBUTION_V1'),created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(candidate_id,customer_id)
);
CREATE TABLE language_lexicon_versions (
 candidate_id uuid NOT NULL REFERENCES shared_language_lexicon(id) ON DELETE CASCADE,version integer NOT NULL,
 snapshot jsonb NOT NULL,actor_id uuid REFERENCES users(id),reason varchar(240) NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(candidate_id,version)
);
CREATE TABLE language_feedback_events (
 id uuid PRIMARY KEY,customer_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 kind varchar(20) NOT NULL CHECK(kind IN ('LANGUAGE','INTENT','REFERENT','CRITERIA','HELPFULNESS','DATA_GAP')),
 outcome varchar(12) NOT NULL CHECK(outcome IN ('CORRECT','INCORRECT','UNKNOWN')),created_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL DEFAULT now()+interval '90 days'
);
CREATE INDEX personal_language_lookup ON personal_language_mappings(customer_id,normalized_expression) WHERE status='ACTIVE';
CREATE INDEX shared_language_lookup ON shared_language_lexicon(normalized_expression,domain) WHERE status='APPROVED';
COMMIT;
