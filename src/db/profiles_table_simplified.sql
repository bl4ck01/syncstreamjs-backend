-- Simplified Profiles Table Schema (After Migration)
-- This removes the need for triggers by using constraints and generated columns

CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL CHECK (LENGTH(TRIM(name)) > 0),
    name_lower VARCHAR(100) GENERATED ALWAYS AS (LOWER(name)) STORED,
    avatar_url VARCHAR(500),
    parental_pin_hash VARCHAR(255), -- BCrypt hash of the parental PIN
    is_kids_profile BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT NULL, -- Optional, can be updated manually by the app
    
    -- Unique constraint for case-insensitive profile names per user
    CONSTRAINT unique_user_profile_name_case_insensitive UNIQUE (user_id, name_lower)
);

-- Indexes for performance
CREATE INDEX idx_profiles_user_id ON profiles(user_id);
CREATE INDEX idx_profiles_user_active ON profiles(user_id) WHERE is_active = true;

-- Comments for documentation
COMMENT ON TABLE profiles IS 'User profiles with case-insensitive unique names per user';
COMMENT ON COLUMN profiles.name IS 'Profile display name';
COMMENT ON COLUMN profiles.name_lower IS 'Generated column for case-insensitive uniqueness (auto-populated)';
COMMENT ON COLUMN profiles.parental_pin_hash IS 'BCrypt hash of the 4-digit parental control PIN';
COMMENT ON COLUMN profiles.updated_at IS 'Optional timestamp, can be manually updated by the application';

-- Benefits of this approach:
-- 1. No triggers needed for case-insensitive uniqueness
-- 2. Uses native PostgreSQL features (generated columns, unique constraints)
-- 3. Better performance - constraints are faster than triggers
-- 4. Simpler to understand and maintain
-- 5. Follows security best practices by storing PIN as hash
-- 6. updated_at is optional, reducing complexity