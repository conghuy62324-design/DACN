// Test-target-only SQL capability fence. Never installed on staging/C/original or tracked as a production migration.
module.exports=async({migration,lock})=>{
const ids=lock.fixtureIds,places=[20,21,22,62].map(n=>ids['f'+n]),services=[20,21,22,60,61,62].map(n=>ids['f'+n]),customers=[ids.f1,ids.f2],until=lock.writeUntil;
const list=v=>v.map(x=>"'"+x+"'").join(',');
await migration.query(`CREATE FUNCTION hotel_d_scope_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE target uuid; candidate jsonb;
BEGIN
 IF current_user<>'hotel_runtime' THEN IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF; END IF;
 IF current_database()<>'${lock.database}' OR clock_timestamp()>='${until}'::timestamptz THEN RAISE EXCEPTION 'HOTEL_D_WRITE_WINDOW_CLOSED'; END IF;
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'HOTEL_D_RUNTIME_DELETE_FORBIDDEN'; END IF;
 candidate=to_jsonb(NEW);
 IF TG_TABLE_NAME='bookings' THEN
  IF NEW.user_id IS NULL OR NEW.user_id NOT IN (${list(customers)}) OR NEW.service_id NOT IN (${list(services)}) OR NEW.payment_status<>'unpaid' THEN RAISE EXCEPTION 'HOTEL_D_BOOKING_SCOPE'; END IF;
  IF TG_OP='INSERT' THEN PERFORM pg_advisory_xact_lock(hashtextextended('hotel-d-row-budget',0)); END IF;
  IF TG_OP='INSERT' AND ((NEW.service_type='hotel' AND NEW.id::text NOT LIKE '2138d000-%') OR (SELECT count(*) FROM bookings)>=${lock.caps.bookings}) THEN RAISE EXCEPTION 'HOTEL_D_BOOKING_CAP'; END IF;
  IF TG_OP='UPDATE' AND NEW.service_type='hotel' AND ((to_jsonb(NEW)-ARRAY['booking_status','updated_at']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['booking_status','updated_at'])) THEN RAISE EXCEPTION 'HOTEL_D_IMMUTABLE_BOOKING'; END IF;
 ELSIF TG_TABLE_NAME='booking_status_history' THEN
  IF NOT EXISTS(SELECT 1 FROM bookings WHERE id=NEW.booking_id AND user_id IN (${list(customers)})) THEN RAISE EXCEPTION 'HOTEL_D_HISTORY_SCOPE'; END IF;
 ELSIF TG_TABLE_NAME='audit_logs' THEN
  IF NEW.actor_user_id NOT IN (${list([ids.f1,ids.f2,ids.f3,ids.f4,ids.f13])}) OR NEW.entity_id NOT IN (SELECT id::text FROM bookings WHERE user_id IN (${list(customers)}) UNION SELECT unnest(ARRAY[${list(places)}]::text[])) THEN RAISE EXCEPTION 'HOTEL_D_AUDIT_SCOPE'; END IF;
 ELSIF TG_TABLE_NAME='hotel_room_allocations' THEN
  IF NOT EXISTS(SELECT 1 FROM hotel_booking_items i JOIN bookings b ON b.id=i.booking_id WHERE i.id=NEW.booking_item_id AND b.user_id IN (${list(customers)})) THEN RAISE EXCEPTION 'HOTEL_D_ALLOCATION_SCOPE'; END IF;
 ELSIF TG_TABLE_NAME IN ('tickets','tours') THEN
  IF candidate->>'id' NOT IN (${list(services)}) THEN RAISE EXCEPTION 'HOTEL_D_LEGACY_SCOPE'; END IF;
 ELSE
  target=CASE WHEN TG_TABLE_NAME='places' THEN (candidate->>'id')::uuid ELSE (candidate->>'place_id')::uuid END;
  IF target NOT IN (${list(places)}) THEN RAISE EXCEPTION 'HOTEL_D_PLACE_SCOPE'; END IF;
  IF TG_TABLE_NAME='hotel_room_inventory' THEN IF TG_OP='UPDATE' THEN IF NEW.allocated_quantity<>OLD.allocated_quantity AND pg_trigger_depth()<2 THEN RAISE EXCEPTION 'HOTEL_D_TRIGGER_OWNS_ALLOCATED'; END IF; END IF; END IF;
 END IF;
 RETURN NEW;
END $$;`);
for(const table of ['bookings','booking_status_history','audit_logs','places','hotel_profiles','hotel_addresses','hotel_room_types','hotel_rate_plans','hotel_rate_calendar','hotel_room_inventory','hotel_promotions','hotel_media','hotel_booking_stays','hotel_booking_items','hotel_room_allocations','tickets','tours'])await migration.query(`CREATE TRIGGER hotel_d_scope BEFORE INSERT OR UPDATE OR DELETE ON ${table} FOR EACH ROW EXECUTE FUNCTION hotel_d_scope_guard()`);
};
