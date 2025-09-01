# SyncStream TV - User Scenarios & Workflows

## Table of Contents
1. [End User Scenarios](#end-user-scenarios)
2. [Reseller Scenarios](#reseller-scenarios)
3. [Admin Scenarios](#admin-scenarios)
4. [System Integration Scenarios](#system-integration-scenarios)

---

## End User Scenarios

### Scenario 1: New User Trial Journey
**User:** John, a cord-cutter looking for IPTV management solution

#### Flow:
1. **Discovery & Signup**
   ```
   POST /auth/signup
   {
     "email": "john@example.com",
     "password": "securePass123",
     "full_name": "John Doe"
   }
   ```

2. **Profile Creation for Family**
   ```
   POST /profiles (Default profile created automatically)
   
   POST /profiles (Wife's profile)
   {
     "name": "Sarah",
     "avatar_url": "https://example.com/sarah.jpg"
   }
   
   POST /profiles (Kids profile with PIN)
   {
     "name": "Kids",
     "is_kids_profile": true,
     "parental_pin": "1234"
   }
   ```

3. **Add IPTV Playlist**
   ```
   POST /playlists
   {
     "name": "Premium IPTV Service",
     "url": "http://iptv-provider.com/get.php",
     "username": "john_iptv",
     "password": "iptv_pass_2024"
   }
   ```

4. **Start Using Features**
   ```
   POST /favorites (Add favorite channels)
   {
     "item_id": "espn_hd",
     "item_type": "channel",
     "item_name": "ESPN HD",
     "item_logo": "https://cdn.example.com/espn.png"
   }
   
   PUT /progress (Track movie progress)
   {
     "item_id": "movie_inception",
     "item_type": "movie",
     "progress_seconds": 3600,
     "duration_seconds": 8880
   }
   ```

5. **Trial Ends - Subscribe**
   ```
   GET /subscriptions/plans (View available plans)
   
   POST /subscriptions/checkout
   {
     "price_id": "price_family_monthly",
     "success_url": "https://app.syncstream.tv/success",
     "cancel_url": "https://app.syncstream.tv/pricing"
   }
   ```

**Outcome:** John successfully manages multiple IPTV services for his family with personalized profiles and parental controls.

---

### Scenario 2: Power User Multi-Device Sync
**User:** Maria, tech-savvy user with multiple devices

#### Flow:
1. **Morning - Living Room TV**
   ```
   POST /auth/login (Smart TV app)
   POST /profiles/maria_id/select
   GET /playlists (Retrieve saved playlists)
   GET /favorites?type=channel (Get favorite channels)
   ```

2. **Commute - Mobile Phone**
   ```
   POST /auth/login (Mobile app)
   GET /progress (Check last watched)
   PUT /progress (Continue watching series)
   {
     "item_id": "series_got_s01e05",
     "item_type": "episode",
     "progress_seconds": 1200,
     "duration_seconds": 3600
   }
   ```

3. **Evening - Tablet**
   ```
   GET /favorites (Browse favorites)
   POST /favorites (Add new movie)
   GET /progress/series_got_s01e05 (Resume from phone)
   ```

**Outcome:** Seamless experience across all devices with synchronized state.

---

### Scenario 3: Family Profile Management
**User:** Parent managing family viewing

#### Flow:
1. **Setup Kids Profile**
   ```
   POST /profiles
   {
     "name": "Timmy",
     "is_kids_profile": true,
     "parental_pin": "9876",
     "avatar_url": "https://cdn.example.com/avatars/dinosaur.png"
   }
   ```

2. **Kids Try to Access Adult Profile**
   ```
   POST /profiles/adult_profile_id/select
   {
     "pin": "1234"  // Wrong PIN
   }
   // Returns: Error - Invalid PIN
   ```

3. **Parent Updates Restrictions**
   ```
   PATCH /profiles/kids_profile_id
   {
     "parental_pin": "5555"  // Change PIN
   }
   ```

**Outcome:** Parents maintain control over content access while kids have their personalized space.

---

## Reseller Scenarios

### Scenario 4: Reseller Business Operations
**User:** Alex, runs a local IPTV service business

#### Flow:
1. **Admin Grants Reseller Access**
   ```
   // Admin action
   PATCH /admin/users/alex_user_id/role
   {
     "role": "reseller"
   }
   
   POST /admin/credits/add
   {
     "user_id": "alex_user_id",
     "amount": 10000,
     "description": "Initial reseller credit package"
   }
   ```

2. **Reseller Checks Dashboard**
   ```
   GET /reseller/dashboard
   // Returns: credits_balance: 10000, total_clients: 0
   ```

3. **Create Client for Local Customer**
   ```
   POST /reseller/clients
   Headers: { "Idempotency-Key": "unique-key-123" }
   {
     "email": "customer1@gmail.com",
     "password": "tempPass123",
     "full_name": "Local Customer 1",
     "plan_stripe_price_id": "price_basic_monthly"
   }
   // Deducts 499 credits (based on plan cost)
   ```

4. **Monitor Business**
   ```
   GET /reseller/clients?page=1&limit=20
   GET /reseller/transactions
   // Track credit usage and client status
   ```

5. **Handle Support Request**
   ```
   GET /reseller/clients (Find specific client)
   // Reseller provides support directly
   ```

**Business Model:** Alex charges customers $10/month, pays ~$5 in credits, makes $5 profit per client.

---

### Scenario 5: Reseller Scaling Operations
**User:** TechIPTV Company, large-scale reseller

#### Flow:
1. **Bulk Credit Purchase**
   ```
   // Negotiated with admin for bulk discount
   // Admin adds 100,000 credits for $4,000 (bulk rate)
   POST /admin/credits/add
   {
     "user_id": "techiptv_id",
     "amount": 100000,
     "description": "Bulk credit purchase - Invoice #INV-2024-001"
   }
   ```

2. **Automated Client Creation**
   ```
   // Their system integrates with API
   POST /reseller/clients
   Headers: { "Idempotency-Key": "order-12345" }
   {
     "email": "enterprise_client@company.com",
     "password": "generated_pass",
     "full_name": "Enterprise Client",
     "plan_stripe_price_id": "price_premium_monthly"
   }
   ```

3. **Monthly Reporting**
   ```
   GET /reseller/transactions?page=1&limit=1000
   GET /reseller/clients?page=1&limit=1000
   // Generate business reports
   ```

**Outcome:** Manages hundreds of clients efficiently with automated systems.

---

## Admin Scenarios

### Scenario 6: Admin Daily Operations
**User:** System Administrator

#### Flow:
1. **Morning Check**
   ```
   POST /auth/login (Admin login)
   GET /admin/stats
   // Review: total_users: 5420, active_subscriptions: 3200, mrr: $31,995
   ```

2. **Handle Reseller Request**
   ```
   GET /admin/users?search=potential_reseller@email.com
   PATCH /admin/users/user_id/role
   {
     "role": "reseller"
   }
   
   POST /admin/credits/add
   {
     "user_id": "user_id",
     "amount": 5000,
     "description": "New reseller initial credits"
   }
   ```

3. **Plan Management**
   ```
   POST /admin/plans
   {
     "name": "Black Friday Special",
     "stripe_price_id": "price_bf_2024",
     "price_monthly": 7.99,
     "max_profiles": 5,
     "max_playlists": 10,
     "max_favorites": 500,
     "features": {"ads": false, "hd": true}
   }
   ```

4. **User Support**
   ```
   GET /admin/users/troubled_user_id
   // Investigate subscription issues
   // Manually adjust if needed
   ```

**Outcome:** Maintains smooth platform operations and supports business growth.

---

### Scenario 7: Admin Crisis Management
**User:** Admin handling payment processing issue

#### Flow:
1. **Detect Issue**
   ```
   // Multiple webhook failures noticed
   GET /admin/stats
   // Unusual pattern in subscription stats
   ```

2. **Investigate**
   ```
   GET /admin/users?page=1&limit=50
   // Check recent signups and subscription status
   ```

3. **Manual Intervention**
   ```
   // For affected users, manually add credits as compensation
   POST /admin/credits/add
   {
     "user_id": "affected_user_id",
     "amount": 1000,
     "description": "Compensation for service disruption"
   }
   ```

4. **Communication**
   ```
   // Use user emails from database to send notifications
   // (Email service to be implemented)
   ```

**Outcome:** Quick resolution maintains user trust and platform reputation.

---

## System Integration Scenarios

### Scenario 8: Stripe Webhook Flow
**Actor:** Stripe Payment System

#### Flow:
1. **User Subscribes**
   ```
   // User completes Stripe Checkout
   // Stripe sends webhook
   POST /webhooks/stripe
   Headers: { "stripe-signature": "..." }
   {
     "type": "customer.subscription.created",
     "data": {
       "object": {
         "id": "sub_xxx",
         "customer": "cus_xxx",
         "status": "active",
         "items": {...}
       }
     }
   }
   ```

2. **System Updates**
   ```
   // Webhook handler:
   - Verifies signature
   - Updates subscriptions table
   - Sets user plan limits
   - Marks trial as used if applicable
   ```

3. **Recurring Billing**
   ```
   POST /webhooks/stripe
   {
     "type": "invoice.paid",
     "data": {...}
   }
   // Confirms continued access
   ```

4. **Failed Payment**
   ```
   POST /webhooks/stripe
   {
     "type": "invoice.payment_failed",
     "data": {...}
   }
   // Initiates grace period
   // Notifies user (future feature)
   ```

**Outcome:** Automated subscription lifecycle management.

---

### Scenario 9: Mobile App Integration
**Actor:** SyncStream Mobile App

#### Flow:
1. **App Launch**
   ```
   GET /health (Check API availability)
   POST /auth/login (Stored credentials)
   GET /profiles (Load user profiles)
   ```

2. **Profile Selection**
   ```
   POST /profiles/profile_id/select
   {
     "pin": "1234"  // If required
   }
   ```

3. **Sync Operations**
   ```
   GET /playlists (Download playlist data)
   GET /favorites (Sync favorites)
   GET /progress (Get watch progress)
   ```

4. **Background Sync**
   ```
   PUT /progress (Periodic progress updates)
   {
     "item_id": "current_watching",
     "progress_seconds": 1800
   }
   ```

**Outcome:** Native mobile experience with full feature parity.

---

### Scenario 10: IPTV Player Integration
**Actor:** Third-party IPTV Player (Tivimate, IPTV Smarters)

#### Flow:
1. **User Configures Player**
   ```
   GET /playlists/playlist_id
   // User copies URL and credentials to player
   ```

2. **Player Requests**
   ```
   // Player uses stored Xtream credentials
   // Connects directly to IPTV provider
   // SyncStream doesn't proxy streams
   ```

3. **Sync Watch State**
   ```
   // Custom integration or browser extension
   PUT /progress
   {
     "item_id": "channel_or_vod_id",
     "progress_seconds": 0
   }
   ```

**Outcome:** SyncStream complements existing IPTV players without replacing them.

---

## Business Metrics from Scenarios

### User Acquisition
- **Trial Users:** 40% convert to paid
- **Reseller Clients:** 90% retention (managed service)
- **Direct Subscribers:** 70% retention

### Revenue Streams
1. **Direct Subscriptions:** $4.99 - $14.99/month
2. **Reseller Credits:** $3-5 per client/month
3. **Enterprise Plans:** Custom pricing

### Platform Load
- **Peak Hours:** 7-10 PM local time
- **API Calls:** ~100 per user per day
- **Database Queries:** ~500 per user per day

### Success Metrics
- **Sync Accuracy:** 99.9% across devices
- **API Uptime:** 99.95% target
- **Response Time:** <200ms average
- **Concurrent Users:** 10,000+ supported

---

## Future Scenarios (Planned Features)

### Watch Party (CineSync)
```
POST /watch-party/create
POST /watch-party/join
WebSocket: /watch-party/sync
```

### Recommendation Engine
```
GET /recommendations/for-you
GET /recommendations/similar/{item_id}
```

### Advanced Analytics
```
GET /analytics/viewing-habits
GET /analytics/peak-times
GET /analytics/content-popularity
```

---

## Testing Scenarios

### Load Testing
- 1000 concurrent users
- 10,000 API calls/minute
- 50 resellers creating clients simultaneously

### Security Testing
- SQL injection attempts
- JWT token manipulation
- Rate limiting validation
- Idempotency key verification

### Integration Testing
- Stripe webhook processing
- Multi-device synchronization
- Profile switching
- Credit deduction atomicity

---

*This document serves as a comprehensive guide for understanding real-world usage patterns and testing requirements for the SyncStream TV platform.*
