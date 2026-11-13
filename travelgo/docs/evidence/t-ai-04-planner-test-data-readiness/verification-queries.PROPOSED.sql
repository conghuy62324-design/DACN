-- PROPOSED_NOT_EXECUTED: review templates; placeholders require bound parameters.
-- Use exact test identity/sentinel and session READ ONLY before these checks.
SELECT current_database(),current_user,current_setting('transaction_read_only');
SELECT shobj_description(oid,'pg_database') AS sentinel FROM pg_database WHERE datname=current_database();
SELECT id,slug,status,category,city,province,business_id,price_from,latitude,longitude FROM places WHERE id IN (:approved_fixture_ids) OR slug IN (:approved_fixture_slugs);
SELECT p.id,p.name,p.category,p.city,p.province,p.status,b.status AS business_status FROM places p LEFT JOIN businesses b ON b.id=p.business_id WHERE p.status='APPROVED' AND (p.business_id IS NULL OR b.status='ACTIVE');
SELECT conname,conrelid::regclass::text,pg_get_constraintdef(oid) FROM pg_constraint WHERE contype='f' AND confrelid='public.places'::regclass;
SELECT count(*) AS ref_count FROM tour_places WHERE place_id IN (:approved_fixture_ids);
SELECT count(*) AS ref_count FROM bookings WHERE place_id IN (:approved_fixture_ids);
SELECT count(*) AS ref_count FROM tickets WHERE place_id IN (:approved_fixture_ids);
SELECT count(*) AS ref_count FROM blog_posts WHERE place_id IN (:approved_fixture_ids);
SELECT count(*) AS ref_count FROM user_favorites WHERE place_id IN (:approved_fixture_ids);
-- Repeat bound LIKE pattern for EVERY committed fixture UUID, for both JSON columns.
SELECT count(*) AS ref_count FROM trip_sessions WHERE selected_place_ids::text LIKE :fixture_uuid_pattern OR itinerary::text LIKE :fixture_uuid_pattern;
SELECT count(*) AS rows,coalesce(string_agg(md5(to_jsonb(t)::text),',' ORDER BY md5(to_jsonb(t)::text)),'') AS row_hashes FROM public.places t WHERE id NOT IN (:approved_fixture_ids);
-- Hash row_hashes with SHA256 in harness; repeat baseline expression for all25 public tables.
