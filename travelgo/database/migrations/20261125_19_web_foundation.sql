-- WEB-INTEGRATION-02. Additive; approved only for the new isolated test target.
-- Existing users, reviews, hotel/AI tables and migrations 1-18 are unchanged.
CREATE TABLE web_account_security (
 user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
 status text NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE','SUSPENDED')),
 status_reason text CHECK(length(status_reason)<=1000),
 version integer NOT NULL DEFAULT 1 CHECK(version>0),
 token_version integer NOT NULL DEFAULT 0 CHECK(token_version>=0),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE web_media (
 id uuid PRIMARY KEY, owner_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
 kind text NOT NULL CHECK(kind IN ('CMS','AVATAR')),
 storage_key text NOT NULL UNIQUE CHECK(storage_key ~ '^(cms|avatars)/[a-f0-9-]{36}/[a-f0-9-]{36}\.webp$'),
 mime text NOT NULL DEFAULT 'image/webp' CHECK(mime='image/webp'),
 bytes integer NOT NULL CHECK(bytes BETWEEN 1 AND 10485760),
 sha256 char(64) NOT NULL, width integer NOT NULL CHECK(width BETWEEN 16 AND 8000),
 height integer NOT NULL CHECK(height BETWEEN 16 AND 8000),
 rights text NOT NULL CHECK(rights IN ('OWNED','LICENSED')),
 rights_evidence text NOT NULL CHECK(length(trim(rights_evidence)) BETWEEN 1 AND 2000),
 alt_text text NOT NULL CHECK(length(trim(alt_text)) BETWEEN 1 AND 300),
 created_at timestamptz NOT NULL DEFAULT now()
);
-- One version/publication mechanism for banners, sections and public settings.
CREATE TABLE cms_documents (
 id uuid PRIMARY KEY, kind text NOT NULL CHECK(kind IN ('BANNER','SECTION','SETTINGS')),
 key text NOT NULL CHECK(length(key) BETWEEN 1 AND 80),
 version integer NOT NULL CHECK(version>0), published_version integer,
 status text NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','PUBLISHED','SCHEDULED','ARCHIVED')),
 position integer NOT NULL DEFAULT 0 CHECK(position>=0), published_position integer NOT NULL DEFAULT 0 CHECK(published_position>=0),
 updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(kind,key),
 CHECK(published_version IS NULL OR published_version BETWEEN 1 AND version)
);
CREATE TABLE cms_revisions (
 document_id uuid NOT NULL REFERENCES cms_documents(id), version integer NOT NULL CHECK(version>0),
 content jsonb NOT NULL CHECK(jsonb_typeof(content)='object'),
 actor_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
 reason text NOT NULL CHECK(length(trim(reason)) BETWEEN 1 AND 1000),
 created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(document_id,version)
);
ALTER TABLE cms_documents ADD CONSTRAINT cms_current_revision FOREIGN KEY(id,version)
 REFERENCES cms_revisions(document_id,version) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE cms_documents ADD CONSTRAINT cms_published_revision FOREIGN KEY(id,published_version)
 REFERENCES cms_revisions(document_id,version) DEFERRABLE INITIALLY DEFERRED;
CREATE TABLE cms_featured_hotels (
 document_id uuid NOT NULL, version integer NOT NULL,
 place_id uuid NOT NULL REFERENCES hotel_profiles(place_id), position integer NOT NULL CHECK(position BETWEEN 0 AND 11),
 PRIMARY KEY(document_id,version,place_id), UNIQUE(document_id,version,position),
 FOREIGN KEY(document_id,version) REFERENCES cms_revisions(document_id,version)
);
CREATE TABLE web_notifications (
 id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 type text NOT NULL CHECK(type IN ('ACCOUNT','BOOKING','PARTNER_APPLICATION')),
 title text NOT NULL CHECK(length(title) BETWEEN 1 AND 160),
 body text NOT NULL CHECK(length(body)<=1000),
 href text NOT NULL CHECK(href ~ '^/[^/]' AND href !~ '[[:cntrl:]\\]'),
 read_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(),
 event_key text NOT NULL UNIQUE
);
CREATE TABLE partner_review_replies (
 review_id uuid PRIMARY KEY REFERENCES reviews(id) ON DELETE CASCADE, business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
 actor_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
 text text CHECK(length(trim(text)) BETWEEN 1 AND 2000), deleted_at timestamptz,
 CHECK((text IS NULL)=(deleted_at IS NOT NULL)),
 version integer NOT NULL CHECK(version>0),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX cms_publication ON cms_documents(kind,status,position,id) WHERE published_version IS NOT NULL;
CREATE INDEX web_security_status ON web_account_security(status,user_id);
CREATE INDEX web_notification_user ON web_notifications(user_id,created_at DESC,id);
CREATE INDEX web_notification_unread ON web_notifications(user_id) WHERE read_at IS NULL;
CREATE INDEX partner_reply_business ON partner_review_replies(business_id,updated_at DESC);
-- Runtime cannot rewrite revision history; DELETE is reserved for scoped operator cleanup.
CREATE FUNCTION web_immutable_revision() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 -- Allow only FK anonymization after actual account deletion. Content, version,
 -- reason and timestamps stay immutable; nulling a live author's ID is rejected.
 IF OLD.actor_user_id IS NOT NULL AND NEW.actor_user_id IS NULL
    AND (to_jsonb(NEW)-'actor_user_id')=(to_jsonb(OLD)-'actor_user_id')
    AND NOT EXISTS(SELECT 1 FROM users WHERE id=OLD.actor_user_id) THEN
  RETURN NEW;
 END IF;
 RAISE EXCEPTION 'CMS_REVISION_IMMUTABLE';
END $$;
CREATE TRIGGER web_revision_immutable BEFORE UPDATE ON cms_revisions
 FOR EACH ROW EXECUTE FUNCTION web_immutable_revision();
