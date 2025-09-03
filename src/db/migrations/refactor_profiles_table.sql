-- Migration: Refactor profiles table to simplify by removing triggers
-- Created: 2024-01-01
-- Description: Simplifies the profiles table by using constraints instead of triggers

-- Step 1: Drop existing triggers on profiles table
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
DROP TRIGGER IF EXISTS enforce_profile_name_uniqueness_trigger ON profiles;

-- Step 2: Drop the old case-insensitive index (we'll create a unique one)
DROP INDEX IF EXISTS idx_profiles_name_case_insensitive;

-- Step 3: Add a generated column for lowercase name (for unique constraint)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS name_lower VARCHAR(100) GENERATED ALWAYS AS (LOWER(name)) STORED;

-- Step 4: Add unique constraint on user_id and name_lower
ALTER TABLE profiles 
ADD CONSTRAINT unique_user_profile_name_case_insensitive 
UNIQUE (user_id, name_lower);

-- Step 5: Update parental_pin column to parental_pin_hash (following security rules)
ALTER TABLE profiles 
RENAME COLUMN parental_pin TO parental_pin_hash;

-- Step 6: Update the column to store longer hash values (bcrypt hashes are ~60 chars)
ALTER TABLE profiles 
ALTER COLUMN parental_pin_hash TYPE VARCHAR(255);

-- Step 7: Make updated_at optional with a default that updates automatically
-- Note: Using a DEFAULT with CURRENT_TIMESTAMP on UPDATE is not directly supported in PostgreSQL
-- So we'll keep it simple - apps can update this manually if needed
ALTER TABLE profiles 
ALTER COLUMN updated_at DROP NOT NULL,
ALTER COLUMN updated_at SET DEFAULT NULL;

-- Step 8: Add helpful comment to the table
COMMENT ON TABLE profiles IS 'User profiles with case-insensitive unique names per user';
COMMENT ON COLUMN profiles.name_lower IS 'Generated column for case-insensitive uniqueness';
COMMENT ON COLUMN profiles.parental_pin_hash IS 'BCrypt hash of the parental control PIN';

-- Step 9: Recreate performance indexes
CREATE INDEX idx_profiles_user_active ON profiles(user_id) WHERE is_active = true;
CREATE INDEX idx_profiles_user_id ON profiles(user_id);

-- Step 10: Add a check constraint to ensure name is not empty
ALTER TABLE profiles 
ADD CONSTRAINT check_profile_name_not_empty 
CHECK (LENGTH(TRIM(name)) > 0);