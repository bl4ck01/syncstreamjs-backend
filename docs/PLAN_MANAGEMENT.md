# Plan Management Guide

This document explains how to manage subscription plans in SyncStream TV, including editing plans, updating Stripe integration, and executing the necessary scripts.

## 📋 Table of Contents

- [Overview](#overview)
- [Plan Structure](#plan-structure)
- [Editing Plans](#editing-plans)
- [Scripts and Commands](#scripts-and-commands)
- [Migration Guide](#migration-guide)
- [Troubleshooting](#troubleshooting)

## 🎯 Overview

SyncStream TV uses a structured plan system with three tiers: **Basic**, **Pro**, and **Ultimate**. Each plan has specific features, limits, and pricing that can be managed through both the database and Stripe integration.

## 📊 Plan Structure

### Current Plans

| Plan | Monthly Price | Annual Price | Profiles | Playlists | Key Features |
|------|---------------|--------------|----------|-----------|--------------|
| **Basic** | $4.99 | $49.99 | 3 | 2 | Essential features, 1 screen |
| **Pro** | $9.99 | $99.99 | 6 | 5 | Advanced features, 2 screens |
| **Ultimate** | $14.99 | $149.99 | Unlimited | Unlimited | All features, 5 screens |

### Feature Matrix

| Feature | Basic | Pro | Ultimate |
|---------|-------|-----|----------|
| Cine Party (Watch Party) | ❌ | ✅ | ✅ |
| Cine Party with Voice Chat | ❌ | ❌ | ✅ |
| Sync Data Across Devices | ✅ | ✅ | ✅ |
| Record Live TV | ❌ | ✅ | ✅ |
| Download for Offline Viewing | ❌ | ✅ | ✅ |
| Parental Controls | ✅ | ✅ | ✅ |
| Multi-Screen Viewing | 1 | 2 | 5 |
| Support Level | Email | Email & Chat | 24/7 Priority |
| Free Trial | 3 Days | 3 Days | 3 Days |

## ✏️ Editing Plans

### 1. Database Schema Changes

To modify plan features or limits, update the database schema in `api/src/db/schema.sql`:

```sql
-- Example: Adding a new feature column
ALTER TABLE plans ADD COLUMN new_feature BOOLEAN DEFAULT FALSE;

-- Example: Modifying existing limits
UPDATE plans SET max_profiles = 5 WHERE name = 'Basic';
```

### 2. Plan Data Updates

Update the default plan data in `api/src/db/schema.sql`:

```sql
-- Update existing plans
UPDATE plans SET 
    price_monthly = 5.99,
    max_profiles = 4,
    new_feature = true
WHERE name = 'Basic';

-- Add new plans
INSERT INTO plans (
    name, stripe_price_id, stripe_price_id_annual,
    price_monthly, price_annual, max_profiles, max_playlists,
    max_favorites, trial_days, cine_party, cine_party_voice_chat,
    sync_data_across_devices, record_live_tv, download_offline_viewing,
    parental_controls, multi_screen_viewing, support_level
) VALUES (
    'New Plan', 'price_new_monthly', 'price_new_annual',
    7.99, 79.99, 4, 3, -1, 3, true, false, true,
    true, true, true, 2, 'email_chat'
);
```

### 3. Backend Code Updates

When adding new features, update these files:

#### Schema Validation (`api/src/utils/schemas.js`)
```javascript
export const createPlanSchema = t.Object({
    // ... existing fields
    new_feature: t.Optional(t.Boolean()),
});
```

#### Subscription Routes (`api/src/routes/subscriptions.js`)
```javascript
// Add new feature to queries
SELECT 
    // ... existing fields
    p.new_feature
FROM subscriptions s
JOIN plans p ON s.plan_id = p.id
```

#### Email Service (`api/src/services/email.js`)
```javascript
// Add feature to email template
if (plan.new_feature) features.push('New Feature Description');
```

#### Optimization Middleware (`api/src/middleware/optimization.js`)
```javascript
// Add to plan object
plan: {
    // ... existing fields
    new_feature: plan.new_feature
}
```

## 🛠️ Scripts and Commands

### Available Scripts

| Script | Command | Purpose |
|--------|---------|---------|
| **Stripe Sync** | `bun run stripe:sync` | Create/update plans in Stripe |
| **Database Migration** | `bun run db:migrate` | Run standard database migrations |
| **Development** | `bun run dev` | Start development server |
| **Production** | `bun run start` | Start production server |

### Step-by-Step Plan Update Process

#### 1. **Update Database Schema**
```bash
# Navigate to the project directory
cd /path/to/syncstreamjs-backend

# Edit the schema file
nano api/src/db/schema.sql

# Run migration if schema changed
bun run db:migrate
```

#### 2. **Update Backend Code**
```bash
# Update validation schemas
nano api/src/utils/schemas.js

# Update subscription routes
nano api/src/routes/subscriptions.js

# Update email service
nano api/src/services/email.js

# Update optimization middleware
nano api/src/middleware/optimization.js
```

#### 3. **Sync with Stripe**
```bash
# Create/update plans in Stripe
bun run stripe:sync
```

#### 4. **Test Changes**
```bash
# Start development server
bun run dev

# Test endpoints
curl http://localhost:3000/api/v1/subscriptions/plans/public
```

## 🔄 Migration Guide

### From Old Plan Structure

If migrating from the old plan structure with JSONB features:

1. **Run Database Migration**:
   ```bash
   bun run db:migrate
   ```

2. **Verify Migration**:
   ```sql
   -- Check new columns exist
   SELECT column_name FROM information_schema.columns 
   WHERE table_name = 'plans' 
   AND column_name IN ('cine_party', 'trial_days', 'support_level');
   
   -- Verify old features column is removed
   SELECT column_name FROM information_schema.columns 
   WHERE table_name = 'plans' AND column_name = 'features';
   ```

3. **Update Stripe Integration**:
   ```bash
   bun run stripe:sync
   ```

### Adding New Plans

1. **Update Schema** (if needed):
   ```sql
   -- Add new plan to schema.sql
   INSERT INTO plans (...) VALUES (...);
   ```

2. **Update Stripe Script**:
   ```javascript
   // Edit api/scripts/sync-new-plans.js
   const newPlans = [
       // ... existing plans
       {
           name: 'Enterprise',
           // ... plan configuration
       }
   ];
   ```

3. **Run Sync**:
   ```bash
   bun run stripe:sync
   ```

## 🚨 Troubleshooting

### Common Issues

#### 1. **Migration Fails**
```bash
# Check database connection
psql $DATABASE_URL -c "SELECT 1;"

# Check if columns already exist
psql $DATABASE_URL -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'plans';"
```

#### 2. **Stripe Sync Errors**
```bash
# Check Stripe API key
echo $STRIPE_SECRET_KEY

# Test Stripe connection
bun run stripe:sync
```

#### 3. **Plan Not Appearing**
```bash
# Check database
psql $DATABASE_URL -c "SELECT * FROM plans WHERE is_active = true;"

# Check Stripe
bun run stripe:sync
```

### Debug Commands

```bash
# Check plan data
psql $DATABASE_URL -c "SELECT name, price_monthly, max_profiles, cine_party FROM plans;"

# Test API endpoints
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:3000/api/v1/subscriptions/current
```

## 📝 Best Practices

### 1. **Plan Changes**
- Always test changes in development first
- Update both database and Stripe simultaneously
- Document all changes in version control
- Notify users of plan changes via email

### 2. **Feature Additions**
- Add feature columns to database schema
- Update all relevant backend files
- Test email templates with new features
- Update public API documentation

### 3. **Pricing Changes**
- Update both monthly and annual prices
- Sync with Stripe immediately
- Consider grandfathering existing subscribers
- Update frontend pricing displays

### 4. **Migration Safety**
- Always backup database before migration
- Test migration on staging environment
- Have rollback plan ready
- Monitor error logs during migration

## 🔗 Related Files

- **Database Schema**: `api/src/db/schema.sql`
- **Subscription Routes**: `api/src/routes/subscriptions.js`
- **Validation Schemas**: `api/src/utils/schemas.js`
- **Email Service**: `api/src/services/email.js`
- **Optimization Middleware**: `api/src/middleware/optimization.js`
- **Stripe Sync Script**: `api/scripts/sync-new-plans.js`
- **Package Scripts**: `api/package.json`

## 📞 Support

For issues with plan management:

1. Check the troubleshooting section above
2. Review error logs in the application
3. Test with the debug commands provided
4. Contact the development team with specific error messages

---

**Last Updated**: December 2024  
**Version**: 1.0.0  
**Maintainer**: SyncStream Development Team
