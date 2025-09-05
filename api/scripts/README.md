# Scripts

This directory contains essential scripts for managing the SyncStream TV backend.

## Available Scripts

### 1. Stripe Sync Script

**File:** `sync-new-plans.js`

Synchronizes the new plan structure with Stripe, creating products and prices for the Basic, Pro, and Ultimate plans.

```bash
bun run stripe:sync
```

**What it does:**
- Creates Stripe products for each plan
- Creates monthly and annual prices
- Updates database with Stripe IDs
- Handles both new and existing plans

### 2. Backup Script

**File:** `backup.sh`

Creates database backups for production environments.

```bash
./scripts/backup.sh
```

### 3. Deploy Script

**File:** `deploy.sh`

Handles production deployment with proper environment setup.

```bash
./scripts/deploy.sh
```

## Package.json Scripts

The following scripts are available in `package.json`:

| Script | Command | Purpose |
|--------|---------|---------|
| **Development** | `bun run dev` | Start development server with hot reload |
| **Production** | `bun run start` | Start production server |
| **Database** | `bun run db:migrate` | Run database migrations |
| **Stripe Sync** | `bun run stripe:sync` | Sync plans with Stripe |
| **Testing** | `bun run test` | Run test suite |
| **Linting** | `bun run lint` | Check code quality |
| **Formatting** | `bun run format` | Format code with Prettier |

## Environment Variables Required

- `STRIPE_SECRET_KEY`: Your Stripe secret key
- `DATABASE_URL`: PostgreSQL connection string

### Security Variables (Required for Production)

- `STRIPE_SUCCESS_URL`: Secure success redirect URL
- `STRIPE_CANCEL_URL`: Secure cancel redirect URL
- `FRONTEND_URL`: Your frontend domain for fallback URLs

## Plan Management

### Current Plans

| Plan | Monthly | Annual | Profiles | Playlists | Key Features |
|------|---------|--------|----------|-----------|--------------|
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

## Usage Examples

### 1. Development Setup
```bash
# Start development server
bun run dev

# Run database migrations
bun run db:migrate

# Sync with Stripe
bun run stripe:sync
```

### 2. Production Deployment
```bash
# Create backup
./scripts/backup.sh

# Deploy
./scripts/deploy.sh

# Start production server
bun run start
```

### 3. Plan Management
```bash
# Sync new plans with Stripe
bun run stripe:sync

# Check plan data
psql $DATABASE_URL -c "SELECT name, price_monthly, max_profiles FROM plans;"
```

## Troubleshooting

### Stripe Sync Issues
```bash
# Check Stripe API key
echo $STRIPE_SECRET_KEY

# Test database connection
psql $DATABASE_URL -c "SELECT 1;"

# Check plan data
psql $DATABASE_URL -c "SELECT * FROM plans WHERE is_active = true;"
```

### Database Issues
```bash
# Run migrations
bun run db:migrate

# Check schema
psql $DATABASE_URL -c "\d plans"
```

## Security Features

- **No Arbitrary Redirects**: Users cannot specify custom success/cancel URLs
- **Predefined URLs**: All redirects use environment variable URLs
- **Plan Validation**: Plans are validated against database before checkout
- **Authentication Required**: All subscription operations require valid JWT

---

**Last Updated**: December 2024  
**Version**: 1.0.0