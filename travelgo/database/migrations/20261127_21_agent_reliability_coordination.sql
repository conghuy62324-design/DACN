-- TASK21.41-B. Coordination metadata only. Configure and grant roles separately after approval.
BEGIN;
CREATE SCHEMA agent_reliability;
REVOKE ALL ON SCHEMA agent_reliability FROM PUBLIC;

CREATE TABLE agent_reliability.settings (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  quota_cap integer NOT NULL DEFAULT 20 CHECK (quota_cap BETWEEN 1 AND 1000),
  window_seconds integer NOT NULL DEFAULT 3600 CHECK (window_seconds BETWEEN 60 AND 86400),
  model_slots integer NOT NULL DEFAULT 1 CHECK (model_slots BETWEEN 1 AND 8),
  key_fingerprint bytea CHECK (octet_length(key_fingerprint) = 32)
);
INSERT INTO agent_reliability.settings DEFAULT VALUES;

CREATE TABLE agent_reliability.quota_windows (
  owner_key bytea PRIMARY KEY CHECK (octet_length(owner_key) = 32),
  expires_at timestamptz NOT NULL,
  used integer NOT NULL CHECK (used BETWEEN 1 AND 1000)
);
CREATE INDEX quota_windows_expiry ON agent_reliability.quota_windows(expires_at);

CREATE TABLE agent_reliability.request_claims (
  owner_key bytea NOT NULL CHECK (octet_length(owner_key) = 32),
  request_key bytea NOT NULL CHECK (octet_length(request_key) = 32),
  expires_at timestamptz NOT NULL,
  PRIMARY KEY (owner_key, request_key)
);
CREATE INDEX request_claims_expiry ON agent_reliability.request_claims(expires_at);

CREATE TABLE agent_reliability.provider_leases (
  slot smallint PRIMARY KEY CHECK (slot BETWEEN 1 AND 8),
  owner_token uuid NOT NULL,
  lease_token uuid NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL
);
CREATE INDEX provider_leases_expiry ON agent_reliability.provider_leases(expires_at);

CREATE FUNCTION agent_reliability.consume(p_key bytea, p_owner bytea, p_request bytea)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $$
DECLARE
  settings agent_reliability.settings%ROWTYPE;
  at_time timestamptz;
BEGIN
  SELECT * INTO STRICT settings FROM agent_reliability.settings;
  IF settings.key_fingerprint IS NULL OR settings.key_fingerprint IS DISTINCT FROM p_key
    OR octet_length(p_owner) IS DISTINCT FROM 32
    OR (p_request IS NOT NULL AND octet_length(p_request) <> 32) THEN
    RAISE EXCEPTION 'agent coordination configuration invalid';
  END IF;

  -- Serialize admission and replay check for one pseudonymous principal.
  PERFORM pg_advisory_xact_lock(hashtextextended(encode(p_owner, 'hex'), 2141021));
  at_time := clock_timestamp();
  IF p_request IS NOT NULL AND EXISTS (
    SELECT 1 FROM agent_reliability.request_claims
    WHERE owner_key = p_owner AND request_key = p_request AND expires_at > at_time
  ) THEN
    RETURN 'REPLAY';
  END IF;

  INSERT INTO agent_reliability.quota_windows AS w (owner_key, expires_at, used)
    VALUES (p_owner, at_time + make_interval(secs => settings.window_seconds), 1)
    ON CONFLICT (owner_key) DO UPDATE
    SET used = CASE WHEN w.expires_at <= at_time THEN 1 ELSE w.used + 1 END,
        expires_at = CASE WHEN w.expires_at <= at_time THEN EXCLUDED.expires_at ELSE w.expires_at END
    WHERE w.expires_at <= at_time OR w.used < settings.quota_cap;
  IF NOT FOUND THEN RETURN 'LIMIT'; END IF;

  IF p_request IS NOT NULL THEN
    INSERT INTO agent_reliability.request_claims AS r (owner_key, request_key, expires_at)
      VALUES (p_owner, p_request, at_time + make_interval(secs => greatest(settings.window_seconds, 900)))
      ON CONFLICT (owner_key, request_key) DO UPDATE SET expires_at = EXCLUDED.expires_at;
  END IF;
  RETURN 'ACCEPTED';
END;
$$;

CREATE FUNCTION agent_reliability.claim_provider(p_key bytea, p_owner uuid, p_token uuid)
RETURNS smallint LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $$
DECLARE
  settings agent_reliability.settings%ROWTYPE;
  at_time timestamptz;
  next_slot smallint;
BEGIN
  SELECT * INTO STRICT settings FROM agent_reliability.settings;
  IF settings.key_fingerprint IS NULL OR settings.key_fingerprint IS DISTINCT FROM p_key
    OR p_owner IS NULL OR p_token IS NULL THEN
    RAISE EXCEPTION 'agent coordination configuration invalid';
  END IF;
  -- Registry lock is held for this statement only. Contention returns busy without waiting.
  IF NOT pg_try_advisory_xact_lock(2141021, 1) THEN RETURN NULL; END IF;
  at_time := clock_timestamp();
  IF (SELECT count(*) FROM agent_reliability.provider_leases WHERE expires_at > at_time) >= settings.model_slots THEN
    RETURN NULL;
  END IF;

  SELECT candidate.slot::smallint INTO next_slot
  FROM generate_series(1, settings.model_slots) AS candidate(slot)
  WHERE NOT EXISTS (
    SELECT 1 FROM agent_reliability.provider_leases AS l WHERE l.slot = candidate.slot AND l.expires_at > at_time
  )
  ORDER BY candidate.slot LIMIT 1;
  IF next_slot IS NULL THEN RETURN NULL; END IF;

  INSERT INTO agent_reliability.provider_leases AS l (slot, owner_token, lease_token, expires_at)
    VALUES (next_slot, p_owner, p_token, at_time + interval '60 seconds')
    ON CONFLICT (slot) DO UPDATE SET owner_token = EXCLUDED.owner_token, lease_token = EXCLUDED.lease_token,
      expires_at = EXCLUDED.expires_at WHERE l.expires_at <= at_time;
  IF NOT FOUND THEN RETURN NULL; END IF;
  RETURN next_slot;
END;
$$;

CREATE FUNCTION agent_reliability.finish_provider(p_key bytea, p_slot smallint, p_owner uuid, p_token uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM agent_reliability.settings WHERE key_fingerprint = p_key) THEN
    RAISE EXCEPTION 'agent coordination configuration invalid';
  END IF;
  DELETE FROM agent_reliability.provider_leases
  WHERE slot = p_slot AND owner_token = p_owner AND lease_token = p_token AND expires_at > clock_timestamp();
  RETURN FOUND;
END;
$$;

-- Only the separately approved maintenance role may execute this function.
CREATE FUNCTION agent_reliability.prune(p_limit integer)
RETURNS TABLE (quota_rows integer, request_rows integer, lease_rows integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $$
DECLARE at_time timestamptz := clock_timestamp();
BEGIN
  IF p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 500 THEN RAISE EXCEPTION 'agent cleanup limit invalid'; END IF;
  WITH victims AS (
    SELECT owner_key FROM agent_reliability.quota_windows
    WHERE expires_at <= at_time ORDER BY expires_at, owner_key LIMIT p_limit FOR UPDATE SKIP LOCKED
  )
  DELETE FROM agent_reliability.quota_windows AS w USING victims v WHERE w.owner_key = v.owner_key;
  GET DIAGNOSTICS quota_rows = ROW_COUNT;
  WITH victims AS (
    SELECT owner_key,request_key FROM agent_reliability.request_claims
    WHERE expires_at <= at_time ORDER BY expires_at,owner_key,request_key LIMIT p_limit FOR UPDATE SKIP LOCKED
  )
  DELETE FROM agent_reliability.request_claims AS r USING victims v
    WHERE (r.owner_key,r.request_key) = (v.owner_key,v.request_key);
  GET DIAGNOSTICS request_rows = ROW_COUNT;
  WITH victims AS (
    SELECT slot FROM agent_reliability.provider_leases
    WHERE expires_at <= at_time ORDER BY expires_at,slot LIMIT p_limit FOR UPDATE SKIP LOCKED
  )
  DELETE FROM agent_reliability.provider_leases AS l USING victims v WHERE l.slot = v.slot;
  GET DIAGNOSTICS lease_rows = ROW_COUNT;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON ALL TABLES IN SCHEMA agent_reliability FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA agent_reliability FROM PUBLIC;
COMMIT;
