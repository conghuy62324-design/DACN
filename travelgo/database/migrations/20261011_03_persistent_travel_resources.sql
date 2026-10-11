-- HuGo Travel Phase 3: persistent resources, moderation and booking state history.
-- Additive/idempotent migration. Existing customer content is preserved as APPROVED.
BEGIN;

ALTER TABLE places ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES businesses(id) ON DELETE SET NULL;
ALTER TABLE places ADD COLUMN IF NOT EXISTS district VARCHAR(120);
ALTER TABLE places ADD COLUMN IF NOT EXISTS opening_hours JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE places ADD COLUMN IF NOT EXISTS contact_info JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE places ADD COLUMN IF NOT EXISTS status VARCHAR(30) NOT NULL DEFAULT 'APPROVED';
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'places_status_check') THEN
    ALTER TABLE places ADD CONSTRAINT places_status_check CHECK (status IN ('DRAFT','PENDING','APPROVED','REJECTED','SUSPENDED'));
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_places_business_status ON places(business_id, status);
CREATE INDEX IF NOT EXISTS idx_places_status_created ON places(status, created_at DESC);

CREATE TABLE IF NOT EXISTS tours (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE RESTRICT,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    destination_city VARCHAR(120) NOT NULL,
    departure_city VARCHAR(120) NOT NULL,
    duration_days INTEGER NOT NULL CHECK (duration_days > 0),
    duration_nights INTEGER NOT NULL DEFAULT 0 CHECK (duration_nights >= 0),
    category VARCHAR(30) NOT NULL CHECK (category IN ('beach','culture','nature','resort','adventure')),
    summary TEXT NOT NULL,
    description TEXT NOT NULL,
    meeting_point TEXT,
    hero_image TEXT NOT NULL,
    gallery_images JSONB NOT NULL DEFAULT '[]'::jsonb,
    price_vnd NUMERIC(15,2) NOT NULL CHECK (price_vnd >= 0),
    capacity INTEGER NOT NULL DEFAULT 1 CHECK (capacity >= 0),
    available_capacity INTEGER NOT NULL DEFAULT 1 CHECK (available_capacity >= 0),
    rating NUMERIC(3,2) NOT NULL DEFAULT 0,
    review_count INTEGER NOT NULL DEFAULT 0,
    inclusions JSONB NOT NULL DEFAULT '[]'::jsonb,
    exclusions JSONB NOT NULL DEFAULT '[]'::jsonb,
    highlights JSONB NOT NULL DEFAULT '[]'::jsonb,
    itinerary_days JSONB NOT NULL DEFAULT '[]'::jsonb,
    start_date DATE,
    end_date DATE,
    is_template BOOLEAN NOT NULL DEFAULT false,
    status VARCHAR(30) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','PENDING','APPROVED','REJECTED','SUSPENDED')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (available_capacity <= capacity),
    CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date)
);
CREATE INDEX IF NOT EXISTS idx_tours_business_status ON tours(business_id, status);
CREATE INDEX IF NOT EXISTS idx_tours_status_created ON tours(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tours_destination ON tours(destination_city);

CREATE TABLE IF NOT EXISTS tour_places (
    tour_id UUID NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
    place_id UUID NOT NULL REFERENCES places(id) ON DELETE RESTRICT,
    day_number INTEGER,
    sort_order INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (tour_id, place_id)
);
CREATE INDEX IF NOT EXISTS idx_tour_places_place ON tour_places(place_id);

ALTER TABLE tickets ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES businesses(id) ON DELETE RESTRICT;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS place_id UUID REFERENCES places(id) ON DELETE SET NULL;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS tour_id UUID REFERENCES tours(id) ON DELETE SET NULL;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS capacity INTEGER NOT NULL DEFAULT 50;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS valid_from TIMESTAMP WITH TIME ZONE;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS valid_until TIMESTAMP WITH TIME ZONE;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE';
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tickets_status_check') THEN
    ALTER TABLE tickets ADD CONSTRAINT tickets_status_check CHECK (status IN ('ACTIVE','INACTIVE'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tickets_capacity_check') THEN
    ALTER TABLE tickets ADD CONSTRAINT tickets_capacity_check CHECK (capacity >= 0 AND available_seats >= 0 AND available_seats <= capacity);
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_tickets_business_status ON tickets(business_id, status);
CREATE INDEX IF NOT EXISTS idx_tickets_place ON tickets(place_id);
CREATE INDEX IF NOT EXISTS idx_tickets_tour ON tickets(tour_id);

ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES businesses(id) ON DELETE SET NULL;
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS status VARCHAR(30) NOT NULL DEFAULT 'APPROVED';
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'blog_posts_status_check') THEN
    ALTER TABLE blog_posts ADD CONSTRAINT blog_posts_status_check CHECK (status IN ('DRAFT','PENDING','APPROVED','REJECTED','SUSPENDED'));
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_blog_posts_business_status ON blog_posts(business_id, status);
CREATE INDEX IF NOT EXISTS idx_blog_posts_status_created ON blog_posts(status, created_at DESC);

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS place_id UUID REFERENCES places(id) ON DELETE SET NULL;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS tour_id UUID REFERENCES tours(id) ON DELETE SET NULL;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS ticket_id UUID REFERENCES tickets(id) ON DELETE SET NULL;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS quantity INTEGER NOT NULL DEFAULT 1;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(15,2) NOT NULL DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(120);
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_booking_status_check;
UPDATE bookings SET booking_status = UPPER(booking_status)
WHERE booking_status IN ('pending','confirmed','cancelled','completed','rejected');
ALTER TABLE bookings ALTER COLUMN booking_status SET DEFAULT 'PENDING';
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bookings_status_phase3_check') THEN
    ALTER TABLE bookings ADD CONSTRAINT bookings_status_phase3_check CHECK (booking_status IN ('PENDING','CONFIRMED','CANCELLED','COMPLETED','REJECTED'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bookings_quantity_check') THEN
    ALTER TABLE bookings ADD CONSTRAINT bookings_quantity_check CHECK (quantity > 0 AND unit_price >= 0 AND total_amount >= 0 AND discount_amount >= 0);
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_bookings_status_created ON bookings(booking_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_ticket ON bookings(ticket_id);
CREATE INDEX IF NOT EXISTS idx_bookings_tour ON bookings(tour_id);
CREATE INDEX IF NOT EXISTS idx_bookings_place ON bookings(place_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_user_idempotency ON bookings(user_id, idempotency_key) WHERE idempotency_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS booking_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    old_status VARCHAR(30),
    new_status VARCHAR(30) NOT NULL,
    actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_booking_history_booking_created ON booking_status_history(booking_id, created_at DESC);

CREATE TABLE IF NOT EXISTS trip_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    destination_city VARCHAR(120) NOT NULL,
    departure_city VARCHAR(120) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    days_count INTEGER NOT NULL CHECK (days_count > 0),
    total_budget_vnd NUMERIC(15,2) NOT NULL DEFAULT 0,
    estimated_cost_vnd NUMERIC(15,2) NOT NULL DEFAULT 0,
    actual_spent_vnd NUMERIC(15,2) NOT NULL DEFAULT 0,
    pacing VARCHAR(20) NOT NULL DEFAULT 'balanced' CHECK (pacing IN ('relaxed','balanced','packed')),
    status VARCHAR(20) NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming','active','completed','cancelled')),
    preferences JSONB NOT NULL DEFAULT '[]'::jsonb,
    itinerary JSONB NOT NULL DEFAULT '[]'::jsonb,
    selected_place_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    selected_tour_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    checkins JSONB NOT NULL DEFAULT '[]'::jsonb,
    progress_percent INTEGER NOT NULL DEFAULT 0 CHECK (progress_percent BETWEEN 0 AND 100),
    notes TEXT,
    is_public BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (end_date >= start_date)
);
CREATE INDEX IF NOT EXISTS idx_trip_sessions_user_created ON trip_sessions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trip_sessions_user_status ON trip_sessions(user_id, status);

COMMIT;
