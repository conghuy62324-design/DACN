-- Manual rollback ONLY on an approved target, in ONE transaction after backup/identity checks.
-- Abort rather than delete any hotel business data. Never CASCADE a populated schema.
BEGIN;
DO $$ DECLARE tab text; occupied boolean;
BEGIN
 FOREACH tab IN ARRAY ARRAY['hotel_profiles','hotel_addresses','hotel_room_types','hotel_media','hotel_rate_plans','hotel_rate_calendar','hotel_room_inventory','hotel_promotions','hotel_booking_stays','hotel_booking_items','hotel_room_allocations','hotel_review_stays'] LOOP
  EXECUTE format('SELECT EXISTS(SELECT 1 FROM %I)',tab) INTO occupied;
  IF occupied THEN RAISE EXCEPTION 'HOTEL_ROLLBACK_BLOCKED_NONEMPTY: %',tab; END IF;
 END LOOP;
END $$;
DROP TRIGGER hotel_place_identity ON places;
DROP TRIGGER hotel_existing_booking_complete ON bookings;
DROP TABLE hotel_review_stays,hotel_room_allocations,hotel_booking_items,hotel_booking_stays,hotel_promotions,hotel_room_inventory,hotel_rate_calendar,hotel_rate_plans,hotel_media,hotel_addresses,hotel_room_types,hotel_profiles;
DROP FUNCTION hotel_review_attribution_guard(),hotel_booking_complete_guard(),hotel_all_nights_guard(),hotel_allocate_inventory(),hotel_item_immutable(),hotel_booking_identity_guard(),hotel_profile_revision(),hotel_child_revision(),hotel_row_version(),hotel_address_derive(),hotel_place_identity_guard(),hotel_profile_identity_guard(),hotel_normalize_vi(text);
DELETE FROM schema_migrations WHERE filename='20261118_18_hotel_domain_foundation.sql';
COMMIT;
