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

async function checkSubscriptionStatus(userEmail) {
    console.log('🔍 Checking Subscription Status\n');

    try {
        // 1. Find user in database
        console.log(`1. Looking for user: ${userEmail}`);
        const userResult = await db.query(
            'SELECT id, email, full_name, stripe_customer_id FROM users WHERE email = $1',
            [userEmail]
        );

        if (userResult.rows.length === 0) {
            console.log('   ❌ User not found in database');
            return;
        }

        const user = userResult.rows[0];
        console.log(`   ✅ User found: ${user.full_name} (ID: ${user.id})`);
        console.log(`   📧 Stripe Customer ID: ${user.stripe_customer_id || 'Not set'}`);

        // 2. Check database subscriptions
        console.log('\n2. Checking database subscriptions...');
        const dbSubs = await db.query(
            'SELECT * FROM subscriptions WHERE user_id = $1 ORDER BY created_at DESC',
            [user.id]
        );

        if (dbSubs.rows.length === 0) {
            console.log('   ❌ No subscriptions found in database');
        } else {
            console.log(`   ✅ Found ${dbSubs.rows.length} subscription(s) in database:`);
            dbSubs.rows.forEach((sub, index) => {
                console.log(`      ${index + 1}. ${sub.stripe_subscription_id} - ${sub.status}`);
            });
        }

        // 3. Check Stripe subscriptions
        console.log('\n3. Checking Stripe subscriptions...');
        if (!user.stripe_customer_id) {
            console.log('   ⚠️  No Stripe customer ID - cannot check Stripe');
        } else {
            try {
                const stripeSubs = await stripe.subscriptions.list({
                    customer: user.stripe_customer_id,
                    limit: 10
                });

                if (stripeSubs.data.length === 0) {
                    console.log('   ❌ No subscriptions found in Stripe');
                } else {
                    console.log(`   ✅ Found ${stripeSubs.data.length} subscription(s) in Stripe:`);
                    stripeSubs.data.forEach((sub, index) => {
                        console.log(`      ${index + 1}. ${sub.id} - ${sub.status} - ${sub.metadata?.plan_id || 'No plan ID'}`);
                    });
                }
            } catch (error) {
                console.log(`   ❌ Error checking Stripe: ${error.message}`);
            }
        }

        // 4. Check specific subscription from success response
        console.log('\n4. Checking specific subscription from success response...');
        const subscriptionId = 'sub_1S3K36FLJ9MJrHJK5TP4ixYq';
        
        try {
            const stripeSub = await stripe.subscriptions.retrieve(subscriptionId);
            console.log(`   ✅ Stripe subscription found: ${stripeSub.id}`);
            console.log(`      Status: ${stripeSub.status}`);
            console.log(`      Customer: ${stripeSub.customer}`);
            console.log(`      Plan: ${stripeSub.items.data[0]?.price.id || 'Unknown'}`);
            console.log(`      Metadata:`, stripeSub.metadata);

            // Check if it exists in database
            const dbSub = await db.query(
                'SELECT * FROM subscriptions WHERE stripe_subscription_id = $1',
                [subscriptionId]
            );

            if (dbSub.rows.length === 0) {
                console.log(`   ❌ Subscription NOT found in database - this is the problem!`);
                console.log(`   💡 The webhook never processed this subscription`);
            } else {
                console.log(`   ✅ Subscription found in database`);
            }
        } catch (error) {
            console.log(`   ❌ Error retrieving subscription: ${error.message}`);
        }

        // 5. Recommendations
        console.log('\n🎯 Recommendations:');
        if (dbSubs.rows.length === 0) {
            console.log('   - Run: node scripts/sync-subscriptions.js user01@gmail.com');
            console.log('   - Check webhook configuration in Stripe Dashboard');
            console.log('   - Verify STRIPE_WEBHOOK_SECRET in your .env file');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await db.end();
    }
}

// Get user email from command line or use default
const args = process.argv.slice(2);
const userEmail = args[0] || 'user01@gmail.com';

console.log(`🔍 Checking subscription status for: ${userEmail}\n`);
checkSubscriptionStatus(userEmail).catch(console.error);
