-- Packet 1 draft. Apply after approved migration 22, before pilot credentials are enabled.
BEGIN;
SET LOCAL lock_timeout = '2s';
DO $$
BEGIN
    IF (current_database() = 'hugotravel_web_integration_test_20261125'
        AND session_user = 'web02_bootstrap'
        AND shobj_description((SELECT oid FROM pg_database WHERE datname=current_database()),'pg_database') = 'hugotravel-isolated-test-database-v1'
        AND (SELECT count(*) FROM public.schema_migrations) = 22
        AND EXISTS (SELECT 1 FROM hotel_lock.pilot WHERE singleton AND signing_key IS NULL)
        AND clock_timestamp() + interval '120 min' < timestamptz '2026-12-04 14:00:00+07') IS NOT TRUE THEN
        RAISE EXCEPTION 'HOTEL_PILOT_FENCE_TARGET';
    END IF;
END;
$$;

CREATE ROLE hotel_2141c_business NOLOGIN NOSUPERUSER NOBYPASSRLS NOINHERIT NOCREATEROLE NOCREATEDB CONNECTION LIMIT 8;
CREATE ROLE hotel_2141c_fixture NOLOGIN NOSUPERUSER NOBYPASSRLS NOINHERIT NOCREATEROLE NOCREATEDB CONNECTION LIMIT 2;
GRANT CONNECT ON DATABASE hugotravel_web_integration_test_20261125 TO hotel_2141c_business,hotel_2141c_fixture;
GRANT USAGE ON SCHEMA public TO hotel_2141c_business,hotel_2141c_fixture;
GRANT USAGE ON SCHEMA hotel_lock TO hotel_2141c_business;
GRANT EXECUTE ON FUNCTION hotel_lock.authorize(text,uuid,uuid,integer,bigint,bytea) TO hotel_2141c_business;
GRANT SELECT ON public.schema_migrations,public.places,public.businesses,public.hotel_profiles,public.hotel_addresses,
    public.hotel_room_types,public.hotel_rate_plans,public.hotel_rate_calendar,public.hotel_room_inventory,
    public.hotel_promotions,public.hotel_media,public.users,public.user_roles,public.web_account_security,
    public.business_members,public.bookings,public.hotel_booking_stays,public.hotel_booking_items,
    public.hotel_room_allocations,public.booking_status_history,public.audit_logs,public.user_telemetry_consents,
    public.review_ai_targets,public.review_insight_jobs,public.review_insights TO hotel_2141c_business;
GRANT SELECT ON public.hotel_rate_plans,public.hotel_room_inventory,public.hotel_profiles TO hotel_2141c_fixture;
GRANT INSERT ON public.hotel_rate_plans TO hotel_2141c_fixture;
GRANT UPDATE (sellable_quantity,closed) ON public.hotel_room_inventory TO hotel_2141c_fixture;
GRANT UPDATE (commercial_version) ON public.hotel_profiles TO hotel_2141c_business,hotel_2141c_fixture;
GRANT UPDATE (allocated_quantity) ON public.hotel_room_inventory TO hotel_2141c_business;
GRANT INSERT ON public.bookings,public.hotel_booking_stays,public.hotel_booking_items,public.hotel_room_allocations,
    public.booking_status_history,public.audit_logs TO hotel_2141c_business;
GRANT UPDATE (booking_status,updated_at) ON public.bookings TO hotel_2141c_business;
GRANT UPDATE (state,released_at,release_reason) ON public.hotel_room_allocations TO hotel_2141c_business;

CREATE SEQUENCE hotel_lock.pilot_accept_ops MAXVALUE 100;
CREATE SEQUENCE hotel_lock.pilot_cleanup_ops MAXVALUE 40;
CREATE FUNCTION hotel_lock.assert_pilot_dml() RETURNS trigger LANGUAGE plpgsql
SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $$
DECLARE
    pinned_place constant text := '2138c000-0000-4000-8000-000000000020';
    room_id constant text := '2138c000-0000-4000-8000-000000000041';
    rate_id constant text := '2141b000-0000-4000-8000-000000000081';
    pinned_business constant text := '2e17da48-5dc7-4af5-9a11-bb833b219ea2';
    customer_a constant text := '2c840c54-1933-4c93-8358-4e706a9eb8d0';
    customer_b constant text := 'cfd1bdfa-f7ea-42d1-afe9-ff0e50006061';
    actor_ids constant text[] := ARRAY[customer_a,customer_b,
        '72991c91-265f-41b0-bebc-5954c180a5d1','57ad27ae-06bf-4be3-b1a6-0537b120e3f0'];
    nights constant text[] := ARRAY['2026-12-05','2026-12-06'];
    x jsonb := to_jsonb(COALESCE(NEW,OLD));
    before_row jsonb := to_jsonb(OLD);
    cutoff timestamptz;
    cleaning boolean := session_user = 'web02_bootstrap' AND current_setting('travelgo.hotel_2141c_cleanup',true) = 'yes';
    token_probe boolean := session_user = 'web02_bootstrap' AND current_setting('travelgo.hotel_2141c_probe',true) = 'yes';
    booking_ref text;
    scoped_booking boolean;
    allowed boolean;
BEGIN
    IF session_user NOT IN ('web02_bootstrap','hotel_2141c_business','hotel_2141c_fixture') THEN RETURN COALESCE(NEW,OLD); END IF;
    SELECT expires_at INTO cutoff FROM hotel_lock.pilot WHERE singleton AND signing_key IS NOT NULL;
    IF cutoff IS NULL OR clock_timestamp() >= cutoff + interval '30 min'
        OR (cleaning IS NOT TRUE AND clock_timestamp() >= cutoff)
        OR (session_user = 'web02_bootstrap' AND cleaning IS NOT TRUE AND token_probe IS NOT TRUE) THEN
        RAISE EXCEPTION 'HOTEL_PILOT_WINDOW';
    END IF;
    IF TG_TABLE_NAME='hotel_room_allocations' THEN
        SELECT i.booking_id::text INTO booking_ref FROM public.hotel_booking_items i WHERE i.id::text=x->>'booking_item_id';
    ELSIF TG_TABLE_NAME='audit_logs' THEN booking_ref:=x->>'entity_id';
    ELSE booking_ref:=x->>'booking_id';
    END IF;
    SELECT EXISTS (SELECT 1 FROM public.bookings b
        WHERE b.id::text=booking_ref AND b.place_id::text=pinned_place AND b.business_id::text=pinned_business
          AND ((b.user_id::text=customer_a AND b.idempotency_key='release-2141b-stay-01')
            OR (b.user_id::text=customer_b AND b.idempotency_key='release-2141b-stay-02')))
      INTO scoped_booking;

    CASE TG_TABLE_NAME
        WHEN 'hotel_rate_plans' THEN
            allowed:=x->>'id'=rate_id AND x->>'place_id'=pinned_place AND x->>'room_type_id'=room_id
                AND ((TG_OP='INSERT' AND session_user='hotel_2141c_fixture'
                    AND x->'cancellation' @> '{"kind":"FREE_UNTIL_CUTOFF","cutoffHours":24}'::jsonb)
                  OR (TG_OP='DELETE' AND cleaning));
        WHEN 'hotel_room_inventory' THEN
            allowed:=TG_OP='UPDATE' AND x->>'place_id'=pinned_place AND x->>'room_type_id'=room_id
                AND x->>'stay_date'=ANY(nights)
                AND x-ARRAY['sellable_quantity','allocated_quantity','closed','version','updated_at']
                    = before_row-ARRAY['sellable_quantity','allocated_quantity','closed','version','updated_at'];
        WHEN 'hotel_profiles' THEN
            allowed:=TG_OP='UPDATE' AND x->>'place_id'=pinned_place
                AND (x->>'commercial_version')::bigint >= (before_row->>'commercial_version')::bigint
                AND x-ARRAY['commercial_version','updated_at']=before_row-ARRAY['commercial_version','updated_at'];
        WHEN 'places' THEN allowed:=TG_OP='UPDATE' AND x->>'id'=pinned_place AND x-'updated_at'=before_row-'updated_at';
        WHEN 'bookings' THEN
            allowed:=x->>'place_id'=pinned_place AND x->>'business_id'=pinned_business
                AND x->>'service_type'='hotel' AND x->>'payment_status'='unpaid'
                AND x->>'booking_date'='2026-12-05' AND x->>'return_date'='2026-12-07'
                AND ((x->>'user_id'=customer_a AND x->>'idempotency_key'='release-2141b-stay-01')
                  OR (x->>'user_id'=customer_b AND x->>'idempotency_key'='release-2141b-stay-02'))
                AND ((TG_OP='INSERT' AND x->>'booking_status'='PENDING')
                  OR (TG_OP='UPDATE' AND x-ARRAY['booking_status','updated_at']=before_row-ARRAY['booking_status','updated_at'])
                  OR (TG_OP='DELETE' AND cleaning));
        WHEN 'hotel_booking_stays' THEN
            allowed:=scoped_booking AND x->>'place_id'=pinned_place AND x->>'business_id'=pinned_business
                AND (TG_OP='INSERT' OR (TG_OP='DELETE' AND cleaning));
        WHEN 'hotel_booking_items' THEN
            allowed:=scoped_booking AND x->>'place_id'=pinned_place AND x->>'room_type_id'=room_id
                AND x->>'rate_plan_id'=rate_id AND x->>'quantity'='1'
                AND (TG_OP='INSERT' OR (TG_OP='DELETE' AND cleaning));
        WHEN 'hotel_room_allocations' THEN
            allowed:=scoped_booking AND x->>'room_type_id'=room_id AND x->>'stay_date'=ANY(nights) AND x->>'quantity'='1'
                AND (TG_OP IN ('INSERT','UPDATE') OR (TG_OP='DELETE' AND cleaning));
        WHEN 'booking_status_history' THEN
            allowed:=scoped_booking AND x->>'actor_user_id'=ANY(actor_ids)
                AND (TG_OP='INSERT' OR (TG_OP='DELETE' AND cleaning));
        WHEN 'audit_logs' THEN
            allowed:=scoped_booking AND x->>'entity_type'='Booking' AND x->>'actor_user_id'=ANY(actor_ids)
                AND x->>'action' IN ('HOTEL_BOOKING_CREATED','HOTEL_BOOKING_CONFIRMED','HOTEL_BOOKING_COMPLETED',
                    'HOTEL_BOOKING_REJECTED','HOTEL_BOOKING_CANCELLED')
                AND (TG_OP='INSERT' OR (TG_OP='DELETE' AND cleaning));
        WHEN 'web_account_security' THEN
            allowed:=token_probe AND TG_OP='UPDATE' AND x->>'user_id'=customer_a
                AND (x->>'token_version')::integer = (before_row->>'token_version')::integer + 1
                AND x-'token_version'=before_row-'token_version';
        ELSE allowed:=false;
    END CASE;
    IF allowed IS NOT TRUE THEN RAISE EXCEPTION 'HOTEL_PILOT_ROW_FENCE'; END IF;
    IF cleaning THEN PERFORM nextval('hotel_lock.pilot_cleanup_ops');
    ELSE PERFORM nextval('hotel_lock.pilot_accept_ops'); END IF;
    RETURN COALESCE(NEW,OLD);
END;
$$;
REVOKE ALL ON FUNCTION hotel_lock.assert_pilot_dml() FROM PUBLIC;

DO $$
DECLARE table_name text;
BEGIN
    FOREACH table_name IN ARRAY ARRAY['hotel_rate_plans','hotel_room_inventory','hotel_profiles','places','bookings',
        'hotel_booking_stays','hotel_booking_items','hotel_room_allocations','booking_status_history','audit_logs','web_account_security']
    LOOP
        EXECUTE format('CREATE TRIGGER hotel_2141c_fence BEFORE INSERT OR UPDATE OR DELETE ON public.%I
            FOR EACH ROW EXECUTE FUNCTION hotel_lock.assert_pilot_dml()',table_name);
    END LOOP;
END;
$$;
COMMIT;
