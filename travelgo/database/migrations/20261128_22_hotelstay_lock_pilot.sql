-- Draft isolated HotelStay capability. Apply only after scope approval.
BEGIN;
CREATE ROLE hotel_lock_owner NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
CREATE SCHEMA hotel_lock;
REVOKE ALL ON SCHEMA hotel_lock FROM PUBLIC;
CREATE EXTENSION pgcrypto WITH SCHEMA hotel_lock;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA hotel_lock FROM PUBLIC;
GRANT USAGE, CREATE ON SCHEMA hotel_lock TO hotel_lock_owner;
GRANT USAGE ON SCHEMA public TO hotel_lock_owner;
GRANT EXECUTE ON FUNCTION hotel_lock.hmac(bytea,bytea,text) TO hotel_lock_owner;

CREATE TABLE hotel_lock.pilot (
    singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
    signing_key bytea CHECK (octet_length(signing_key)=32),
    expires_at timestamptz,
    CHECK ((signing_key IS NULL) = (expires_at IS NULL))
);
INSERT INTO hotel_lock.pilot DEFAULT VALUES;
REVOKE ALL ON hotel_lock.pilot FROM PUBLIC;
GRANT SELECT ON hotel_lock.pilot TO hotel_lock_owner;

-- PostgreSQL requires UPDATE privilege for row locks. Only the non-login function owner
-- receives column grants, and the only exposed function contains no DML statements.
GRANT SELECT (id), UPDATE (id) ON public.users TO hotel_lock_owner;
GRANT SELECT (id,user_id,role), UPDATE (id) ON public.user_roles TO hotel_lock_owner;
GRANT SELECT (user_id,status,token_version), UPDATE (user_id) ON public.web_account_security TO hotel_lock_owner;
GRANT SELECT (id,status), UPDATE (id) ON public.businesses TO hotel_lock_owner;
GRANT SELECT (id,business_id,user_id,permissions), UPDATE (id) ON public.business_members TO hotel_lock_owner;
GRANT SELECT (id,business_id,status), UPDATE (id) ON public.places TO hotel_lock_owner;
GRANT SELECT (id,user_id,business_id,place_id,idempotency_key) ON public.bookings TO hotel_lock_owner;

CREATE FUNCTION hotel_lock.authorize(p_action text,p_actor uuid,p_target uuid,p_version integer,p_expiry bigint,p_mac bytea)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,pg_temp AS $$
DECLARE
    pinned_place constant uuid := '2138c000-0000-4000-8000-000000000020';
    customer_a constant uuid := '2c840c54-1933-4c93-8358-4e706a9eb8d0';
    customer_b constant uuid := 'cfd1bdfa-f7ea-42d1-afe9-ff0e50006061';
    partner_a constant uuid := '72991c91-265f-41b0-bebc-5954c180a5d1';
    admin_a constant uuid := '57ad27ae-06bf-4be3-b1a6-0537b120e3f0';
    now_ms bigint := floor(extract(epoch FROM clock_timestamp())*1000)::bigint;
    key_bytes bytea;
    signed_message text;
    expected_mac bytea;
    role_name text;
    stay_owner uuid;
    business uuid;
    difference integer := 0;
BEGIN
    IF session_user <> 'hotel_2141c_business'
        OR current_database() <> 'hugotravel_web_integration_test_20261125'
        OR (SELECT shobj_description(oid,'pg_database') FROM pg_database WHERE datname=current_database())
            IS DISTINCT FROM 'hugotravel-isolated-test-database-v1'
        OR p_action IS NULL OR p_actor IS NULL OR p_target IS NULL OR p_version IS NULL OR p_version < 0
        OR p_expiry IS NULL OR p_expiry <= now_ms OR p_expiry > now_ms + 5000
        OR octet_length(p_mac) IS DISTINCT FROM 32 THEN
        RETURN false;
    END IF;

    SELECT signing_key INTO key_bytes FROM hotel_lock.pilot
        WHERE singleton AND expires_at > clock_timestamp();
    IF key_bytes IS NULL THEN RETURN false; END IF;
    signed_message := concat_ws(':','hotel-lock-v1',p_action,p_actor,p_target,p_version,
        pg_current_xact_id()::text,pg_backend_pid(),p_expiry);
    expected_mac := hotel_lock.hmac(convert_to(signed_message,'UTF8'),key_bytes,'sha256');
    FOR i IN 0..31 LOOP
        difference := difference | (get_byte(expected_mac,i) # get_byte(p_mac,i));
    END LOOP;
    IF difference <> 0 THEN RETURN false; END IF;

    CASE p_action
        WHEN 'confirm_customer', 'published_hotel' THEN
            IF p_actor NOT IN (customer_a,customer_b) OR p_target <> pinned_place THEN RETURN false; END IF;
            role_name := 'CUSTOMER';
        WHEN 'cancel_customer', 'partner_transition', 'admin_transition' THEN
            SELECT b.user_id,b.business_id INTO stay_owner,business
            FROM public.bookings AS b
            WHERE b.id=p_target AND b.place_id=pinned_place
              AND ((b.user_id=customer_a AND b.idempotency_key='release-2141b-stay-01')
                OR (b.user_id=customer_b AND b.idempotency_key='release-2141b-stay-02'));
            IF NOT FOUND THEN RETURN false; END IF;
            CASE p_action
                WHEN 'cancel_customer' THEN
                    IF p_actor <> stay_owner THEN RETURN false; END IF;
                    role_name := 'CUSTOMER';
                WHEN 'partner_transition' THEN
                    IF p_actor <> partner_a THEN RETURN false; END IF;
                    role_name := 'PARTNER';
                ELSE
                    IF p_actor <> admin_a THEN RETURN false; END IF;
                    role_name := 'SUPER_ADMIN';
            END CASE;
        ELSE RETURN false;
    END CASE;

    PERFORM u.id FROM public.users AS u JOIN public.user_roles AS r ON r.user_id=u.id
        WHERE u.id=p_actor AND r.role=role_name FOR SHARE OF u,r;
    IF NOT FOUND THEN RETURN false; END IF;
    PERFORM s.user_id FROM public.web_account_security AS s
        WHERE s.user_id=p_actor AND s.status='ACTIVE' AND s.token_version=p_version FOR SHARE OF s;
    IF NOT FOUND THEN RETURN false; END IF;
    IF p_action = 'published_hotel' THEN
        PERFORM p.id FROM public.places AS p JOIN public.businesses AS b ON b.id=p.business_id
        WHERE p.id=pinned_place AND p.status='APPROVED' AND b.status='ACTIVE' FOR SHARE OF p,b;
        RETURN FOUND;
    END IF;
    IF p_action='partner_transition' THEN
        PERFORM m.id FROM public.business_members AS m
            WHERE m.user_id=p_actor AND m.business_id=business AND m.permissions @> '["MANAGE_BOOKINGS"]'::jsonb
            FOR SHARE OF m;
        RETURN FOUND;
    END IF;
    RETURN true;
END;
$$;
ALTER FUNCTION hotel_lock.authorize(text,uuid,uuid,integer,bigint,bytea) OWNER TO hotel_lock_owner;
REVOKE ALL ON FUNCTION hotel_lock.authorize(text,uuid,uuid,integer,bigint,bytea) FROM PUBLIC;
REVOKE CREATE ON SCHEMA hotel_lock FROM hotel_lock_owner;
COMMIT;
