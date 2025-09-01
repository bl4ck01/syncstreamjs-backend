# SyncStream TV Backend - MVP

Cloud-based IPTV management hub built with Bun and Elysia.js.

## Features (MVP)

- ✅ User authentication (signup/login with JWT)
- ✅ Multiple profiles per account with parental controls
- ✅ Secure playlist management (encrypted Xtream codes)
- ✅ Favorites system
- ✅ Watch progress tracking
- ✅ Plan-based limits enforcement
- 🚧 Stripe subscription integration (next phase)
- 🚧 Reseller system (next phase)

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
- `POST /auth/login` - Login with email/password
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

## Security Features

- JWT-based authentication with httpOnly cookies
- Password hashing with bcrypt
- Playlist password encryption (AES-256-GCM)
- Profile PIN protection
- Plan limits enforced at API level
- SQL injection protection

## Development

Run in development mode with auto-reload:
```bash
bun run dev
```

## Next Steps

1. Implement Stripe subscription integration
2. Add webhook handlers for subscription events
3. Implement reseller credit system
4. Add rate limiting
5. Set up monitoring and logging
6. Add comprehensive test suite