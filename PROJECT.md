# SyncStream TV - Project Description

## Overview
**SyncStream TV** is a B2C/B2B SaaS application that acts as a cloud-based management hub for IPTV users. It does not stream content but manages user data—profiles, playlists (Xtream codes), favorites, and watch progress—syncing them across all devices. It integrates with Stripe for subscriptions and offers a reseller system.

## Tech Stack
- **Runtime & Package Manager:** Bun (Mandated. `npm`/`yarn` are forbidden)
- **Language:** JavaScript (Mandated. TypeScript is forbidden)
- **Framework:** Elysia.js
- **Database:** PostgreSQL
- **Authentication:** JWT (email-based only)
- **Payments:** Stripe
- **Hosting:** VPS (8Gb Ram/ 6 VCores)

## Core Features
1. **User Management & Authentication:** Email-based signup/login, JWT sessions with role-based access control.
2. **Profile System:** Multiple user profiles per account with parental controls (PIN stored as plain text).
3. **Playlist Management:** Storage of Xtream codes (credentials stored in plain text).
4. **Favorites & State Sync:** Sync favorites and watch progress across devices.
5. **Subscription Tiers:** Free and paid plans with feature limits.
6. **Reseller System:** Credits-based system for creating client accounts.
7. **Admin Panel:** Complete user and system management.
8. **Watch Party ("CineSync"):** Real-time synchronized playback and chat (future feature).

## Database Design Updates

### User Authentication & Roles
- **No Username:** Users authenticate with email only
- **Role-Based Access:** Single `role` column with values: 'user', 'reseller', 'admin'
- **Default Admin:** System includes a default admin user (admin@syncstream.tv)

### Key Tables
1. **users:** Core user data with role-based permissions
2. **profiles:** Multiple profiles per user with plain-text PINs
3. **playlists:** IPTV credentials (plain text storage)
4. **subscriptions:** Stripe subscription tracking
5. **credits_transactions:** Audit trail for reseller operations
6. **idempotency_keys:** Prevents duplicate operations (critical for payments)

## Key Technical Implementation Examples

### 1. Standardized API Response Plugin
A global plugin ensures all responses, including errors, follow the `{success, message, data}` format.

**`src/plugins/format.js`**
```javascript
export const formatPlugin = new Elysia()
  .mapResponse(({ response, set }) => {
    if (response !== undefined && response !== null) {
      set.status = 200;
      return { success: true, data: response };
    }
    set.status = 200;
    return { success: true };
  })
  .onError(({ code, error, set }) => {
    set.status = code === 'VALIDATION' ? 400 : 500;
    return { success: false, message: error.message };
  });
```

### 2. Role-Based Access Control
Authentication now uses a single role field for permissions.

**`src/routes/admin.js`**
```javascript
export const adminRoutes = new Elysia({ prefix: '/admin' })
  .guard({
    beforeHandle: async ({ getUser, set }) => {
      const user = await getUser();
      if (!user || user.role !== 'admin') {
        set.status = 403;
        throw new Error('Forbidden: Admin access required');
      }
    }
  })
```

### 3. Email-Only Authentication
Simplified authentication using only email addresses.

**`src/routes/auth.js`**
```javascript
.post('/login', async ({ body, db, signToken, cookie: { auth } }) => {
  const validatedData = loginSchema.parse(body);
  const { email, password } = validatedData;
  
  const user = await db.getOne(
    'SELECT * FROM users WHERE email = $1',
    [email]
  );
  
  if (!user) {
    throw new Error('Invalid email or password');
  }
  
  // Verify password and issue JWT...
})
```

### 4. Idempotency for Critical Operations
Prevents duplicate operations using idempotency keys.

**Why Idempotency Keys Are Important:**
- Prevents double-charging on payment retries
- Ensures exactly-once execution for critical operations
- Essential for reseller credit operations

**Implementation Pattern:**
```javascript
// Client sends: Idempotency-Key: unique-request-id
// Server checks if this key was used before
const existing = await db.getOne(
  'SELECT response FROM idempotency_keys WHERE key = $1 AND expires_at > NOW()',
  [idempotencyKey]
);

if (existing) {
  return existing.response; // Return cached response
}

// Execute operation and store result...
```

### 5. Reseller Credit System with Atomicity
Complete implementation with transaction safety.

**`src/routes/resellers.js`**
```javascript
const result = await db.transaction(async (tx) => {
  // Lock reseller row
  const reseller = await tx.query(
    'SELECT id, credits_balance FROM users WHERE id = $1 FOR UPDATE',
    [resellerId]
  );
  
  // Check balance
  if (reseller.rows[0].credits_balance < creditCost) {
    throw new Error('Insufficient credits');
  }
  
  // Create client, deduct credits, record transaction
  // All operations succeed or all fail
});
```

## API Endpoints Summary

### Authentication
- `POST /auth/signup` - Create account (email only)
- `POST /auth/login` - Login with email
- `GET /auth/me` - Get current user

### User Management
- Profiles, Playlists, Favorites, Progress tracking

### Subscriptions
- Plan management, Stripe checkout, Billing portal

### Admin Panel
- User management, System stats, Role updates

### Reseller Portal
- Dashboard, Client creation, Credit transactions

## Security Considerations
1. **Plain Text Storage:** PINs and playlist passwords stored unencrypted (per requirements)
2. **Role Enforcement:** All protected routes check user role
3. **Transaction Safety:** Critical operations use database transactions
4. **Idempotency:** Payment operations protected against duplicates

## Next Development Phase
1. Email notification system
2. Watch Party (CineSync) feature
3. Advanced analytics dashboard
4. Mobile app API optimization