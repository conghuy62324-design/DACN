-- For the two approved, separate Linux clusters only. Roles are provisioned privately first.
BEGIN;
DO $$
BEGIN
    IF ((current_database() = 'hugo_2141c_stage_test' AND
              shobj_description((SELECT oid FROM pg_database WHERE datname=current_database()),'pg_database') = 'hugotravel-2141c-stage-bootstrap-v1')
         OR (current_database() = 'hugo_2141c_restore_test' AND
              shobj_description((SELECT oid FROM pg_database WHERE datname=current_database()),'pg_database') = 'hugotravel-2141c-restore-v1')) IS NOT TRUE THEN
        RAISE EXCEPTION 'REHEARSAL_ROLE_GRANT_TARGET';
    END IF;
END;
$$;

REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO hotel_runtime,review_worker;
GRANT SELECT ON public.schema_migrations,public.places,public.businesses,public.hotel_profiles,
    public.hotel_addresses,public.hotel_room_types,public.hotel_rate_plans,public.hotel_rate_calendar,
    public.hotel_room_inventory,public.hotel_promotions,public.hotel_media,public.users,public.user_roles,
    public.web_account_security,public.business_members,public.bookings,public.hotel_booking_stays,
    public.hotel_booking_items,public.hotel_room_allocations,public.booking_status_history,
    public.review_ai_targets,public.review_insight_jobs,public.review_insights TO hotel_runtime;
GRANT USAGE ON SCHEMA agent_reliability TO agent_state_runtime;
GRANT EXECUTE ON FUNCTION agent_reliability.consume(bytea,bytea,bytea),
    agent_reliability.claim_provider(bytea,uuid,uuid),
    agent_reliability.finish_provider(bytea,smallint,uuid,uuid) TO agent_state_runtime;
GRANT SELECT ON public.review_ai_targets,public.review_ai_inputs TO review_worker;
GRANT SELECT,INSERT,UPDATE ON public.review_insights,public.review_worker_state TO review_worker;
GRANT SELECT,UPDATE ON public.review_insight_jobs,public.review_processing_events TO review_worker;
GRANT EXECUTE ON FUNCTION public.queue_place_review_insights(text),public.review_ai_safe_text(text) TO review_worker;
ALTER ROLE hotel_runtime SET default_transaction_read_only = on;
COMMIT;
