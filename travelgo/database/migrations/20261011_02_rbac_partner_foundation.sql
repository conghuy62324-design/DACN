-- HuGo Travel: additive RBAC and partner foundation migration.
-- Safe to re-run. No existing rows or columns are removed.
BEGIN;

CREATE TABLE IF NOT EXISTS user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(30) NOT NULL CHECK (role IN ('CUSTOMER', 'PARTNER', 'SUPER_ADMIN')),
    granted_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, role)
);

INSERT INTO user_roles (user_id, role)
SELECT id,
       CASE role
           WHEN 'admin' THEN 'SUPER_ADMIN'
           WHEN 'partner' THEN 'PARTNER'
           ELSE 'CUSTOMER'
       END
FROM users
ON CONFLICT (user_id, role) DO NOTHING;

-- Every account remains a customer even when it also has elevated roles.
INSERT INTO user_roles (user_id, role)
SELECT id, 'CUSTOMER' FROM users
ON CONFLICT (user_id, role) DO NOTHING;

CREATE TABLE IF NOT EXISTS partner_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    representative_name VARCHAR(120) NOT NULL,
    business_name VARCHAR(255) NOT NULL,
    business_type VARCHAR(30) NOT NULL CHECK (business_type IN ('HOTEL', 'HOMESTAY', 'RESORT', 'RESTAURANT', 'TOUR_OPERATOR')),
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(120) NOT NULL,
    latitude NUMERIC(10, 7),
    longitude NUMERIC(10, 7),
    image_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
    verification_details JSONB NOT NULL DEFAULT '{}'::jsonb,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'NEEDS_MORE_INFO', 'SUSPENDED')),
    decision_reason TEXT,
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_partner_applications_one_active
    ON partner_applications(user_id)
    WHERE status IN ('PENDING', 'NEEDS_MORE_INFO');
CREATE INDEX IF NOT EXISTS idx_partner_applications_status_created
    ON partner_applications(status, created_at DESC);

CREATE TABLE IF NOT EXISTS businesses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(30) NOT NULL CHECK (type IN ('HOTEL', 'HOMESTAY', 'RESORT', 'RESTAURANT', 'TOUR_OPERATOR')),
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(120) NOT NULL,
    latitude NUMERIC(10, 7),
    longitude NUMERIC(10, 7),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_businesses_type_status ON businesses(type, status);

CREATE TABLE IF NOT EXISTS business_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    permissions JSONB NOT NULL DEFAULT '["MANAGE_BUSINESS", "MANAGE_BOOKINGS"]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (business_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_business_members_user ON business_members(user_id);

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id VARCHAR(100) NOT NULL,
    previous_data JSONB,
    new_data JSONB,
    reason TEXT,
    ip_address VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_user_id, created_at DESC);

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES businesses(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_business_created ON bookings(business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_user_created ON bookings(user_id, created_at DESC);

COMMIT;
