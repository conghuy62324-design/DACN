-- Phase 21.38-A artifact. NOT authorized for existing staging or production.
-- Run through the existing checksum/transaction migration runner, after target approval.
-- Existing rows/columns are not rewritten. No demo backfill or legacy price conversion.

CREATE FUNCTION hotel_normalize_vi(value text) RETURNS text
LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE AS $$
 SELECT trim(regexp_replace(regexp_replace(translate(lower(normalize(value,NFD)),'đ','d'),U&'[\0300-\036f]','','g'),'[^a-z0-9]+',' ','g'))
$$;

CREATE TABLE hotel_profiles (
 place_id uuid PRIMARY KEY REFERENCES places(id),
 business_id uuid NOT NULL REFERENCES businesses(id),
 content_version bigint NOT NULL DEFAULT 1 CHECK(content_version>0),
 approved_content_version bigint CHECK(approved_content_version>0 AND approved_content_version<=content_version),
 commercial_version bigint NOT NULL DEFAULT 1 CHECK(commercial_version>0),
 check_in_time time NOT NULL DEFAULT '14:00', check_out_time time NOT NULL DEFAULT '12:00',
 time_zone text NOT NULL DEFAULT 'Asia/Ho_Chi_Minh' CHECK(time_zone='Asia/Ho_Chi_Minh'),
 services jsonb NOT NULL DEFAULT '[]' CHECK(jsonb_typeof(services)='array'),
 policies jsonb NOT NULL DEFAULT '{}' CHECK(jsonb_typeof(policies)='object'),
 star_rating smallint CHECK(star_rating BETWEEN 1 AND 5), star_verified_at timestamptz, star_evidence text,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK((star_rating IS NULL AND star_verified_at IS NULL AND star_evidence IS NULL) OR
       (star_rating IS NOT NULL AND star_verified_at IS NOT NULL AND nullif(trim(star_evidence),'') IS NOT NULL))
);
CREATE FUNCTION hotel_profile_identity_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='UPDATE' AND (NEW.place_id<>OLD.place_id OR NEW.business_id<>OLD.business_id) THEN
  RAISE EXCEPTION 'HOTEL_IDENTITY_IMMUTABLE';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM places WHERE id=NEW.place_id AND category='hotel' AND business_id=NEW.business_id) THEN
  RAISE EXCEPTION 'HOTEL_PLACE_BUSINESS_MISMATCH';
 END IF;
 NEW.updated_at=now(); RETURN NEW;
END $$;
CREATE TRIGGER hotel_profile_identity BEFORE INSERT OR UPDATE ON hotel_profiles FOR EACH ROW EXECUTE FUNCTION hotel_profile_identity_guard();
CREATE FUNCTION hotel_place_identity_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF EXISTS(SELECT 1 FROM hotel_profiles WHERE place_id=OLD.id) AND
    (NEW.category IS DISTINCT FROM OLD.category OR NEW.business_id IS DISTINCT FROM OLD.business_id) THEN
  RAISE EXCEPTION 'HOTEL_PROFILE_IDENTITY_REQUIRES_EXPLICIT_MIGRATION';
 END IF; RETURN NEW;
END $$;
CREATE TRIGGER hotel_place_identity BEFORE UPDATE OF category,business_id ON places FOR EACH ROW EXECUTE FUNCTION hotel_place_identity_guard();

CREATE TABLE hotel_addresses (
 place_id uuid PRIMARY KEY REFERENCES hotel_profiles(place_id),
 house_number text, street_name text, ward_or_commune text, administrative_area text,
 province_code text NOT NULL, province_or_city text NOT NULL, tourism_destination_id text,
 full_address text NOT NULL, normalized_address text NOT NULL,
 street_key text GENERATED ALWAYS AS (regexp_replace(hotel_normalize_vi(street_name),'^(duong|d|street) +','')) STORED,
 ward_key text GENERATED ALWAYS AS (regexp_replace(regexp_replace(hotel_normalize_vi(ward_or_commune),'^p +','phuong '),'^x +','xa ')) STORED,
 search_document tsvector GENERATED ALWAYS AS (to_tsvector('simple',hotel_normalize_vi(full_address))) STORED,
 latitude double precision, longitude double precision,
 location geometry(Point,4326) GENERATED ALWAYS AS
 (CASE WHEN latitude IS NOT NULL AND longitude IS NOT NULL THEN ST_SetSRID(ST_MakePoint(longitude,latitude),4326) END) STORED,
 coordinate_status text NOT NULL DEFAULT 'UNKNOWN' CHECK(coordinate_status IN ('UNKNOWN','PARTNER_PROVIDED','VERIFIED')),
 coordinate_verified_at timestamptz, coordinate_evidence text,
 source text NOT NULL CHECK(length(trim(source)) BETWEEN 1 AND 200),
 version bigint NOT NULL DEFAULT 1 CHECK(version>0), updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK((latitude IS NULL)=(longitude IS NULL)), CHECK(latitude BETWEEN -90 AND 90), CHECK(longitude BETWEEN -180 AND 180),
 CHECK((coordinate_status='UNKNOWN' AND latitude IS NULL AND coordinate_verified_at IS NULL AND coordinate_evidence IS NULL) OR
       (coordinate_status='PARTNER_PROVIDED' AND latitude IS NOT NULL AND coordinate_verified_at IS NULL AND coordinate_evidence IS NULL) OR
       (coordinate_status='VERIFIED' AND latitude IS NOT NULL AND coordinate_verified_at IS NOT NULL AND nullif(trim(coordinate_evidence),'') IS NOT NULL))
);
CREATE INDEX hotel_address_area ON hotel_addresses(province_code,tourism_destination_id);
CREATE INDEX hotel_address_street ON hotel_addresses(province_code,street_key);
CREATE INDEX hotel_address_ward ON hotel_addresses(province_code,ward_key);
CREATE INDEX hotel_address_search ON hotel_addresses USING gin(search_document);
CREATE INDEX hotel_address_location ON hotel_addresses USING gist(location);

CREATE TABLE hotel_room_types (
 id uuid PRIMARY KEY, place_id uuid NOT NULL REFERENCES hotel_profiles(place_id), name varchar(160) NOT NULL, description text NOT NULL,
 area_m2 numeric(8,2) CHECK(area_m2>0 AND area_m2<=10000), bedrooms smallint CHECK(bedrooms BETWEEN 0 AND 30), bathrooms smallint CHECK(bathrooms BETWEEN 0 AND 30),
 beds jsonb NOT NULL CHECK(jsonb_typeof(beds)='array' AND jsonb_array_length(beds) BETWEEN 1 AND 8), extra_bed_available boolean,
 max_occupancy smallint NOT NULL CHECK(max_occupancy BETWEEN 1 AND 30), max_adults smallint NOT NULL CHECK(max_adults BETWEEN 1 AND 20), max_children smallint NOT NULL CHECK(max_children BETWEEN 0 AND 10),
 view text NOT NULL DEFAULT 'UNKNOWN' CHECK(view IN ('SEA','MOUNTAIN','CITY','GARDEN','LAKE','POOL','NONE','UNKNOWN')),
 balcony boolean, has_window boolean, kitchen boolean, private_bathroom boolean,
 amenities text[] NOT NULL DEFAULT '{}', status text NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','ACTIVE','ARCHIVED')),
 version bigint NOT NULL DEFAULT 1 CHECK(version>0), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(id,place_id), CHECK(max_adults<=max_occupancy AND max_children<=max_occupancy),
 CHECK(amenities <@ ARRAY['WIFI','TV','AIR_CONDITIONING','REFRIGERATOR','MINIBAR','BATHTUB','SHOWER','HAIR_DRYER','KITCHEN','BALCONY','WORK_DESK','PRIVATE_POOL','SAFE','TOWELS','ACCESSIBLE_BATHROOM']::text[])
);
CREATE INDEX hotel_rooms_place ON hotel_room_types(place_id,status);
CREATE TABLE hotel_media (
 id uuid PRIMARY KEY, place_id uuid NOT NULL REFERENCES hotel_profiles(place_id), room_type_id uuid,
 storage_key text NOT NULL CHECK(storage_key ~ '^hotels/[a-zA-Z0-9/_\.-]+$' AND storage_key !~ '(^|/)\.\.(/|$)'),
 mime_type text NOT NULL CHECK(mime_type IN ('image/jpeg','image/png','image/webp','image/avif')),
 size_bytes bigint NOT NULL CHECK(size_bytes BETWEEN 1 AND 10485760), checksum_sha256 char(64) NOT NULL CHECK(checksum_sha256 ~ '^[0-9a-f]{64}$'),
 rights text NOT NULL DEFAULT 'UNVERIFIED' CHECK(rights IN ('UNVERIFIED','OWNED','PARTNER_CONFIRMED')), rights_evidence text,
 status text NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','APPROVED','REJECTED')), position integer NOT NULL CHECK(position>=0),
 alt_text varchar(500) NOT NULL DEFAULT '',
 version bigint NOT NULL DEFAULT 1 CHECK(version>0), updated_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(room_type_id,place_id) REFERENCES hotel_room_types(id,place_id), CHECK(status<>'APPROVED' OR (rights<>'UNVERIFIED' AND nullif(trim(rights_evidence),'') IS NOT NULL))
);
CREATE INDEX hotel_media_place_room ON hotel_media(place_id,room_type_id,position);
CREATE TABLE hotel_rate_plans (
 id uuid PRIMARY KEY, place_id uuid NOT NULL REFERENCES hotel_profiles(place_id), room_type_id uuid NOT NULL,
 name varchar(160) NOT NULL, currency char(3) NOT NULL DEFAULT 'VND' CHECK(currency='VND'), price_basis text NOT NULL DEFAULT 'PER_ROOM_NIGHT' CHECK(price_basis='PER_ROOM_NIGHT'),
 base_amount_vnd bigint NOT NULL CHECK(base_amount_vnd BETWEEN 0 AND 1000000000000), valid_from date NOT NULL, valid_until date NOT NULL,
 min_nights smallint NOT NULL DEFAULT 1 CHECK(min_nights BETWEEN 1 AND 90), max_nights smallint NOT NULL DEFAULT 90 CHECK(max_nights BETWEEN 1 AND 90),
 included_adults smallint NOT NULL CHECK(included_adults BETWEEN 1 AND 20), extra_adult_vnd_per_night bigint CHECK(extra_adult_vnd_per_night BETWEEN 0 AND 1000000000000),
 child_policy text NOT NULL DEFAULT 'UNKNOWN' CHECK(child_policy IN ('NOT_ALLOWED','INCLUDED','BANDS_REQUIRED','UNKNOWN')),
 child_bands jsonb NOT NULL DEFAULT '[]' CHECK(jsonb_typeof(child_bands)='array'),
 meal_plan text NOT NULL CHECK(meal_plan IN ('ROOM_ONLY','BREAKFAST_INCLUDED')),
 cancellation jsonb NOT NULL CHECK(jsonb_typeof(cancellation)='object'), tax jsonb NOT NULL CHECK(jsonb_typeof(tax)='object'),
 fees jsonb NOT NULL DEFAULT '[]' CHECK(jsonb_typeof(fees)='array'), mandatory_fees_known boolean NOT NULL DEFAULT false,
 status text NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','ACTIVE','ARCHIVED')),
 version bigint NOT NULL DEFAULT 1 CHECK(version>0), updated_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(room_type_id,place_id) REFERENCES hotel_room_types(id,place_id), UNIQUE(id,room_type_id,place_id),
 CHECK(valid_until>valid_from AND max_nights>=min_nights)
);
CREATE INDEX hotel_rates_room ON hotel_rate_plans(room_type_id,status,valid_from,valid_until);
CREATE TABLE hotel_rate_calendar (
 rate_plan_id uuid NOT NULL, room_type_id uuid NOT NULL, place_id uuid NOT NULL, stay_date date NOT NULL,
 amount_vnd bigint NOT NULL CHECK(amount_vnd BETWEEN 0 AND 1000000000000), closed boolean NOT NULL DEFAULT false,
 version bigint NOT NULL DEFAULT 1 CHECK(version>0), updated_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(rate_plan_id,stay_date),
 FOREIGN KEY(rate_plan_id,room_type_id,place_id) REFERENCES hotel_rate_plans(id,room_type_id,place_id)
);
CREATE TABLE hotel_room_inventory (
 room_type_id uuid NOT NULL, place_id uuid NOT NULL, stay_date date NOT NULL,
 sellable_quantity integer NOT NULL CHECK(sellable_quantity BETWEEN 0 AND 100000), allocated_quantity integer NOT NULL DEFAULT 0 CHECK(allocated_quantity>=0),
 closed boolean NOT NULL DEFAULT false, version bigint NOT NULL DEFAULT 1 CHECK(version>0), updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(room_type_id,stay_date), FOREIGN KEY(room_type_id,place_id) REFERENCES hotel_room_types(id,place_id), CHECK(allocated_quantity<=sellable_quantity)
);
CREATE TABLE hotel_promotions (
 id uuid PRIMARY KEY, place_id uuid NOT NULL REFERENCES hotel_profiles(place_id), room_type_id uuid, rate_plan_id uuid,
 name varchar(160) NOT NULL, description text NOT NULL DEFAULT '', currency char(3) NOT NULL DEFAULT 'VND' CHECK(currency='VND'),
 kind text NOT NULL CHECK(kind IN ('PERCENT_BPS','FIXED_STAY')), value bigint NOT NULL CHECK(value>0), max_discount_vnd bigint CHECK(max_discount_vnd BETWEEN 1 AND 1000000000000),
 booking_starts_at timestamptz NOT NULL, booking_ends_at timestamptz NOT NULL, stay_from date NOT NULL, stay_until date NOT NULL,
 min_nights smallint NOT NULL CHECK(min_nights BETWEEN 1 AND 90), status text NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','ACTIVE','ARCHIVED')),
 version bigint NOT NULL DEFAULT 1 CHECK(version>0), updated_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(room_type_id,place_id) REFERENCES hotel_room_types(id,place_id), FOREIGN KEY(rate_plan_id,room_type_id,place_id) REFERENCES hotel_rate_plans(id,room_type_id,place_id),
 CHECK(rate_plan_id IS NULL OR room_type_id IS NOT NULL), CHECK(booking_ends_at>booking_starts_at AND stay_until>stay_from),
 CHECK((kind='PERCENT_BPS' AND value<=10000) OR (kind='FIXED_STAY' AND value<=1000000000000))
);
CREATE INDEX hotel_promotions_place ON hotel_promotions(place_id,status,booking_ends_at);

-- Extensions of existing Booking identity, not another reservation engine.
CREATE TABLE hotel_booking_stays (
 booking_id uuid PRIMARY KEY REFERENCES bookings(id), place_id uuid NOT NULL REFERENCES hotel_profiles(place_id), business_id uuid NOT NULL REFERENCES businesses(id),
 contract text NOT NULL DEFAULT 'HOTEL_ROOM_NIGHT_V1' CHECK(contract='HOTEL_ROOM_NIGHT_V1'), currency char(3) NOT NULL DEFAULT 'VND' CHECK(currency='VND'),
 check_in date NOT NULL, check_out date NOT NULL, total_vnd bigint NOT NULL CHECK(total_vnd BETWEEN 0 AND 9999999999999),
 source_version char(64) NOT NULL CHECK(source_version ~ '^[0-9a-f]{64}$'), quote_snapshot jsonb NOT NULL CHECK(jsonb_typeof(quote_snapshot)='object'),
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(booking_id,place_id), CHECK(check_out>check_in AND check_out-check_in<=90)
);
CREATE TABLE hotel_booking_items (
 id uuid PRIMARY KEY, booking_id uuid NOT NULL, place_id uuid NOT NULL, room_type_id uuid NOT NULL, rate_plan_id uuid NOT NULL,
 quantity integer NOT NULL CHECK(quantity BETWEEN 1 AND 10), occupancy jsonb NOT NULL CHECK(jsonb_typeof(occupancy)='array'),
 total_vnd bigint NOT NULL CHECK(total_vnd BETWEEN 0 AND 9999999999999), quote_snapshot jsonb NOT NULL CHECK(jsonb_typeof(quote_snapshot)='object'),
 FOREIGN KEY(booking_id,place_id) REFERENCES hotel_booking_stays(booking_id,place_id),
 FOREIGN KEY(rate_plan_id,room_type_id,place_id) REFERENCES hotel_rate_plans(id,room_type_id,place_id), UNIQUE(id,room_type_id)
);
CREATE TABLE hotel_room_allocations (
 id uuid PRIMARY KEY, booking_item_id uuid NOT NULL, room_type_id uuid NOT NULL, stay_date date NOT NULL,
 quantity integer NOT NULL CHECK(quantity BETWEEN 1 AND 10), state text NOT NULL DEFAULT 'ACTIVE' CHECK(state IN ('ACTIVE','RELEASED')),
 released_at timestamptz, release_reason text,
 FOREIGN KEY(booking_item_id,room_type_id) REFERENCES hotel_booking_items(id,room_type_id),
 FOREIGN KEY(room_type_id,stay_date) REFERENCES hotel_room_inventory(room_type_id,stay_date), UNIQUE(booking_item_id,stay_date),
 CHECK((state='ACTIVE' AND released_at IS NULL AND release_reason IS NULL) OR (state='RELEASED' AND released_at IS NOT NULL AND nullif(trim(release_reason),'') IS NOT NULL))
);
CREATE TABLE hotel_review_stays (
 review_id uuid PRIMARY KEY REFERENCES reviews(id) ON DELETE CASCADE,
 booking_item_id uuid NOT NULL REFERENCES hotel_booking_items(id), created_at timestamptz NOT NULL DEFAULT now()
);

-- Server-derived address only; administrative codes/destination relationship checked by shared registry in backend.
CREATE FUNCTION hotel_address_derive() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 NEW.full_address=concat_ws(', ',nullif(trim(concat_ws(' ',NEW.house_number,NEW.street_name)),''),nullif(NEW.ward_or_commune,''),nullif(NEW.administrative_area,''),NEW.province_or_city);
 NEW.normalized_address=hotel_normalize_vi(NEW.full_address); RETURN NEW;
END $$;
CREATE TRIGGER hotel_address_derive BEFORE INSERT OR UPDATE ON hotel_addresses FOR EACH ROW EXECUTE FUNCTION hotel_address_derive();
CREATE FUNCTION hotel_row_version() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='UPDATE' THEN NEW.version=OLD.version+1; ELSE NEW.version=1; END IF;
 NEW.updated_at=now(); RETURN NEW;
END $$;
CREATE FUNCTION hotel_child_revision() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE target uuid;
BEGIN
 IF TG_OP='DELETE' THEN target=OLD.place_id; ELSE target=NEW.place_id; END IF;
 IF TG_OP='UPDATE' AND NEW.place_id<>OLD.place_id THEN RAISE EXCEPTION 'HOTEL_CHILD_SCOPE_IMMUTABLE'; END IF;
 IF TG_ARGV[0]='content' THEN UPDATE hotel_profiles SET content_version=content_version+1 WHERE place_id=target;
 ELSE UPDATE hotel_profiles SET commercial_version=commercial_version+1 WHERE place_id=target; END IF;
 RETURN NULL;
END $$;
DO $$ DECLARE tab text;
BEGIN
 FOREACH tab IN ARRAY ARRAY['hotel_addresses','hotel_room_types','hotel_media','hotel_rate_plans','hotel_rate_calendar','hotel_room_inventory','hotel_promotions'] LOOP
  EXECUTE format('CREATE TRIGGER hotel_version BEFORE INSERT OR UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION hotel_row_version()',tab);
  EXECUTE format('CREATE TRIGGER hotel_revision AFTER INSERT OR UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION hotel_child_revision(%L)',tab,
    CASE WHEN tab IN ('hotel_addresses','hotel_room_types','hotel_media') THEN 'content' ELSE 'commercial' END);
 END LOOP;
END $$;
-- Profile content edits invalidate the old approved revision; approval itself does not create a content edit.
CREATE FUNCTION hotel_profile_revision() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF (to_jsonb(NEW)-ARRAY['content_version','approved_content_version','commercial_version','updated_at']) IS DISTINCT FROM
    (to_jsonb(OLD)-ARRAY['content_version','approved_content_version','commercial_version','updated_at']) THEN
  NEW.content_version=OLD.content_version+1;
 END IF; RETURN NEW;
END $$;
CREATE TRIGGER hotel_profile_revision BEFORE UPDATE ON hotel_profiles FOR EACH ROW EXECUTE FUNCTION hotel_profile_revision();

CREATE FUNCTION hotel_booking_identity_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM bookings b JOIN hotel_profiles h ON h.place_id=NEW.place_id
  WHERE b.id=NEW.booking_id AND b.place_id=NEW.place_id AND b.business_id=NEW.business_id AND h.business_id=NEW.business_id AND b.service_type='hotel') THEN
  RAISE EXCEPTION 'HOTEL_BOOKING_IDENTITY_MISMATCH';
 END IF;
 IF TG_OP='UPDATE' AND NEW IS DISTINCT FROM OLD THEN RAISE EXCEPTION 'HOTEL_BOOKING_SNAPSHOT_IMMUTABLE'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER hotel_booking_identity BEFORE INSERT OR UPDATE ON hotel_booking_stays FOR EACH ROW EXECUTE FUNCTION hotel_booking_identity_guard();
CREATE FUNCTION hotel_item_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'HOTEL_BOOKING_ITEM_IMMUTABLE'; END $$;
CREATE TRIGGER hotel_item_immutable BEFORE UPDATE ON hotel_booking_items FOR EACH ROW EXECUTE FUNCTION hotel_item_immutable();

-- Conditional row update serializes competing allocations. The Booking adapter must lock ALL dates in sorted order first.
CREATE FUNCTION hotel_allocate_inventory() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE item hotel_booking_items%ROWTYPE; stay hotel_booking_stays%ROWTYPE; booking_status text;
BEGIN
 IF TG_OP='DELETE' THEN
  IF OLD.state='ACTIVE' THEN RAISE EXCEPTION 'HOTEL_ACTIVE_ALLOCATION_DELETE_DENIED'; END IF;
  RETURN OLD;
 END IF;
 SELECT * INTO STRICT item FROM hotel_booking_items WHERE id=NEW.booking_item_id;
 SELECT * INTO STRICT stay FROM hotel_booking_stays WHERE booking_id=item.booking_id;
 SELECT b.booking_status::text INTO STRICT booking_status FROM bookings b WHERE b.id=item.booking_id FOR SHARE;
 IF NEW.quantity<>item.quantity OR NEW.stay_date<stay.check_in OR NEW.stay_date>=stay.check_out THEN RAISE EXCEPTION 'HOTEL_ALLOCATION_STAY_MISMATCH'; END IF;
 IF TG_OP='INSERT' THEN
  IF NEW.state<>'ACTIVE' OR booking_status NOT IN ('PENDING','CONFIRMED') THEN RAISE EXCEPTION 'HOTEL_ALLOCATION_STATE_INVALID'; END IF;
  UPDATE hotel_room_inventory SET allocated_quantity=allocated_quantity+NEW.quantity
   WHERE room_type_id=NEW.room_type_id AND stay_date=NEW.stay_date AND NOT closed AND sellable_quantity-allocated_quantity>=NEW.quantity;
  IF NOT FOUND THEN RAISE EXCEPTION 'HOTEL_INVENTORY_UNAVAILABLE'; END IF;
 ELSE
  IF (NEW.id,NEW.booking_item_id,NEW.room_type_id,NEW.stay_date,NEW.quantity) IS DISTINCT FROM (OLD.id,OLD.booking_item_id,OLD.room_type_id,OLD.stay_date,OLD.quantity) THEN RAISE EXCEPTION 'HOTEL_ALLOCATION_IDENTITY_IMMUTABLE'; END IF;
  IF NEW.state IS DISTINCT FROM OLD.state THEN
   IF OLD.state<>'ACTIVE' OR NEW.state<>'RELEASED' OR booking_status NOT IN ('CANCELLED','REJECTED') THEN RAISE EXCEPTION 'HOTEL_ALLOCATION_RELEASE_DENIED'; END IF;
   UPDATE hotel_room_inventory SET allocated_quantity=allocated_quantity-OLD.quantity WHERE room_type_id=OLD.room_type_id AND stay_date=OLD.stay_date AND allocated_quantity>=OLD.quantity;
   IF NOT FOUND THEN RAISE EXCEPTION 'HOTEL_ALLOCATION_COUNTER_MISMATCH'; END IF;
  ELSIF NEW IS DISTINCT FROM OLD THEN RAISE EXCEPTION 'HOTEL_ALLOCATION_IMMUTABLE'; END IF;
 END IF; RETURN NEW;
END $$;
CREATE TRIGGER hotel_allocate_inventory BEFORE INSERT OR UPDATE OR DELETE ON hotel_room_allocations FOR EACH ROW EXECUTE FUNCTION hotel_allocate_inventory();

-- Deferred check rejects partial-night reservations at commit, including an item with no allocation rows.
CREATE FUNCTION hotel_all_nights_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE item_id uuid; item hotel_booking_items%ROWTYPE; stay hotel_booking_stays%ROWTYPE; booking_status text; covered integer;
BEGIN
 IF TG_TABLE_NAME='hotel_booking_items' THEN item_id=NEW.id;
 ELSIF TG_OP='DELETE' THEN item_id=OLD.booking_item_id; ELSE item_id=NEW.booking_item_id; END IF;
 SELECT * INTO item FROM hotel_booking_items WHERE id=item_id; IF NOT FOUND THEN RETURN NULL; END IF;
 SELECT * INTO STRICT stay FROM hotel_booking_stays WHERE booking_id=item.booking_id;
 SELECT b.booking_status::text INTO STRICT booking_status FROM bookings b WHERE b.id=item.booking_id;
 SELECT count(*) INTO covered FROM hotel_room_allocations WHERE booking_item_id=item_id AND state='ACTIVE';
 IF booking_status IN ('PENDING','CONFIRMED','COMPLETED') AND covered<>stay.check_out-stay.check_in THEN RAISE EXCEPTION 'HOTEL_ALLOCATION_ALL_NIGHTS_REQUIRED'; END IF;
 IF booking_status IN ('CANCELLED','REJECTED') AND covered<>0 THEN RAISE EXCEPTION 'HOTEL_CANCEL_ALLOCATION_NOT_RELEASED'; END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER hotel_item_all_nights AFTER INSERT ON hotel_booking_items DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION hotel_all_nights_guard();
CREATE CONSTRAINT TRIGGER hotel_allocation_all_nights AFTER INSERT OR UPDATE OR DELETE ON hotel_room_allocations DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION hotel_all_nights_guard();
CREATE FUNCTION hotel_booking_complete_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE target uuid; stay hotel_booking_stays%ROWTYPE; item_count integer; items_total numeric; broken integer;
BEGIN
 IF TG_TABLE_NAME='bookings' THEN target=NEW.id; ELSE target=NEW.booking_id; END IF;
 SELECT * INTO stay FROM hotel_booking_stays WHERE booking_id=target; IF NOT FOUND THEN RETURN NULL; END IF;
 SELECT count(*),sum(total_vnd) INTO item_count,items_total FROM hotel_booking_items WHERE booking_id=target;
 IF item_count=0 OR items_total<>stay.total_vnd THEN RAISE EXCEPTION 'HOTEL_BOOKING_TOTAL_OR_ITEMS_MISMATCH'; END IF;
 SELECT count(*) INTO broken FROM hotel_booking_items i JOIN bookings b ON b.id=i.booking_id
 WHERE i.booking_id=target AND (jsonb_array_length(i.occupancy)<>i.quantity OR
  (SELECT count(*) FROM hotel_room_allocations a WHERE a.booking_item_id=i.id AND a.state='ACTIVE') <>
   CASE WHEN b.booking_status IN ('CANCELLED','REJECTED') THEN 0 ELSE stay.check_out-stay.check_in END);
 IF broken>0 THEN RAISE EXCEPTION 'HOTEL_BOOKING_ALLOCATION_INCOMPLETE'; END IF;
 IF NOT EXISTS(SELECT 1 FROM bookings b WHERE b.id=target AND b.place_id=stay.place_id AND b.business_id=stay.business_id AND b.service_type='hotel' AND b.total_amount=stay.total_vnd) THEN
  RAISE EXCEPTION 'HOTEL_BOOKING_EXISTING_TOTAL_OR_IDENTITY_MISMATCH';
 END IF; RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER hotel_stay_complete AFTER INSERT OR UPDATE ON hotel_booking_stays DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION hotel_booking_complete_guard();
CREATE CONSTRAINT TRIGGER hotel_items_complete AFTER INSERT OR UPDATE ON hotel_booking_items DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION hotel_booking_complete_guard();
CREATE CONSTRAINT TRIGGER hotel_existing_booking_complete AFTER UPDATE ON bookings DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION hotel_booking_complete_guard();
CREATE FUNCTION hotel_review_attribution_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM reviews r JOIN hotel_booking_items i ON i.id=NEW.booking_item_id
  JOIN hotel_booking_stays s ON s.booking_id=i.booking_id JOIN bookings b ON b.id=s.booking_id
  WHERE r.id=NEW.review_id AND r.booking_id=b.id AND r.user_id=b.user_id AND r.target_type IN ('place','hotel')
    AND r.target_id=i.place_id::text AND b.booking_status='COMPLETED' AND s.check_out<=(now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date) THEN
  RAISE EXCEPTION 'HOTEL_REVIEW_STAY_NOT_VERIFIED';
 END IF; RETURN NEW;
END $$;
CREATE TRIGGER hotel_review_attribution BEFORE INSERT OR UPDATE ON hotel_review_stays FOR EACH ROW EXECUTE FUNCTION hotel_review_attribution_guard();
COMMENT ON TABLE hotel_review_stays IS 'Attribution only. Existing ReviewService eligibility, moderation, consent and ReviewInsightService remain authoritative.';
COMMENT ON TABLE hotel_profiles IS 'Feature OFF until migration, publication adapter, canonical Place projection and legacy Booking bypass protection are accepted.';
