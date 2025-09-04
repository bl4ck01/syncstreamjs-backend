# Stripe Sync Scripts

These scripts help synchronize Stripe products and prices with your local database.

## Quick Test Script

**File:** `sync-stripe-quick.js`

Use this to quickly check what's available in your Stripe account without making database changes.

```bash
bun run stripe:quick
```

**What it does:**
- Lists all active Stripe products
- Shows product metadata
- Lists all active prices
- Displays pricing information

## Standard Sync Script

**File:** `sync-stripe-plans.js`

Use this to sync all Stripe plans to your local database.

## Enhanced Sync Script

**File:** `sync-stripe-plans-enhanced.js`

**Use this if you have existing plans with placeholder `stripe_price_id` values.**

This script will:
- Sync new Stripe plans as usual
- **Match existing plans by name** to Stripe products
- **Update placeholder plans** with real Stripe information
- **Link existing plans** to their Stripe counterparts

**When to use:**
- After running the standard sync
- When you have plans like "Basic", "Premium" with placeholder IDs
- To link existing database plans to Stripe products

## Reverse Sync Script

**File:** `sync-db-to-stripe.js`

**Use this to sync your database plans TO Stripe (opposite direction).**

This script will:
- **Create Stripe products** from your database plans
- **Create Stripe prices** with correct amounts and intervals
- **Update existing Stripe plans** if they're out of sync
- **Link everything back** to your database

**When to use:**
- When you want Stripe to match your database exactly
- After making plan changes in your database
- To create Stripe products from scratch
- To ensure Stripe metadata matches your plan features

```bash
bun run stripe:sync
```

**What it does:**
- Fetches all active Stripe products and prices
- Creates/updates plans in your `plans` table
- Maps Stripe metadata to plan features and limits
- Calculates monthly pricing for different billing intervals

## Database Schema Requirements

Make sure your `plans` table has these columns:

```sql
CREATE TABLE plans (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    stripe_product_id VARCHAR(255),
    stripe_price_id VARCHAR(255) UNIQUE,
    price_monthly DECIMAL(10,2),
    billing_interval VARCHAR(50),
    billing_interval_count INTEGER DEFAULT 1,
    max_profiles INTEGER DEFAULT 3,
    max_playlists INTEGER DEFAULT 5,
    max_favorites INTEGER DEFAULT 100,
    features JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

## Stripe Product Metadata

For best results, add these metadata fields to your Stripe products:

### Limits
- `max_profiles`: Maximum number of profiles
- `max_playlists`: Maximum number of playlists  
- `max_favorites`: Maximum number of favorites

### Features
- `ads`: Boolean - whether ads are shown
- `hd`: Boolean - HD quality available
- `4k`: Boolean - 4K quality available
- `priority_support`: Boolean - priority customer support
- `trial`: Boolean - trial available
- `trial_days`: Number - trial duration in days

## Usage Examples

### 1. Quick Check
```bash
bun run stripe:quick
```

### 2. Standard Sync
```bash
bun run stripe:sync
```

### 3. Enhanced Sync (Recommended for existing databases)
```bash
bun run stripe:sync:enhanced
```

### 4. Reverse Sync (Database → Stripe)
```bash
bun run stripe:sync:to-stripe
```

### 5. Manual Run
```bash
bun run scripts/sync-stripe-plans.js
```

## Environment Variables Required

- `STRIPE_SECRET_KEY`: Your Stripe secret key
- `DATABASE_URL`: PostgreSQL connection string

### Security Variables (Required for Production)

- `STRIPE_SUCCESS_URL`: Secure success redirect URL (prevents redirect attacks)
- `STRIPE_CANCEL_URL`: Secure cancel redirect URL (prevents redirect attacks)
- `FRONTEND_URL`: Your frontend domain for fallback URLs

**Example:**
```bash
STRIPE_SUCCESS_URL=https://yourdomain.com/subscription/success
STRIPE_CANCEL_URL=https://yourdomain.com/subscription/cancel
FRONTEND_URL=https://yourdomain.com
```

## Notes

- The script only syncs **active** products and prices
- Recurring prices are converted to monthly equivalents
- Existing plans are updated if they have the same `stripe_price_id`
- Plan limits and features are extracted from Stripe metadata
- Default values are applied if metadata is missing

## Sync Directions

### Stripe → Database (Standard)
- **Purpose**: Import Stripe plans to your database
- **Use when**: Setting up new plans, syncing from Stripe dashboard
- **Scripts**: `stripe:sync`, `stripe:sync:enhanced`

### Database → Stripe (Reverse)
- **Purpose**: Export your database plans to Stripe
- **Use when**: Creating Stripe products from your plans, ensuring Stripe matches DB
- **Scripts**: `stripe:sync:to-stripe`

## Security Features

### Checkout Security
- **No Arbitrary Redirects**: Users cannot specify custom success/cancel URLs
- **Predefined URLs**: All redirects use environment variable URLs
- **Plan Validation**: Plans are validated against database before checkout
- **Authentication Required**: All subscription operations require valid JWT

### Plan Identification
- **Flexible Plan Lookup**: Accepts plan ID (UUID) or plan name (e.g., "Basic", "Premium")
- **Smart Detection**: Automatically detects if input is UUID or plan name
- **Database Validation**: Plans must exist and be active in database
- **No Price ID Exposure**: Frontend doesn't need to know Stripe price IDs

**Examples:**
```json
// By plan name
{"plan_id": "Basic"}

// By plan UUID
{"plan_id": "123e4567-e89b-12d3-a456-426614174000"}
```

## Troubleshooting

### "column 'stripe_product_id' does not exist" Error

This means your database schema is missing the required columns. The schema has been updated to include all necessary Stripe columns.

**Solution:** Rebuild your Docker container to use the updated schema:

```bash
docker-compose down
docker-compose up --build
```

Then run the sync:

```bash
bun run stripe:sync
```
