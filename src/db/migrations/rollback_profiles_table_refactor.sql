-- Rollback Migration: Restore original profiles table structure
-- Created: 2024-01-01
-- Description: Reverts the profiles table simplification if needed

-- Step 1: Drop the new constraints
ALTER TABLE profiles 
DROP CONSTRAINT IF EXISTS unique_user_profile_name_case_insensitive;

ALTER TABLE profiles 
DROP CONSTRAINT IF EXISTS check_profile_name_not_empty;

-- Step 2: Drop the generated column
ALTER TABLE profiles 
DROP COLUMN IF EXISTS name_lower;

-- Step 3: Rename parental_pin_hash back to parental_pin
ALTER TABLE profiles 
RENAME COLUMN parental_pin_hash TO parental_pin;

-- Step 4: Restore the original column type for parental_pin
ALTER TABLE profiles 
ALTER COLUMN parental_pin TYPE VARCHAR(4);

-- Step 5: Make updated_at NOT NULL again with default
ALTER TABLE profiles 
ALTER COLUMN updated_at SET NOT NULL,
ALTER COLUMN updated_at SET DEFAULT CURRENT_TIMESTAMP;

-- Step 6: Recreate the original index
CREATE INDEX IF NOT EXISTS idx_profiles_name_case_insensitive ON profiles(user_id, LOWER(name));

-- Step 7: Recreate the trigger function for profile name uniqueness
CREATE OR REPLACE FUNCTION enforce_profile_name_uniqueness()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if a profile with the same name (case-insensitive) already exists for this user
    IF EXISTS (
        SELECT 1 FROM profiles 
        WHERE user_id = NEW.user_id 
        AND LOWER(name) = LOWER(NEW.name) 
        AND id != NEW.id
    ) THEN
        RAISE EXCEPTION 'Profile name "%" already exists for this user (case-insensitive)', NEW.name;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 8: Recreate the triggers
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER enforce_profile_name_uniqueness_trigger
    BEFORE INSERT OR UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION enforce_profile_name_uniqueness();

-- Step 9: Remove comments
COMMENT ON TABLE profiles IS NULL;
COMMENT ON COLUMN profiles.parental_pin IS NULL;