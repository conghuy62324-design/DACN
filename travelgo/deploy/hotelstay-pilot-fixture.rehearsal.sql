-- Packet 1 draft. Snapshot approved baseline rows before using the fixture role.
BEGIN;
SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '8s';
DO $$
DECLARE affected integer;
BEGIN
    IF (current_database() = 'hugotravel_web_integration_test_20261125'
        AND session_user = 'hotel_2141c_fixture'
        AND shobj_description((SELECT oid FROM pg_database WHERE datname=current_database()),'pg_database') = 'hugotravel-isolated-test-database-v1'
        AND clock_timestamp() < timestamptz '2026-12-04 14:00:00+07') IS NOT TRUE THEN
        RAISE EXCEPTION 'HOTEL_PILOT_FIXTURE_TARGET';
    END IF;
    INSERT INTO public.hotel_rate_plans(id,place_id,room_type_id,name,currency,price_basis,base_amount_vnd,
        valid_from,valid_until,min_nights,max_nights,included_adults,extra_adult_vnd_per_night,child_policy,
        child_bands,meal_plan,cancellation,tax,fees,mandatory_fees_known,status)
    SELECT '2141b000-0000-4000-8000-000000000081',place_id,room_type_id,'SYNTHETIC 21.41-C',
        currency,price_basis,base_amount_vnd,DATE '2026-12-05',DATE '2026-12-07',
        min_nights,max_nights,included_adults,extra_adult_vnd_per_night,child_policy,child_bands,meal_plan,
        '{"kind":"FREE_UNTIL_CUTOFF","cutoffHours":24,"terms":"SYNTHETIC free-cancellation rehearsal"}',
        tax,fees,mandatory_fees_known,'ACTIVE'
    FROM public.hotel_rate_plans
    WHERE id='2138c000-0000-4000-8000-000000000081' AND place_id='2138c000-0000-4000-8000-000000000020'
      AND room_type_id='2138c000-0000-4000-8000-000000000041' AND cancellation->>'kind'='NON_REFUNDABLE';
    GET DIAGNOSTICS affected = ROW_COUNT;
    IF affected<>1 THEN RAISE EXCEPTION 'HOTEL_PILOT_FIXTURE_RATE'; END IF;
    UPDATE public.hotel_room_inventory SET sellable_quantity=1,closed=false
    WHERE place_id='2138c000-0000-4000-8000-000000000020'
      AND room_type_id='2138c000-0000-4000-8000-000000000041'
      AND stay_date IN (DATE '2026-12-05',DATE '2026-12-06')
      AND allocated_quantity=0 AND sellable_quantity=5 AND NOT closed;
    GET DIAGNOSTICS affected = ROW_COUNT;
    IF affected<>2 THEN RAISE EXCEPTION 'HOTEL_PILOT_FIXTURE_INVENTORY'; END IF;
END;
$$;
COMMIT;
