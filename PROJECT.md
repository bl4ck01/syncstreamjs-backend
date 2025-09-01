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

## Project Structure

### Directory Layout
```
/workspace/
├── src/
│   ├── index.js              # Main application entry point
│   ├── db/
│   │   ├── connection.js     # PostgreSQL connection pool
│   │   ├── schema.sql        # Database schema definition
│   │   └── migrate.js        # Migration runner script
│   ├── plugins/
│   │   ├── auth.js          # JWT authentication & cookie management
│   │   ├── database.js      # Database query helpers & transactions
│   │   └── format.js        # Standardized response formatting
│   ├── routes/
│   │   ├── auth.js          # Authentication endpoints
│   │   ├── profiles.js      # Profile management
│   │   ├── playlists.js     # Playlist CRUD operations
│   │   ├── favorites.js     # Favorites management
│   │   ├── progress.js      # Watch progress tracking
│   │   ├── subscriptions.js # Stripe subscription handling
│   │   ├── webhooks.js      # Stripe webhook processing
│   │   ├── admin.js         # Admin panel endpoints
│   │   ├── resellers.js     # Reseller portal
│   │   └── health.js        # Health check endpoints
│   └── utils/
│       ├── password.js      # Bcrypt password hashing
│       └── validation.js    # Zod validation schemas
├── postman/
│   └── syncstream.collection.json  # Complete API collection
├── .env                     # Environment variables
├── .gitignore              # Git ignore rules
├── package.json            # Project dependencies
├── README.md               # Quick start guide
├── PROJECT.md              # This file - detailed documentation
├── RULES.md                # Business logic rules
└── SCENARIOS.md            # User scenarios & workflows
```

### Architecture Patterns

#### 1. Plugin-Based Architecture
Elysia.js plugins provide modular, reusable functionality:
- **Global Plugins:** Applied to all routes (auth, database, format)
- **Route Guards:** Protect endpoints based on roles
- **Derive Functions:** Add computed properties to context

#### 2. Database Access Pattern
- **Connection Pool:** Shared PostgreSQL connection pool
- **Query Helpers:** Simplified database operations
- **Transaction Support:** Atomic operations for critical flows
- **Row Locking:** Prevents race conditions (FOR UPDATE)

#### 3. Authentication Flow
```
1. User Login → Validate credentials
2. Generate JWT → Include userId & email
3. Set httpOnly Cookie → Secure token storage
4. Profile Selection → Update JWT with profile context
5. Request Authorization → Verify JWT & check role
```

#### 4. Error Handling Strategy
- All errors caught by global error handler
- Standardized error responses
- Appropriate HTTP status codes
- User-friendly error messages

### Development Workflow

#### Local Development
```bash
# Install dependencies
bun install

# Set up environment
cp .env.example .env
# Edit .env with your credentials

# Run migrations
bun run db:migrate

# Start dev server with hot reload
bun run dev
```

#### Testing Strategy
1. **Unit Tests:** Test individual functions and utilities
2. **Integration Tests:** Test API endpoints with database
3. **E2E Tests:** Test complete user flows
4. **Postman Collection:** Manual and automated API testing

#### Deployment Checklist
- [ ] Environment variables configured
- [ ] PostgreSQL database provisioned
- [ ] Stripe webhooks configured
- [ ] SSL certificates installed
- [ ] Monitoring & logging set up
- [ ] Backup strategy implemented

## Performance Optimizations

### Database Optimizations
- Indexed columns for fast lookups
- Connection pooling for efficiency
- Prepared statements for security
- Transaction batching where applicable

### API Optimizations
- JWT caching in cookies
- Minimal database queries
- Efficient data serialization
- Response compression

### Scalability Considerations
- Horizontal scaling ready
- Stateless architecture
- Database connection limits
- Rate limiting implementation

## Next Development Phase
1. Email notification system (SendGrid/AWS SES)
2. Watch Party (CineSync) - WebSocket implementation
3. Advanced analytics dashboard
4. Mobile app API optimization
5. CDN integration for static assets
6. Multi-language support
7. Advanced search capabilities
8. Recommendation engine