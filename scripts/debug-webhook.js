#!/usr/bin/env node
import pg from 'pg';
import Stripe from 'stripe';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const { Pool } = pg;

// Initialize database connection
const db = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function checkWebhookConfiguration() {
    console.log('=== Webhook Debug Tool ===\n');

    // 1. Check environment variables
    console.log('1. Checking environment variables:');
    console.log(`   - STRIPE_SECRET_KEY: ${process.env.STRIPE_SECRET_KEY ? '✓ Set' : '✗ Missing'}`);
    console.log(`   - STRIPE_WEBHOOK_SECRET: ${process.env.STRIPE_WEBHOOK_SECRET ? '✓ Set' : '✗ Missing'}`);
    console.log(`   - Webhook secret format: ${process.env.STRIPE_WEBHOOK_SECRET?.startsWith('whsec_') ? '✓ Valid' : '✗ Invalid'}`);
    console.log();

    // 2. List webhook endpoints
    console.log('2. Checking Stripe webhook endpoints:');
    try {
        const webhookEndpoints = await stripe.webhookEndpoints.list({ limit: 10 });
        
        if (webhookEndpoints.data.length === 0) {
            console.log('   ✗ No webhook endpoints configured in Stripe!');
            console.log('   → You need to create a webhook endpoint in Stripe Dashboard');
            console.log(`   → URL should be: ${process.env.API_URL || 'http://your-server.com'}/webhooks/stripe`);
        } else {
            console.log(`   Found ${webhookEndpoints.data.length} webhook endpoint(s):`);
            webhookEndpoints.data.forEach((endpoint, index) => {
                console.log(`\n   Endpoint ${index + 1}:`);
                console.log(`   - URL: ${endpoint.url}`);
                console.log(`   - Status: ${endpoint.status}`);
                console.log(`   - Events: ${endpoint.enabled_events.length} event types`);
                console.log(`   - Created: ${new Date(endpoint.created * 1000).toISOString()}`);
                
                // Check if it includes the required events
                const requiredEvents = [
                    'customer.subscription.created',
                    'customer.subscription.updated',
                    'customer.subscription.deleted',
                    'checkout.session.completed',
                    'invoice.paid',
                    'invoice.payment_failed'
                ];
                
                const missingEvents = requiredEvents.filter(event => 
                    !endpoint.enabled_events.includes(event) && 
                    !endpoint.enabled_events.includes('*')
                );
                
                if (missingEvents.length > 0) {
                    console.log(`   ⚠️  Missing events: ${missingEvents.join(', ')}`);
                }
            });
        }
    } catch (error) {
        console.log(`   ✗ Error fetching webhooks: ${error.message}`);
        console.log('   → Make sure your STRIPE_SECRET_KEY has the necessary permissions');
    }
    console.log();

    // 3. Check recent events
    console.log('3. Checking recent Stripe events:');
    try {
        const events = await stripe.events.list({
            limit: 10,
            types: [
                'checkout.session.completed',
                'customer.subscription.created',
                'customer.subscription.updated'
            ]
        });

        if (events.data.length === 0) {
            console.log('   No recent subscription events found');
        } else {
            console.log(`   Found ${events.data.length} recent event(s):`);
            events.data.forEach((event, index) => {
                console.log(`\n   Event ${index + 1}:`);
                console.log(`   - Type: ${event.type}`);
                console.log(`   - Created: ${new Date(event.created * 1000).toISOString()}`);
                console.log(`   - Delivered: ${event.request ? (event.request.idempotency_key ? '✓' : '✗') : 'Unknown'}`);
                
                if (event.type === 'checkout.session.completed') {
                    const session = event.data.object;
                    console.log(`   - Customer: ${session.customer}`);
                    console.log(`   - Subscription: ${session.subscription}`);
                    console.log(`   - Payment Status: ${session.payment_status}`);
                }
            });
        }
    } catch (error) {
        console.log(`   ✗ Error fetching events: ${error.message}`);
    }
    console.log();

    // 4. Check database for recent subscriptions
    console.log('4. Checking database for recent subscriptions:');
    try {
        const result = await db.query(`
            SELECT 
                s.id,
                s.stripe_subscription_id,
                s.status,
                s.created_at,
                u.email,
                p.name as plan_name
            FROM subscriptions s
            JOIN users u ON s.user_id = u.id
            JOIN plans p ON s.plan_id = p.id
            ORDER BY s.created_at DESC
            LIMIT 5
        `);

        if (result.rows.length === 0) {
            console.log('   No subscriptions found in database');
        } else {
            console.log(`   Found ${result.rows.length} recent subscription(s):`);
            result.rows.forEach((sub, index) => {
                console.log(`\n   Subscription ${index + 1}:`);
                console.log(`   - User: ${sub.email}`);
                console.log(`   - Plan: ${sub.plan_name}`);
                console.log(`   - Status: ${sub.status}`);
                console.log(`   - Stripe ID: ${sub.stripe_subscription_id}`);
                console.log(`   - Created: ${sub.created_at}`);
            });
        }
    } catch (error) {
        console.log(`   ✗ Error querying database: ${error.message}`);
    }
    console.log();

    // 5. Test webhook endpoint locally
    console.log('5. Testing webhook locally:');
    console.log(`   To test your webhook locally, use Stripe CLI:`);
    console.log(`   1. Install: brew install stripe/stripe-cli/stripe`);
    console.log(`   2. Login: stripe login`);
    console.log(`   3. Forward: stripe listen --forward-to localhost:3000/webhooks/stripe`);
    console.log(`   4. Copy the webhook secret it gives you to your .env file`);
    console.log(`   5. Trigger: stripe trigger checkout.session.completed`);
    console.log();

    console.log('=== Troubleshooting Steps ===');
    console.log('1. Make sure your webhook is configured in Stripe Dashboard');
    console.log('2. Verify the webhook secret matches what\'s in your .env file');
    console.log('3. Check that your server is accessible from the internet');
    console.log('4. Look for webhook logs in your server console');
    console.log('5. Use Stripe CLI for local testing');

    await db.end();
}

checkWebhookConfiguration().catch(console.error);