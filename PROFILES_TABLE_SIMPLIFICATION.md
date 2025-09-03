# Profiles Table Simplification

This document explains the simplification of the `profiles` table to remove triggers and use native PostgreSQL features instead.

## Summary of Changes

### Before (Original Schema)
- Used triggers for:
  - Enforcing case-insensitive profile name uniqueness
  - Automatically updating `updated_at` timestamp
- Stored parental PIN as plain text (security issue)
- Required custom trigger functions and maintenance

### After (Simplified Schema)
- Uses PostgreSQL generated columns for case-insensitive comparison
- Uses unique constraints instead of triggers
- Stores parental PIN as bcrypt hash (security compliant)
- Optional `updated_at` field (application-managed)
- Better performance and simpler maintenance

## Key Changes

### 1. Case-Insensitive Profile Names
**Before:**
```sql
-- Trigger function
CREATE FUNCTION enforce_profile_name_uniqueness() ...
-- Trigger
CREATE TRIGGER enforce_profile_name_uniqueness_trigger ...
```

**After:**
```sql
-- Generated column
name_lower VARCHAR(100) GENERATED ALWAYS AS (LOWER(name)) STORED,
-- Unique constraint
CONSTRAINT unique_user_profile_name_case_insensitive UNIQUE (user_id, name_lower)
```

### 2. Parental PIN Security
**Before:**
```sql
parental_pin VARCHAR(4)  -- Plain text (security violation)
```

**After:**
```sql
parental_pin_hash VARCHAR(255)  -- BCrypt hash (security compliant)
```

### 3. Updated Timestamp
**Before:**
```sql
-- Automatic via trigger
updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
CREATE TRIGGER update_profiles_updated_at ...
```

**After:**
```sql
-- Optional, application-managed
updated_at TIMESTAMP DEFAULT NULL
```

## Benefits

1. **Performance**: Constraints are faster than triggers
2. **Simplicity**: No custom functions to maintain
3. **Security**: Follows best practices for PIN storage
4. **Reliability**: Uses native PostgreSQL features
5. **Maintainability**: Easier to understand and debug

## Migration Steps

1. Apply the forward migration:
   ```bash
   psql -d syncstream_db -f src/db/migrations/refactor_profiles_table.sql
   ```

2. Update application code to:
   - Hash parental PINs before storing
   - Use bcrypt.compare() for PIN validation
   - Manually update `updated_at` when needed
   - Handle the new constraint error names

3. If rollback is needed:
   ```bash
   psql -d syncstream_db -f src/db/migrations/rollback_profiles_table_refactor.sql
   ```

## Application Code Updates Required

### Profile Creation
```javascript
// Before
parental_pin: parental_pin || null

// After
parental_pin_hash: parental_pin ? await bcrypt.hash(parental_pin, 10) : null
```

### PIN Validation
```javascript
// Before
if (body.pin !== profile.parental_pin)

// After
const isPinValid = await bcrypt.compare(body.pin, profile.parental_pin_hash);
if (!isPinValid)
```

### Error Handling
```javascript
// Handle new constraint name
if (err.constraint === 'unique_user_profile_name_case_insensitive') {
    throw new Error('A profile with this name already exists');
}
```

## Testing

Run the test script to verify the new schema:
```bash
psql -d test_db -f src/db/test_simplified_profiles.sql
```

## Performance Impact

The simplified schema provides:
- Faster INSERT/UPDATE operations (no trigger overhead)
- Better query performance with generated column index
- Reduced database CPU usage
- Simpler query plans

## Compatibility

- Requires PostgreSQL 12+ for generated columns
- Backward compatible with existing data
- No breaking changes to API responses