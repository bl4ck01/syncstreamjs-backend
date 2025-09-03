-- Test script for the simplified profiles table
-- This script tests the new schema features

-- Create a test database (run as superuser)
-- CREATE DATABASE test_profiles_simplified;

-- Connect to the test database and run this script

-- Create the simplified profiles table
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    name VARCHAR(100) NOT NULL CHECK (LENGTH(TRIM(name)) > 0),
    name_lower VARCHAR(100) GENERATED ALWAYS AS (LOWER(name)) STORED,
    avatar_url VARCHAR(500),
    parental_pin_hash VARCHAR(255),
    is_kids_profile BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT NULL,
    
    CONSTRAINT unique_user_profile_name_case_insensitive UNIQUE (user_id, name_lower)
);

-- Test 1: Insert profiles with different case names for same user
BEGIN;
INSERT INTO profiles (user_id, name) VALUES 
    ('11111111-1111-1111-1111-111111111111', 'John'),
    ('11111111-1111-1111-1111-111111111111', 'Alice');
    
-- This should fail due to case-insensitive constraint
-- INSERT INTO profiles (user_id, name) VALUES 
--     ('11111111-1111-1111-1111-111111111111', 'JOHN');
    
ROLLBACK;

-- Test 2: Verify generated column works
BEGIN;
INSERT INTO profiles (user_id, name) VALUES 
    ('22222222-2222-2222-2222-222222222222', 'TestProfile');
    
SELECT name, name_lower FROM profiles WHERE user_id = '22222222-2222-2222-2222-222222222222';
-- Expected: name = 'TestProfile', name_lower = 'testprofile'

ROLLBACK;

-- Test 3: Empty name check
BEGIN;
-- This should fail due to CHECK constraint
-- INSERT INTO profiles (user_id, name) VALUES 
--     ('33333333-3333-3333-3333-333333333333', '   ');
ROLLBACK;

-- Test 4: Multiple users can have same profile name
BEGIN;
INSERT INTO profiles (user_id, name) VALUES 
    ('44444444-4444-4444-4444-444444444444', 'Default'),
    ('55555555-5555-5555-5555-555555555555', 'Default');
-- This should succeed

SELECT user_id, name FROM profiles WHERE name = 'Default';
ROLLBACK;

-- Test 5: Verify no triggers are needed
SELECT 
    trigger_name,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'profiles';
-- Expected: No results (or only triggers not related to our constraints)

-- Test 6: Performance comparison (simplified version should be faster)
-- Create sample data
BEGIN;
INSERT INTO profiles (user_id, name, parental_pin_hash)
SELECT 
    gen_random_uuid(),
    'Profile_' || generate_series,
    CASE WHEN random() > 0.5 THEN '$2b$10$CRO86EoArr4y2wX1LeMmJO17lJT/xOf73iBVpMpYV5d1FGcSU9oH6' ELSE NULL END
FROM generate_series(1, 1000);

-- Test query performance
EXPLAIN ANALYZE
SELECT * FROM profiles 
WHERE user_id = (SELECT user_id FROM profiles LIMIT 1)
AND LOWER(name) = 'profile_500';

ROLLBACK;

-- Clean up
DROP TABLE IF EXISTS profiles;