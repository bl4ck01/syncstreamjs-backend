# SyncStream TV - Project Description

## Overview
**SyncStream TV** is a B2C/B2B SaaS application that acts as a cloud-based management hub for IPTV users. It does not stream content but manages user data—profiles, playlists (Xtream codes), favorites, and watch progress—syncing them across all devices. It integrates with Stripe for subscriptions and offers a reseller system.

## Tech Stack
- **Runtime & Package Manager:** Bun (Mandated. `npm`/`yarn` are forbidden)
- **Language:** JavaScript (Mandated. TypeScript is forbidden)
- **Framework:** Elysia.js
- **Database:** PostgreSQL
- **Authentication:** JWT
- **Payments:** Stripe
- **Hosting:** VPS (8Gb Ram/ 6 VCores)

## Core Features
1.  **User Management & Authentication:** Signup, login, JWT-based sessions.
2.  **Profile System:** Multiple user profiles per account with parental controls.
3.  **Playlist Management:** Secure storage of Xtream codes.
4.  **Favorites & State Sync:** Sync favorites and watch progress across devices.
5.  **Subscription Tiers:** Free and paid plans with feature limits.
6.  **Reseller System:** Credits-based system for creating client accounts.
7.  **Watch Party ("CineSync"):** Real-time synchronized playback and chat.

## Key Technical Implementation Examples

### 1. Standardized API Response Plugin
A global plugin ensures all responses, including errors, follow the `{success, message, data}` format.

**`src/plugins/format.js`**
```javascript
// plugins/format.js
import Elysia from "elysia";

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

### 2. JWT with Profile Context & Protected Profile Selection
The JWT payload includes the active profile ID. A dedicated endpoint handles PIN verification and updates this context.

**JWT Setup & Protected Route Example:**
**`src/plugins/auth.js`**
```javascript
// plugins/auth.js
import { jwt } from '@elysiajs/jwt'
import { cookie } from '@elysiajs/cookie'

export const authPlugin = new Elysia()
  .use(jwt({
    name: 'jwt',
    secret: Bun.env.JWT_SECRET,
    schema: {
      userId: String,
      current_profile_id: { type: String, optional: true } // Critical for scoping
    }
  }))
  .use(cookie())
  .derive({ as: 'global' }, ({ jwt, cookie: { auth } }) => {
    return {
      getUserId: async () => {
        const payload = await jwt.verify(auth.value);
        return payload?.userId ?? null;
      }
    };
  });
```

**`src/routes/auth.profile.select.js`**
```javascript
// routes/auth.profile.select.js
import Elysia from "elysia";
import { authPlugin } from '../plugins/auth.js';

export const profileSelectRoute = new Elysia()
  .use(authPlugin)
  .post("/profile/:id/select", async ({ jwt, body, params, set, cookie: { auth }, getUserId, db }) => {
    const userId = await getUserId();
    if (!userId) throw new Error("Unauthorized");

    // 1. Get profile and verify ownership
    const profile = await db.profiles.findFirst({
      where: { id: params.id, user_id: userId },
      select: { parental_pin_hash: true }
    });
    if (!profile) throw new Error("Profile not found");

    // 2. Verify PIN if required
    if (profile.parental_pin_hash) {
      if (!body.pin) throw new Error("PIN required");
      const isValid = await Bun.password.verify(body.pin, profile.parental_pin_hash);
      if (!isValid) throw new Error("Invalid PIN");
    }

    // 3. Issue new JWT with the selected profile context
    const newToken = await jwt.sign({
      userId: userId,
      current_profile_id: params.id
    });

    auth.set({ value: newToken, httpOnly: true, secure: true, sameSite: 'lax' });
    return { message: "Profile selected successfully" };
  }, {
    body: {
      pin: { type: String, optional: true }
    }
  });
```

### 3. Concurrency-Safe Reseller Credit Deduction
Using PostgreSQL transactions and `FOR UPDATE` to prevent race conditions.

**`src/routes/reseller.clients.create.js`**
```javascript
// routes/reseller.clients.create.js
import Elysia from "elysia";
import { authPlugin } from '../plugins/auth.js';

// This cost should be configured in a central config file
const CLIENT_CREATION_COST = 1000; // Example: 1000 credits

export const resellerCreateClientRoute = new Elysia()
  .use(authPlugin)
  .post("/clients", async ({ body, getUserId, db }) => {
    const resellerId = await getUserId();
    // ...get reseller from db, check if they are a reseller...

    return await db.$transaction(async (tx) => {
      // 1. Lock the reseller's row
      const reseller = await tx.users.findUnique({
        where: { id: resellerId },
        select: { credits_balance: true },
        lock: 'ForUpdate' // This is the key
      });

      // 2. Check balance
      if (reseller.credits_balance < CLIENT_CREATION_COST) {
        throw new Error("Insufficient credits");
      }

      // 3. Deduct credits & create client
      await tx.users.update({
        where: { id: resellerId },
        data: { credits_balance: { decrement: CLIENT_CREATION_COST } }
      });

      const newClient = await tx.users.create({
        data: { ...body, parent_reseller_id: resellerId }
      });

      // 4. Record transaction
      await tx.credits_transactions.create({
        data: {
          user_id: resellerId,
          amount: -CLIENT_CREATION_COST,
          transaction_type: 'client_created',
          description: `Created client: ${newClient.email}`
        }
      });

      return newClient;
    });
  });
```

### 4. Real-Time Enforcement of Plan Limits
Checking limits dynamically on every create request.

**`src/routes/profiles.create.js`**
```javascript
// routes/profiles.create.js
import Elysia from "elysia";
import { authPlugin } from '../plugins/auth.js';

// Helper function to get the free plan limits
function getFreePlan() {
  return { max_profiles: 1 };
}

export const profilesCreateRoute = new Elysia()
  .use(authPlugin)
  .post("/profiles", async ({ body, getUserId, db }) => {
    const userId = await getUserId();

    return await db.$transaction(async (tx) => {
      // 1. Get user's current active plan limits
      const userWithPlan = await tx.users.findUnique({
        where: { id: userId },
        include: {
          subscription: {
            where: { status: 'active' },
            include: { plan: true }
          }
        }
      });

      const userPlan = userWithPlan?.subscription?.plan || getFreePlan();
      const maxProfiles = userPlan.max_profiles;

      // 2. Check current count against the limit
      const currentProfileCount = await tx.profiles.count({
        where: { user_id: userId }
      });

      if (maxProfiles !== -1 && currentProfileCount >= maxProfiles) {
        throw new Error(`Plan limit reached. Maximum profiles: ${maxProfiles}`);
      }

      // 3. Create the profile if under the limit
      return await tx.profiles.create({
        data: { ...body, user_id: userId }
      });
    });
  });
```