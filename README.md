# SyncStream TV Backend - MVP

Cloud-based IPTV management hub built with Bun and Elysia.js.

## Features

- ✅ User authentication (signup/login with JWT) - supports email or username
- ✅ Multiple profiles per account with parental controls (PIN stored as plain text)
- ✅ Playlist management (Xtream codes stored in plain text)
- ✅ Favorites system with plan limits
- ✅ Watch progress tracking
- ✅ Plan-based limits enforcement
- ✅ Stripe subscription integration
- ✅ Webhook handlers for payment events
- ✅ Admin panel for user and plan management
- ✅ Default admin user included
- 🚧 Reseller credit system (partial implementation)

## Tech Stack

- **Runtime**: Bun
- **Framework**: Elysia.js
- **Database**: PostgreSQL
- **Auth**: JWT with cookies
- **Validation**: Zod

## Getting Started

### Prerequisites

- Bun runtime installed
- PostgreSQL database
- Stripe account (for payment features)

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   bun install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your database and other credentials
   ```

4. Run database migrations:
   ```bash
   bun run db:migrate
   ```

5. Start the development server:
   ```bash
   bun run dev
   ```

The API will be available at `http://localhost:3000`

## API Endpoints

### Health Check
- `GET /health` - Basic health check
- `GET /health/db` - Database connectivity check

### Authentication
- `POST /auth/signup` - Create new account
- `POST /auth/login` - Login with email or username
- `POST /auth/logout` - Logout
- `GET /auth/me` - Get current user

### Profiles
- `GET /profiles` - List user profiles
- `POST /profiles` - Create new profile
- `POST /profiles/:id/select` - Select active profile
- `PATCH /profiles/:id` - Update profile
- `DELETE /profiles/:id` - Delete profile

### Playlists
- `GET /playlists` - List user playlists
- `POST /playlists` - Add new playlist
- `GET /playlists/:id` - Get playlist with credentials
- `PATCH /playlists/:id` - Update playlist
- `DELETE /playlists/:id` - Delete playlist

### Favorites
- `GET /favorites` - List favorites for current profile
- `POST /favorites` - Add to favorites
- `DELETE /favorites/:itemId` - Remove from favorites
- `GET /favorites/check/:itemId` - Check if item is favorited

### Watch Progress
- `GET /progress` - List watch progress
- `PUT /progress` - Update watch progress
- `GET /progress/:itemId` - Get progress for item
- `DELETE /progress/:itemId` - Delete progress

### Subscriptions
- `GET /subscriptions/current` - Get current subscription
- `GET /subscriptions/plans` - List available plans
- `POST /subscriptions/checkout` - Create Stripe checkout session
- `POST /subscriptions/change-plan` - Change subscription plan
- `POST /subscriptions/cancel` - Cancel subscription
- `POST /subscriptions/reactivate` - Reactivate canceled subscription
- `GET /subscriptions/billing-portal` - Get Stripe billing portal URL

### Webhooks
- `POST /webhooks/stripe` - Stripe webhook handler

### Admin (Requires admin role)
- `GET /admin/users` - List all users
- `GET /admin/users/:id` - Get user details
- `GET /admin/plans` - List all plans
- `POST /admin/plans` - Create new plan
- `PATCH /admin/plans/:id` - Update plan
- `POST /admin/credits/add` - Add credits to user
- `GET /admin/stats` - Get system statistics
- `PATCH /admin/users/:id/admin` - Toggle admin status
- `PATCH /admin/users/:id/reseller` - Toggle reseller status

## Security Features

- JWT-based authentication with httpOnly cookies
- Password hashing with bcrypt
- Profile PIN protection (stored in plain text as requested)
- Plan limits enforced at API level
- SQL injection protection using parameterized queries
- Admin role protection for sensitive endpoints
- Stripe webhook signature verification

## Development

Run in development mode with auto-reload:
```bash
bun run dev
```

## Default Admin User

The system includes a default admin user:
- **Email**: admin@syncstream.tv
- **Username**: admin
- **Password**: admin123

⚠️ **Important**: Change the admin password immediately after first login!

## Environment Variables

Make sure to set all required environment variables in `.env`:

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/syncstream_db

# JWT
JWT_SECRET=your-secret-key-here-change-in-production

# Stripe
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Server
PORT=3000
NODE_ENV=development

# Frontend URL (for Stripe redirects)
FRONTEND_URL=http://localhost:3001
```

## Database Schema Updates

The schema now includes:
- `username` field in users table (unique, required)
- `is_admin` flag for admin users
- Plain text storage for playlist passwords
- Plain text storage for profile PINs
- Proper CASCADE delete constraints on foreign keys

## Next Steps

1. Complete reseller credit system implementation
2. Add email notification service
3. Implement rate limiting
4. Add comprehensive test suite
5. Set up monitoring and logging
<<<<<<< Current (Your changes)
6. Add comprehensive test suite
=======
6. Add API documentation (OpenAPI/Swagger)
>>>>>>> Incoming (Background Agent changes)
