# Security & Subscription Event Logging Implementation

## Overview

I've implemented a comprehensive logging system for security and subscription events in the SyncStream backend. This system tracks all authentication attempts, subscription changes, and payment-related activities.

## Database Schema

### 1. Security Events Table (`security_events`)
- Tracks all authentication and security-related events
- Fields include:
  - `event_type`: Type of security event (login, logout, failed attempts, etc.)
  - `user_id`: Reference to the user (nullable for failed logins)
  - `email`: Email used in the attempt
  - `ip_address`: Client IP address
  - `user_agent`: Browser/client information
  - `success`: Boolean indicating if the action was successful
  - `failure_reason`: Reason for failure (if applicable)
  - `metadata`: JSONB field for additional context
  - `created_at`: Timestamp of the event

### 2. Subscription Events Table (`subscription_events`)
- Tracks all subscription lifecycle events
- Fields include:
  - `event_type`: Type of subscription event
  - `user_id`: Reference to the user
  - `subscription_id`: Reference to local subscription record
  - `stripe_subscription_id`: Stripe's subscription ID
  - `stripe_event_id`: Unique Stripe webhook event ID (prevents duplicates)
  - `plan_id`: Current plan
  - `previous_plan_id`: Previous plan (for upgrades/downgrades)
  - `amount`: Transaction amount
  - `currency`: Transaction currency
  - `metadata`: JSONB field for additional context
  - `created_at`: Timestamp of the event

## Event Types

### Security Events
- `LOGIN_ATTEMPT`: User attempts to log in
- `LOGIN_SUCCESS`: Successful login
- `LOGIN_FAILED`: Failed login attempt
- `LOGIN_BLOCKED`: Too many failed attempts
- `LOGOUT`: User logs out
- `REGISTER_ATTEMPT`: Registration attempt
- `REGISTER_SUCCESS`: Successful registration
- `REGISTER_FAILED`: Failed registration
- `PASSWORD_RESET_REQUEST`: Password reset requested
- `PASSWORD_RESET_SUCCESS`: Password successfully reset
- `UNAUTHORIZED_ACCESS`: Unauthorized access attempt
- `PROFILE_PIN_FAILED`: Failed profile PIN entry
- `PROFILE_ACCESS_DENIED`: Profile access denied
- `SUSPICIOUS_ACTIVITY`: Multiple IPs detected
- `TOKEN_EXPIRED`: JWT token expired
- `TOKEN_INVALID`: Invalid JWT token

### Subscription Events
- `CHECKOUT_STARTED`: User starts checkout process
- `CHECKOUT_COMPLETED`: Checkout successfully completed
- `CHECKOUT_FAILED`: Checkout failed
- `SUBSCRIPTION_CREATED`: New subscription created
- `SUBSCRIPTION_ACTIVATED`: Subscription activated
- `SUBSCRIPTION_UPDATED`: Subscription details updated
- `SUBSCRIPTION_UPGRADED`: Plan upgraded
- `SUBSCRIPTION_DOWNGRADED`: Plan downgraded
- `SUBSCRIPTION_CANCELED`: Subscription canceled
- `SUBSCRIPTION_REACTIVATED`: Canceled subscription reactivated
- `SUBSCRIPTION_EXPIRED`: Subscription expired
- `TRIAL_STARTED`: Trial period started
- `TRIAL_ENDING_SOON`: Trial ending notification
- `TRIAL_ENDED`: Trial period ended
- `TRIAL_CONVERTED`: Trial converted to paid
- `PAYMENT_SUCCESS`: Payment successful
- `PAYMENT_FAILED`: Payment failed
- `PAYMENT_RETRY`: Payment retry attempt
- `CREDITS_PURCHASED`: Credits purchased
- `CREDITS_APPLIED`: Credits applied
- `PLAN_CHANGE_REQUESTED`: Plan change requested
- `PLAN_CHANGE_SCHEDULED`: Plan change scheduled
- `PLAN_CHANGE_COMPLETED`: Plan change completed

## Logger Service (`/src/services/logger.js`)

The logger service provides:
1. **Event Logging Methods**:
   - `logSecurityEvent()`: Log security-related events
   - `logSubscriptionEvent()`: Log subscription-related events

2. **Security Features**:
   - Automatic IP address extraction from requests
   - User agent tracking
   - Rate limiting support (tracks failed login attempts)
   - Suspicious activity detection (multiple IPs)

3. **Analytics Methods**:
   - `getSecurityAnalytics()`: Security event statistics
   - `getSubscriptionAnalytics()`: Subscription revenue and event analytics
   - `getUserSecurityEvents()`: Get security events for a specific user
   - `getUserSubscriptionEvents()`: Get subscription events for a specific user

## Integration Points

### 1. Authentication Routes (`/src/routes/auth.js`)
- Logs all signup attempts, successes, and failures
- Tracks login attempts with rate limiting (5 attempts per 15 minutes)
- Detects suspicious activity (multiple IPs within 1 hour)
- Logs logout events
- Tracks unauthorized access attempts

### 2. Profile Routes (`/src/routes/profiles.js`)
- Logs failed PIN attempts
- Tracks profile access denials

### 3. Webhook Routes (`/src/routes/webhooks.js`)
- Comprehensive logging of all Stripe webhook events
- Tracks subscription lifecycle changes
- Logs payment successes and failures
- Records trial periods and conversions
- Monitors plan changes (upgrades/downgrades)
- Tracks credit purchases

### 4. Subscription Routes (`/src/routes/subscriptions.js`)
- Logs checkout initiation
- Tracks plan change requests
- Records subscription cancellations and reactivations

## Admin Endpoints

### 1. View Security Logs
```
GET /admin/logs/security
```
Query parameters:
- `page`: Page number (default: 1)
- `limit`: Results per page (default: 50)
- `user_id`: Filter by user ID
- `email`: Filter by email (partial match)
- `event_type`: Filter by event type
- `success`: Filter by success status (true/false)
- `start_date`: Filter events after this date
- `end_date`: Filter events before this date
- `ip_address`: Filter by IP address

### 2. View Subscription Logs
```
GET /admin/logs/subscriptions
```
Query parameters:
- `page`: Page number (default: 1)
- `limit`: Results per page (default: 50)
- `user_id`: Filter by user ID
- `subscription_id`: Filter by subscription ID
- `event_type`: Filter by event type
- `plan_id`: Filter by plan ID
- `start_date`: Filter events after this date
- `end_date`: Filter events before this date

### 3. Security Analytics
```
GET /admin/analytics/security
```
Query parameters:
- `days`: Number of days to analyze (default: 7)

Returns:
- Summary of event types with success rates
- Daily breakdown of events
- Failed login patterns

### 4. Subscription Analytics
```
GET /admin/analytics/subscriptions
```
Query parameters:
- `days`: Number of days to analyze (default: 7)

Returns:
- Total revenue for the period
- Event counts by type
- Revenue by event type
- Daily breakdown

### 5. User Activity
```
GET /admin/users/:id/activity
```
Query parameters:
- `type`: Filter by log type (all/security/subscription)
- `limit`: Maximum events to return (default: 100)

Returns merged timeline of all user activities.

## Security Benefits

1. **Fraud Detection**: Track suspicious patterns like multiple IP addresses or unusual activity
2. **Rate Limiting**: Prevent brute force attacks with built-in failed attempt tracking
3. **Audit Trail**: Complete history of all security and financial events
4. **Compliance**: Detailed logs for regulatory requirements
5. **Debugging**: Comprehensive event tracking for troubleshooting

## Performance Considerations

1. All logging operations are non-blocking (errors don't break the application)
2. Indexed columns for fast queries:
   - `user_id`, `email`, `event_type`, `created_at` (security_events)
   - `user_id`, `subscription_id`, `event_type`, `created_at` (subscription_events)
3. JSONB metadata fields for flexible additional data storage
4. Unique constraint on `stripe_event_id` prevents duplicate webhook processing

## Usage Example

```javascript
// In your route handler
await logger.logSecurityEvent({
    event_type: SECURITY_EVENTS.LOGIN_SUCCESS,
    user_id: user.id,
    email: user.email,
    success: true,
    request, // Pass the request object for IP/UA extraction
    metadata: {
        login_method: 'password',
        two_factor: false
    }
});

// Log subscription event
await logger.logSubscriptionEvent({
    event_type: SUBSCRIPTION_EVENTS.SUBSCRIPTION_UPGRADED,
    user_id: userId,
    subscription_id: subscription.id,
    stripe_subscription_id: subscription.stripe_subscription_id,
    plan_id: newPlan.id,
    previous_plan_id: oldPlan.id,
    amount: 9.99,
    currency: 'usd',
    metadata: {
        old_plan: 'basic',
        new_plan: 'premium'
    }
});
```

## Next Steps

1. Run database migration to create the new tables:
   ```bash
   node src/db/migrate.js
   ```

2. Test the logging system:
   - Try login attempts (successful and failed)
   - Create test subscriptions
   - Check admin endpoints for log viewing

3. Consider adding:
   - Email alerts for critical events
   - Log retention policies
   - Export functionality for logs
   - Real-time dashboard for monitoring