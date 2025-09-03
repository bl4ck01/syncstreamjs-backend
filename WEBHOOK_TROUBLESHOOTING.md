# Webhook Troubleshooting Guide

## Problem Summary

Your user successfully completed a Stripe checkout (redirected to success page), but their subscription isn't showing in the database. This indicates that the webhook events from Stripe aren't being processed.

**Fixed Issues:**
- ✅ Column name error: Changed `first_name`/`last_name` to `full_name` (matches database schema)
- ✅ Added proper error handling and logging for debugging
- ✅ Created backend success/cancel routes to replace frontend

## Root Causes

Based on the code analysis, here are the most likely issues:

### 1. **Webhook Endpoint Not Configured in Stripe Dashboard**

The webhook endpoint needs to be registered in your Stripe Dashboard:
- Go to https://dashboard.stripe.com/webhooks
- Click "Add endpoint"
- Enter your webhook URL: `https://your-domain.com/api/v1/webhooks/stripe`
- Select these events:
  - `customer.subscription.created` ✅ (Critical - creates the subscription record)
  - `customer.subscription.updated` ✅ (Critical - updates subscription status)
  - `customer.subscription.deleted`
  - `checkout.session.completed`
  - `invoice.paid`
  - `invoice.payment_failed`
  - `customer.subscription.trial_will_end`

### 2. **Webhook Secret Mismatch**

The `STRIPE_WEBHOOK_SECRET` in your `.env` file must match the signing secret from Stripe:
1. In Stripe Dashboard, go to your webhook endpoint
2. Click "Reveal" under "Signing secret"
3. Copy the secret (starts with `whsec_`)
4. Update your `.env` file:
   ```
   STRIPE_WEBHOOK_SECRET=whsec_your_actual_secret_here
   ```

### 3. **Server Not Accessible**

If running locally, Stripe can't reach your localhost. Solutions:
- Use ngrok: `ngrok http 3000`
- Use Stripe CLI: `stripe listen --forward-to localhost:3000/api/v1/webhooks/stripe`
- Deploy to a staging server

### 4. **Webhook Event Order**

The subscription creation flow is:
1. User completes checkout → `checkout.session.completed` event
2. Stripe creates subscription → `customer.subscription.created` event ✅ (This creates the DB record)
3. Payment processed → `invoice.paid` event

Your logs show only the checkout started, but not the webhook events.

## Quick Diagnosis Steps

### Step 1: Check Environment Variables
```bash
# Check if webhook secret is set
grep STRIPE_WEBHOOK_SECRET .env
```

### Step 2: Test Webhook Endpoint Manually
```bash
# Test if endpoint is accessible
curl -X POST http://localhost:3000/api/v1/webhooks/stripe \
  -H "Content-Type: application/json" \
  -H "stripe-signature: test" \
  -d '{"test": "data"}'

# Test success endpoint
curl "http://localhost:3000/api/v1/webhooks/success?session_id=cs_test_demo"

# Test cancel endpoint  
curl "http://localhost:3000/api/v1/webhooks/cancel?session_id=cs_test_demo"
```

You should get an error about signature verification for the webhook, which means the endpoint is reachable.
The success/cancel endpoints should return JSON responses.

### Step 3: Use Stripe CLI for Local Testing
```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login to Stripe
stripe login

# Forward webhooks to your local server
stripe listen --forward-to localhost:3000/api/v1/webhooks/stripe

# Copy the webhook secret it displays and update your .env file

# In another terminal, trigger a test event
stripe trigger checkout.session.completed
```

### Step 4: Check Server Logs
Look for these log entries:
- `[WEBHOOK] Webhook endpoint called` - Webhook received
- `[WEBHOOK] Signature verified successfully` - Authentication passed
- `[WEBHOOK] Processing event: customer.subscription.created` - Creating subscription
- `[WEBHOOK] Subscription created: sub_xxx` - Success

### Step 5: Run Debug Script
```bash
node scripts/debug-webhook.js
```

This will:
- Check your environment variables
- List configured webhooks in Stripe
- Show recent events
- Display recent subscriptions in database

### Step 6: Test Success/Cancel Endpoints
```bash
# Test the endpoints that replace the frontend
curl "http://localhost:3000/api/v1/webhooks/success?session_id=cs_test_demo"
curl "http://localhost:3000/api/v1/webhooks/cancel?session_id=cs_test_demo"

# Or visit in browser
http://localhost:3000/test-subscription

# Or run the automated test script
node scripts/test-endpoints.js
```

## Common Fixes

### Fix 1: For Local Development
```bash
# Use Stripe CLI to forward webhooks
stripe listen --forward-to localhost:3000/api/v1/webhooks/stripe

# Update .env with the webhook secret from CLI output
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxx

# Update .env with success/cancel URLs (replaces frontend)
STRIPE_SUCCESS_URL=http://localhost:3000/api/v1/webhooks/success?session_id={CHECKOUT_SESSION_ID}
STRIPE_CANCEL_URL=http://localhost:3000/api/v1/webhooks/cancel?session_id={CHECKOUT_SESSION_ID}
SUPPORT_EMAIL=support@yourdomain.com
```

### Fix 2: For Production
1. Add webhook endpoint in Stripe Dashboard
2. Use HTTPS URL: `https://your-domain.com/api/v1/webhooks/stripe`
3. Copy signing secret to environment variables
4. Update environment variables:
   ```
   STRIPE_SUCCESS_URL=https://your-domain.com/api/v1/webhooks/success?session_id={CHECKOUT_SESSION_ID}
   STRIPE_CANCEL_URL=https://your-domain.com/api/v1/webhooks/cancel?session_id={CHECKOUT_SESSION_ID}
   SUPPORT_EMAIL=support@yourdomain.com
   ```
5. Restart your server

### Fix 3: Verify Webhook Processing
Add temporary logging to `src/routes/webhooks.js`:
```javascript
.post('/stripe', async ({ request, db, set }) => {
    console.log('[WEBHOOK] Headers:', Object.fromEntries(request.headers.entries()));
    console.log('[WEBHOOK] Webhook endpoint called at:', new Date().toISOString());
    // ... rest of the code
})
```

## Expected Flow

When working correctly, you should see:

1. **Browser**: User completes checkout → Redirected to success page
2. **Server Logs**:
   ```
   [SUBSCRIPTION] Checkout started for user xxx, plan: Starter Plan
   [WEBHOOK] Webhook endpoint called
   [WEBHOOK] Signature verified successfully
   [WEBHOOK] Processing event: checkout.session.completed
   [WEBHOOK] Checkout completed: cs_xxx
   [WEBHOOK] - User ID: xxx
   [WEBHOOK] - Subscription ID: sub_xxx
   [WEBHOOK] Expecting subscription.created event for: sub_xxx
   [WEBHOOK] Event processed successfully: checkout.session.completed
   
   [WEBHOOK] Webhook endpoint called
   [WEBHOOK] Signature verified successfully
   [WEBHOOK] Processing event: customer.subscription.created
   [WEBHOOK] Subscription update: sub_xxx for user: xxx
   [WEBHOOK] Subscription created: sub_xxx
   [WEBHOOK] Event processed successfully: customer.subscription.created
   ```
3. **Database**: New record in `subscriptions` table
4. **API**: `/subscriptions/current` returns the active subscription

## Next Steps

1. Check if webhooks are configured in Stripe Dashboard
2. Verify webhook secret matches between Stripe and your `.env`
3. Use Stripe CLI for local testing
4. Check server logs for webhook reception
5. Run the debug script to diagnose the issue

The most common issue is that the webhook endpoint isn't configured in Stripe or isn't accessible from the internet.
