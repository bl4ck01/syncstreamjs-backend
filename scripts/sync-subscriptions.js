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

async function syncSubscriptions(userEmail = null) {
    console.log('=== Manual Subscription Sync Tool ===\n');

    try {
        // Get users to sync
        let users;
        if (userEmail) {
            console.log(`Syncing subscription for user: ${userEmail}`);
            const result = await db.query(
                'SELECT id, email, stripe_customer_id FROM users WHERE email = $1',
                [userEmail]
            );
            users = result.rows;
            
            if (users.length === 0) {
                console.log(`❌ User not found: ${userEmail}`);
                return;
            }
        } else {
            console.log('Syncing all users with Stripe customer IDs...');
            const result = await db.query(
                'SELECT id, email, stripe_customer_id FROM users WHERE stripe_customer_id IS NOT NULL'
            );
            users = result.rows;
        }

        console.log(`Found ${users.length} user(s) to sync\n`);

        let synced = 0;
        let errors = 0;

        for (const user of users) {
            console.log(`\nProcessing user: ${user.email}`);
            
            if (!user.stripe_customer_id) {
                console.log('  ⚠️  No Stripe customer ID');
                continue;
            }

            try {
                // Get active subscriptions from Stripe
                const subscriptions = await stripe.subscriptions.list({
                    customer: user.stripe_customer_id,
                    status: 'all',
                    limit: 10
                });

                if (subscriptions.data.length === 0) {
                    console.log('  No subscriptions found in Stripe');
                    continue;
                }

                // Process each subscription
                for (const subscription of subscriptions.data) {
                    console.log(`\n  Subscription: ${subscription.id}`);
                    console.log(`  Status: ${subscription.status}`);
                    console.log(`  Price: ${subscription.items.data[0].price.id}`);

                    // Check if subscription exists in database
                    const existing = await db.query(
                        'SELECT id, status FROM subscriptions WHERE stripe_subscription_id = $1',
                        [subscription.id]
                    );

                    if (existing.rows.length > 0) {
                        const dbSub = existing.rows[0];
                        console.log(`  ✓ Found in database (status: ${dbSub.status})`);
                        
                        // Update if status is different
                        if (dbSub.status !== subscription.status) {
                            console.log(`  🔄 Updating status: ${dbSub.status} → ${subscription.status}`);
                            await updateSubscription(subscription);
                        }
                    } else {
                        console.log(`  ❌ NOT found in database!`);
                        console.log(`  ✨ Creating subscription record...`);
                        
                        // Get plan_id from metadata or match by price
                        let planId = subscription.metadata.plan_id;
                        
                        if (!planId) {
                            // Try to find plan by Stripe price ID
                            const planResult = await db.query(
                                'SELECT id FROM plans WHERE stripe_price_id = $1',
                                [subscription.items.data[0].price.id]
                            );
                            
                            if (planResult.rows.length > 0) {
                                planId = planResult.rows[0].id;
                            } else {
                                console.log(`  ⚠️  Could not find plan for price: ${subscription.items.data[0].price.id}`);
                                continue;
                            }
                        }

                        // Create subscription record
                        await db.query(`
                            INSERT INTO subscriptions (
                                user_id,
                                stripe_subscription_id,
                                stripe_price_id,
                                status,
                                current_period_start,
                                current_period_end,
                                cancel_at_period_end,
                                trial_end,
                                plan_id,
                                created_at,
                                updated_at
                            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10)
                        `, [
                            user.id,
                            subscription.id,
                            subscription.items.data[0].price.id,
                            subscription.status,
                            new Date(subscription.current_period_start * 1000),
                            new Date(subscription.current_period_end * 1000),
                            subscription.cancel_at_period_end,
                            subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
                            planId,
                            new Date(subscription.created * 1000)
                        ]);

                        console.log(`  ✅ Subscription created successfully`);
                        
                        // Mark trial as used if applicable
                        if (subscription.trial_end) {
                            await db.query(
                                'UPDATE users SET has_used_trial = TRUE WHERE id = $1',
                                [user.id]
                            );
                            console.log(`  ✅ Marked trial as used`);
                        }
                        
                        synced++;
                    }
                }
            } catch (error) {
                console.error(`  ❌ Error: ${error.message}`);
                errors++;
            }
        }

        console.log('\n=== Summary ===');
        console.log(`Users processed: ${users.length}`);
        console.log(`Subscriptions synced: ${synced}`);
        console.log(`Errors: ${errors}`);

    } catch (error) {
        console.error('Fatal error:', error.message);
    } finally {
        await db.end();
    }
}

async function updateSubscription(subscription) {
    const planId = subscription.metadata.plan_id;
    
    await db.query(`
        UPDATE subscriptions SET
            status = $1,
            stripe_price_id = $2,
            current_period_start = $3,
            current_period_end = $4,
            cancel_at_period_end = $5,
            trial_end = $6,
            plan_id = $7,
            updated_at = CURRENT_TIMESTAMP
        WHERE stripe_subscription_id = $8
    `, [
        subscription.status,
        subscription.items.data[0].price.id,
        new Date(subscription.current_period_start * 1000),
        new Date(subscription.current_period_end * 1000),
        subscription.cancel_at_period_end,
        subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
        planId,
        subscription.id
    ]);
}

// Parse command line arguments
const args = process.argv.slice(2);
const userEmail = args[0];

console.log('🔄 Starting subscription sync...\n');

if (userEmail && !userEmail.includes('@')) {
    console.log('Usage: node sync-subscriptions.js [user-email]');
    console.log('Example: node sync-subscriptions.js user@example.com');
    console.log('Or run without arguments to sync all users');
    process.exit(1);
}

syncSubscriptions(userEmail).catch(console.error);