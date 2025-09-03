# SyncStream TV - User Scenarios & Workflows

## Table of Contents
1. [End User Scenarios](#end-user-scenarios)
2. [Reseller Scenarios](#reseller-scenarios)
3. [Admin Scenarios](#admin-scenarios)
4. [System Integration Scenarios](#system-integration-scenarios)
5. [New Features & Implementations](#new-features--implementations)

---

## End User Scenarios

### Scenario 1: New User Trial Journey
**User:** John, a cord-cutter looking for IPTV management solution

#### Flow:
1. **Discovery & Signup**
   ```
   POST /api/v1/auth/signup
   {
     "email": "john@example.com",
     "password": "securePass123",
     "full_name": "John Doe"
   }
   ```

2. **Profile Creation for Family**
   ```
   POST /api/v1/profiles (Default profile created automatically)
   
   POST /api/v1/profiles (Wife's profile)
   {
     "name": "Sarah",
     "avatar_url": "https://example.com/sarah.jpg"
   }
   
   POST /api/v1/profiles (Kids profile with PIN)
   {
     "name": "Kids",
     "is_kids_profile": true,
     "parental_pin": "1234"
   }
   ```

3. **Add IPTV Playlist**
   ```
   POST /api/v1/playlists
   {
     "name": "Premium IPTV Service",
     "url": "http://iptv-provider.com/get.php",
     "username": "john_iptv",
     "password": "iptv_pass_2024"
   }
   ```

4. **Start Using Features**
   ```
   POST /api/v1/favorites (Add favorite channels)
   {
     "item_id": "espn_hd",
     "item_type": "channel",
     "item_name": "ESPN HD",
     "item_logo": "https://cdn.example.com/espn.png"
   }
   
   PUT /api/v1/progress (Track movie progress)
   {
     "item_id": "movie_inception",
     "item_type": "movie",
     "progress_seconds": 3600,
     "duration_seconds": 8880
   }
   ```

5. **Trial Ends - Subscribe**
   ```
   GET /api/v1/subscriptions/plans (View available plans)
   
   POST /api/v1/subscriptions/checkout
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
   POST /api/v1/auth/login (Smart TV app)
   POST /api/v1/profiles/maria_id/select
   GET /api/v1/playlists (Retrieve saved playlists)
   GET /api/v1/favorites?type=channel (Get favorite channels)
   ```

2. **Commute - Mobile Phone**
   ```
   POST /api/v1/auth/login (Mobile app)
   GET /api/v1/progress (Check last watched)
   PUT /api/v1/progress (Continue watching series)
   {
     "item_id": "series_got_s01e05",
     "item_type": "episode",
     "progress_seconds": 1200,
     "duration_seconds": 3600
   }
   ```

3. **Evening - Tablet**
   ```
   GET /api/v1/favorites (Browse favorites)
   POST /api/v1/favorites (Add new movie)
   GET /api/v1/progress/series_got_s01e05 (Resume from phone)
   ```

**Outcome:** Seamless experience across all devices with synchronized state.

---

### Scenario 3: Family Profile Management
**User:** Parent managing family viewing

#### Flow:
1. **Setup Kids Profile**
   ```
   POST /api/v1/profiles
   {
     "name": "Timmy",
     "is_kids_profile": true,
     "parental_pin": "9876",
     "avatar_url": "https://cdn.example.com/avatars/dinosaur.png"
   }
   ```

2. **Kids Try to Access Adult Profile**
   ```
   POST /api/v1/profiles/adult_profile_id/select
   {
     "pin": "1234"  // Wrong PIN
   }
   // Returns: Error - Invalid PIN
   ```

3. **Parent Updates Restrictions**
   ```
   PATCH /api/v1/profiles/kids_profile_id
   {
     "parental_pin": "5555"  // Change PIN
   }
   ```

**Outcome:** Parents maintain control over content access while kids have their personalized space.

---

### Scenario 4: Multi-Language User Experience
**User:** Carlos, Spanish-speaking user

#### Flow:
1. **Language Detection**
   ```
   GET /api/v1/languages (Available languages)
   // Accept-Language: es-ES,es;q=0.9,en;q=0.8
   // System automatically detects Spanish preference
   ```

2. **Localized Content**
   ```
   GET /api/v1/profiles (Profiles with Spanish labels)
   GET /api/v1/subscriptions/plans (Plans in Spanish)
   // All error messages and UI text in Spanish
   ```

3. **Language Switching**
   ```
   GET /api/v1/profiles?lang=en (Switch to English)
   GET /api/v1/favorites?lang=es (Switch back to Spanish)
   ```

**Outcome:** Carlos enjoys a fully localized experience in his preferred language.

---

## Reseller Scenarios

### Scenario 5: Reseller Business Operations
**User:** Alex, runs a local IPTV service business

#### Flow:
1. **Admin Grants Reseller Access**
   ```
   // Admin action
   PATCH /api/v1/admin/users/alex_user_id/role
   {
     "role": "reseller"
   }
   
   POST /api/v1/admin/credits/add
   {
     "user_id": "alex_user_id",
     "amount": 10000,
     "description": "Initial reseller credit package"
   }
   ```

2. **Reseller Checks Dashboard**
   ```
   GET /api/v1/reseller/dashboard
   // Returns: credits_balance: 10000, total_clients: 0
   ```

3. **Create Client for Local Customer**
   ```
   POST /api/v1/reseller/clients
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
   GET /api/v1/reseller/clients?page=1&limit=20
   GET /api/v1/reseller/transactions
   // Track credit usage and client status
   ```

5. **Handle Support Request**
   ```
   GET /api/v1/reseller/clients (Find specific client)
   // Reseller provides support directly
   ```

**Business Model:** Alex charges customers $10/month, pays ~$5 in credits, makes $5 profit per client.

---

### Scenario 6: Reseller Scaling Operations
**User:** TechIPTV Company, large-scale reseller

#### Flow:
1. **Bulk Credit Purchase**
   ```
   // Negotiated with admin for bulk discount
   // Admin adds 100,000 credits for $4,000 (bulk rate)
   POST /api/v1/admin/credits/add
   {
     "user_id": "techiptv_id",
     "amount": 100000,
     "description": "Bulk credit purchase - Invoice #INV-2024-001"
   }
   ```

2. **Automated Client Creation**
   ```
   // Their system integrates with API
   POST /api/v1/reseller/clients
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
   GET /api/v1/reseller/transactions?page=1&limit=1000
   GET /api/v1/reseller/clients?page=1&limit=1000
   // Generate business reports
   ```

**Outcome:** Manages hundreds of clients efficiently with automated systems.

---

## Admin Scenarios

### Scenario 7: Admin Daily Operations
**User:** System Administrator

#### Flow:
1. **Morning Check**
   ```
   POST /api/v1/auth/login (Admin login)
   GET /api/v1/admin/stats
   // Review: total_users: 5420, active_subscriptions: 3200, mrr: $31,995
   ```

2. **Handle Reseller Request**
   ```
   GET /api/v1/admin/users?search=potential_reseller@email.com
   PATCH /api/v1/admin/users/user_id/role
   {
     "role": "reseller"
   }
   
   POST /api/v1/admin/credits/add
   {
     "user_id": "user_id",
     "amount": 5000,
     "description": "New reseller initial credits"
   }
   ```

3. **Plan Management**
   ```
   POST /api/v1/admin/plans
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
   GET /api/v1/admin/users/troubled_user_id
   // Investigate subscription issues
   // Manually adjust if needed
   ```

**Outcome:** Maintains smooth platform operations and supports business growth.

---

### Scenario 8: Admin Crisis Management
**User:** Admin handling payment processing issue

#### Flow:
1. **Detect Issue**
   ```
   // Multiple webhook failures noticed
   GET /api/v1/admin/stats
   // Unusual pattern in subscription stats
   ```

2. **Investigate**
   ```
   GET /api/v1/admin/users?page=1&limit=50
   // Check recent signups and subscription status
   ```

3. **Manual Intervention**
   ```
   // For affected users, manually add credits as compensation
   POST /api/v1/admin/credits/add
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

### Scenario 9: Admin Analytics & Business Intelligence
**User:** Admin analyzing platform performance

#### Flow:
1. **User Growth Analysis**
   ```
   GET /api/v1/analytics/users?startDate=2024-01-01&endDate=2024-12-31&groupBy=month
   // Analyze user acquisition trends
   ```

2. **Revenue Performance**
   ```
   GET /api/v1/analytics/revenue?startDate=2024-01-01&endDate=2024-12-31&groupBy=month
   // Track MRR, churn, and revenue growth
   ```

3. **Reseller Performance**
   ```
   GET /api/v1/analytics/resellers?startDate=2024-01-01&endDate=2024-12-31
   // Monitor reseller effectiveness and credit usage
   ```

4. **Platform Health**
   ```
   GET /api/v1/analytics/platform?startDate=2024-01-01&endDate=2024-12-31
   // Check API usage, error rates, and performance metrics
   ```

**Outcome:** Data-driven decisions for platform optimization and business growth.

---

## System Integration Scenarios

### Scenario 10: Stripe Webhook Flow
**Actor:** Stripe Payment System

#### Flow:
1. **User Subscribes**
   ```
   // User completes Stripe Checkout
   // Stripe sends webhook
   POST /api/v1/webhooks/stripe
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
   POST /api/v1/webhooks/stripe
   {
     "type": "invoice.paid",
     "data": {...}
   }
   // Confirms continued access
   ```

4. **Failed Payment**
   ```
   POST /api/v1/webhooks/stripe
   {
     "type": "invoice.payment_failed",
     "data": {...}
   }
   // Initiates grace period
   // Notifies user (future feature)
   ```

**Outcome:** Automated subscription lifecycle management.

---

### Scenario 11: Mobile App Integration
**Actor:** SyncStream Mobile App

#### Flow:
1. **App Launch**
   ```
   GET /api/v1/health (Check API availability)
   POST /api/v1/auth/login (Stored credentials)
   GET /api/v1/profiles (Load user profiles)
   ```

2. **Profile Selection**
   ```
   POST /api/v1/profiles/profile_id/select
   {
     "pin": "1234"  // If required
   }
   ```

3. **Sync Operations**
   ```
   GET /api/v1/playlists (Download playlist data)
   GET /api/v1/favorites (Sync favorites)
   GET /api/v1/progress (Get watch progress)
   ```

4. **Background Sync**
   ```
   PUT /api/v1/progress (Periodic progress updates)
   {
     "item_id": "current_watching",
     "progress_seconds": 1800
   }
   ```

**Outcome:** Native mobile experience with full feature parity.

---

### Scenario 12: IPTV Player Integration
**Actor:** Third-party IPTV Player (Tivimate, IPTV Smarters)

#### Flow:
1. **User Configures Player**
   ```
   GET /api/v1/playlists/playlist_id
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
   PUT /api/v1/progress
   {
     "item_id": "channel_or_vod_id",
     "progress_seconds": 0
   }
   ```

**Outcome:** SyncStream complements existing IPTV players without replacing them.

---

## New Features & Implementations

### Scenario 13: Rate Limiting & API Protection
**Actor:** System protecting against abuse

#### Flow:
1. **Normal User Activity**
   ```
   // User makes 50 requests in 15 minutes
   // Rate limit: 100 requests per 15 minutes
   // Response includes headers:
   // X-RateLimit-Limit: 100
   // X-RateLimit-Remaining: 50
   // X-RateLimit-Reset: 2024-01-15T10:30:00.000Z
   ```

2. **Premium User Activity**
   ```
   // Premium user gets higher limits
   // Rate limit: 500 requests per 15 minutes
   // Headers reflect premium status
   ```

3. **Rate Limit Exceeded**
   ```
   // User exceeds limit
   // Response: 429 Too Many Requests
   // Headers: Retry-After: 900
   // Message: "Rate limit exceeded. Please retry after 900 seconds"
   ```

**Outcome:** Platform protection against abuse while maintaining user experience.

---

### Scenario 14: Mobile Optimization & Performance
**Actor:** Mobile app users

#### Flow:
1. **Device Detection**
   ```
   // System detects mobile device
   // User-Agent: Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)
   // Automatically optimizes response for mobile
   ```

2. **Bandwidth Optimization**
   ```
   // Mobile users get optimized responses
   // Fewer fields, compressed data
   // Reduced payload size for mobile networks
   ```

3. **Performance Monitoring**
   ```
   // System tracks response times
   // Mobile-specific performance metrics
   // Optimization based on device type
   ```

**Outcome:** Optimized mobile experience with faster loading and reduced data usage.

---

### Scenario 15: Internationalization (i18n) Support
**Actor:** Global users

#### Flow:
1. **Language Detection**
   ```
   // System detects user's preferred language
   // Accept-Language: fr-FR,fr;q=0.9,en;q=0.8
   // Automatically serves French content
   ```

2. **Localized Responses**
   ```
   // All messages in French
   // Error messages: "Mot de passe incorrect"
   // Success messages: "Profil créé avec succès"
   ```

3. **Language Switching**
   ```
   // User can override language
   // GET /api/v1/profiles?lang=en
   // Temporarily switches to English
   ```

**Outcome:** Global accessibility with native language support.

---

### Scenario 16: Advanced Analytics Dashboard
**Actor:** Business stakeholders

#### Flow:
1. **User Growth Metrics**
   ```
   GET /api/v1/analytics/users?groupBy=week
   // Weekly user acquisition trends
   // Trial conversion rates
   // User retention analysis
   ```

2. **Revenue Analytics**
   ```
   GET /api/v1/analytics/revenue?groupBy=month
   // Monthly recurring revenue (MRR)
   // Churn analysis
   // Plan distribution
   ```

3. **Reseller Performance**
   ```
   GET /api/v1/analytics/resellers
   // Credit usage patterns
   // Client acquisition rates
   // Reseller profitability
   ```

4. **Platform Health**
   ```
   GET /api/v1/analytics/platform
   // API performance metrics
   // Error rate monitoring
   // System resource usage
   ```

**Outcome:** Data-driven business decisions and platform optimization.

---

### Scenario 17: Idempotency & Transaction Safety
**Actor:** High-frequency API users

#### Flow:
1. **Reseller Creating Multiple Clients**
   ```
   // Reseller system sends multiple requests
   // Headers: Idempotency-Key: "client-12345"
   // First request: Creates client
   // Duplicate requests: Returns same response
   ```

2. **Credit Purchase Safety**
   ```
   // User initiates credit purchase
   // Idempotency-Key: "purchase-67890"
   // Prevents double-charging
   // Ensures transaction consistency
   ```

3. **Webhook Processing**
   ```
   // Stripe sends duplicate webhooks
   // System checks idempotency
   // Prevents duplicate processing
   // Maintains data integrity
   ```

**Outcome:** Reliable API operations with protection against duplicate requests.

---

### Scenario 18: Watch Party (CineSync) - Current Implementation
**Actor:** Users wanting synchronized viewing experience

#### Current Status: **WebSocket service implemented but not integrated**

#### Flow (When Integrated):
1. **Create Watch Party**
   ```
   // WebSocket connection: ws://api.syncstream.tv/ws/connect?token=jwt_token
   // Message: { "type": "party:create", "data": { "userName": "John" } }
   // Response: { "type": "party:create", "data": { "roomId": "party_123", "isHost": true } }
   ```

2. **Join Watch Party**
   ```
   // Message: { "type": "party:join", "data": { "roomId": "party_123", "userName": "Sarah" } }
   // System adds user to room
   // Broadcasts user joined to all participants
   ```

3. **Synchronized Playback**
   ```
   // Host controls playback
   // Message: { "type": "party:play", "data": { "currentTime": 1800 } }
   // All users receive synchronized play command
   ```

4. **Real-time Chat**
   ```
   // Message: { "type": "party:chat", "data": { "message": "Great scene!" } }
   // Broadcasts to all room participants
   ```

**Current Implementation Details:**
- WebSocket service exists at `src/websocket/index.js`
- Uses Elysia.js WebSocket support
- Implements WatchPartyRoom class with full functionality
- **Not currently integrated into main application**
- **Requires integration into main server for full functionality**

**Integration Required:**
```javascript
// In src/index.js, add:
import { websocketPlugin } from './websocket/index.js';

// Add to app:
.use(websocketPlugin)
```

**Outcome:** When integrated, provides real-time synchronized viewing experience with chat functionality.

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

### Email Notification System
```
POST /api/v1/notifications/send
POST /api/v1/notifications/templates
```

### Recommendation Engine
```
GET /api/v1/recommendations/for-you
GET /api/v1/recommendations/similar/{item_id}
```

### Advanced Search & Discovery
```
GET /api/v1/search/content?q=action+movies
GET /api/v1/discovery/trending
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

### Performance Testing
- Rate limiting under load
- Mobile optimization validation
- Multi-language response times
- WebSocket connection scaling

---

*This document serves as a comprehensive guide for understanding real-world usage patterns and testing requirements for the SyncStream TV platform. Updated to reflect all implemented features including i18n, rate limiting, optimization, analytics, reseller system, and current Watch Party implementation status.*