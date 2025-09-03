#!/usr/bin/env bun

import Stripe from 'stripe';
import { config } from 'dotenv';
import { Pool } from 'pg';

// Load environment variables
config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

console.log('🔄 Starting Database to Stripe Sync...');

async function syncDbToStripe() {
    try {
        console.log('📊 Fetching local database plans...');
        
        // Get all active plans from database
        const localPlans = await pool.query(`
            SELECT * FROM plans 
            WHERE is_active = TRUE 
            ORDER BY price_monthly ASC
        `);

        console.log(`📋 Found ${localPlans.rows.length} active plans in database`);

        // Get existing Stripe products and prices
        console.log('\n💰 Fetching existing Stripe products and prices...');
        
        const stripeProducts = await stripe.products.list({
            active: true,
            limit: 100,
        });

        const stripePrices = await stripe.prices.list({
            active: true,
            limit: 1000,
        });

        console.log(`📦 Found ${stripeProducts.data.length} Stripe products`);
        console.log(`💵 Found ${stripePrices.data.length} Stripe prices`);

        // Sync each local plan to Stripe
        for (const plan of localPlans.rows) {
            console.log(`\n🔄 Syncing plan: ${plan.name} ($${plan.price_monthly}/month)`);
            
            if (plan.stripe_product_id && plan.stripe_price_id) {
                await updateExistingStripePlan(plan, stripeProducts.data, stripePrices.data);
            } else {
                await createNewStripePlan(plan);
            }
        }

        // Show final summary
        console.log('\n📊 Final Stripe State:');
        await showStripeSummary();

        console.log('\n✅ Database to Stripe sync completed successfully!');
        
    } catch (error) {
        console.error('❌ Error syncing to Stripe:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

async function updateExistingStripePlan(plan, stripeProducts, stripePrices) {
    try {
        // Find existing Stripe product
        const stripeProduct = stripeProducts.find(p => p.id === plan.stripe_product_id);
        
        if (!stripeProduct) {
            console.log(`  ⚠️  Stripe product ${plan.stripe_product_id} not found, creating new one`);
            await createNewStripePlan(plan);
            return;
        }

        // Find existing Stripe price
        const stripePrice = stripePrices.find(p => p.id === plan.stripe_price_id);
        
        if (!stripePrice) {
            console.log(`  ⚠️  Stripe price ${plan.stripe_price_id} not found, creating new one`);
            await createNewStripePrice(plan, stripeProduct.id);
            return;
        }

        // Update Stripe product if needed
        let productUpdated = false;
        if (stripeProduct.name !== plan.name || 
            stripeProduct.description !== plan.features?.description ||
            JSON.stringify(stripeProduct.metadata) !== JSON.stringify(plan.features)) {
            
            await stripe.products.update(stripeProduct.id, {
                name: plan.name,
                description: plan.features?.description || `SyncStream TV - ${plan.name} Plan`,
                metadata: {
                    ...plan.features,
                    max_profiles: plan.max_profiles?.toString(),
                    max_playlists: plan.max_playlists?.toString(),
                    max_favorites: plan.max_favorites?.toString(),
                    billing_interval: plan.billing_interval,
                    billing_interval_count: plan.billing_interval_count?.toString()
                }
            });
            
            productUpdated = true;
            console.log(`  ✅ Updated Stripe product: ${plan.name}`);
        }

        // Update Stripe price if needed
        let priceUpdated = false;
        const currentPrice = stripePrice.unit_amount / 100;
        if (Math.abs(currentPrice - plan.price_monthly) > 0.01) {
            console.log(`  ⚠️  Price mismatch: Stripe $${currentPrice} vs DB $${plan.price_monthly}`);
            console.log(`  💡 Note: Stripe prices cannot be updated, creating new price`);
            
            // Create new price with correct amount
            const newPrice = await stripe.prices.create({
                product: stripeProduct.id,
                unit_amount: Math.round(plan.price_monthly * 100), // Convert to cents
                currency: 'usd',
                recurring: {
                    interval: plan.billing_interval || 'month',
                    interval_count: plan.billing_interval_count || 1
                },
                metadata: {
                    plan_id: plan.id,
                    plan_name: plan.name
                }
            });

            // Update local database with new price ID
            await pool.query(
                'UPDATE plans SET stripe_price_id = $1, updated_at = NOW() WHERE id = $2',
                [newPrice.id, plan.id]
            );

            console.log(`  ✅ Created new Stripe price: ${newPrice.id} - $${plan.price_monthly}`);
            priceUpdated = true;
        }

        if (!productUpdated && !priceUpdated) {
            console.log(`  ✅ Stripe plan already up to date`);
        }

    } catch (error) {
        console.error(`  ❌ Error updating Stripe plan ${plan.name}:`, error.message);
    }
}

async function createNewStripePlan(plan) {
    try {
        // Create Stripe product
        const product = await stripe.products.create({
            name: plan.name,
            description: plan.features?.description || `SyncStream TV - ${plan.name} Plan`,
            metadata: {
                ...plan.features,
                max_profiles: plan.max_profiles?.toString(),
                max_playlists: plan.max_playlists?.toString(),
                max_favorites: plan.max_favorites?.toString(),
                billing_interval: plan.billing_interval,
                billing_interval_count: plan.billing_interval_count?.toString()
            }
        });

        console.log(`  ➕ Created Stripe product: ${product.id}`);

        // Create Stripe price
        const price = await stripe.prices.create({
            product: product.id,
            unit_amount: Math.round(plan.price_monthly * 100), // Convert to cents
            currency: 'usd',
            recurring: {
                interval: plan.billing_interval || 'month',
                interval_count: plan.billing_interval_count || 1
            },
            metadata: {
                plan_id: plan.id,
                plan_name: plan.name
            }
        });

        console.log(`  ➕ Created Stripe price: ${price.id} - $${plan.price_monthly}`);

        // Update local database with Stripe IDs
        await pool.query(`
            UPDATE plans SET 
                stripe_product_id = $1, 
                stripe_price_id = $2, 
                updated_at = NOW() 
            WHERE id = $3
        `, [product.id, price.id, plan.id]);

        console.log(`  🔗 Linked ${plan.name} to Stripe: ${product.id} | ${price.id}`);

    } catch (error) {
        console.error(`  ❌ Error creating Stripe plan ${plan.name}:`, error.message);
    }
}

async function createNewStripePrice(plan, productId) {
    try {
        // Create new price for existing product
        const price = await stripe.prices.create({
            product: productId,
            unit_amount: Math.round(plan.price_monthly * 100), // Convert to cents
            currency: 'usd',
            recurring: {
                interval: plan.billing_interval || 'month',
                interval_count: plan.billing_interval_count || 1
            },
            metadata: {
                plan_id: plan.id,
                plan_name: plan.name
            }
        });

        console.log(`  ➕ Created new Stripe price: ${price.id} - $${plan.price_monthly}`);

        // Update local database with new price ID
        await pool.query(
            'UPDATE plans SET stripe_price_id = $1, updated_at = NOW() WHERE id = $2',
            [price.id, plan.id]
        );

        console.log(`  🔗 Updated ${plan.name} with new price: ${price.id}`);

    } catch (error) {
        console.error(`  ❌ Error creating Stripe price for ${plan.name}:`, error.message);
    }
}

async function showStripeSummary() {
    try {
        const stripeProducts = await stripe.products.list({
            active: true,
            limit: 100,
        });

        const stripePrices = await stripe.prices.list({
            active: true,
            limit: 1000,
        });

        console.log(`  📦 Stripe Products: ${stripeProducts.data.length}`);
        stripeProducts.data.forEach(product => {
            console.log(`    ✅ ${product.name} (${product.id})`);
        });

        console.log(`  💵 Stripe Prices: ${stripePrices.data.length}`);
        stripePrices.data.forEach(price => {
            if (price.type === 'recurring') {
                const amount = (price.unit_amount / 100).toFixed(2);
                const interval = price.recurring.interval;
                console.log(`    ✅ $${amount}/${interval} (${price.id})`);
            }
        });

        // Show database sync status
        const dbPlans = await pool.query(`
            SELECT 
                name,
                stripe_product_id,
                stripe_price_id,
                price_monthly,
                is_active
            FROM plans 
            WHERE is_active = TRUE
            ORDER BY price_monthly ASC
        `);

        console.log(`\n  📋 Database Sync Status:`);
        dbPlans.rows.forEach(plan => {
            const status = plan.stripe_product_id && plan.stripe_price_id ? '✅ Synced' : '⚠️  Not Synced';
            console.log(`    ${status} ${plan.name} - $${plan.price_monthly}/month`);
            if (plan.stripe_product_id && plan.stripe_price_id) {
                console.log(`      Stripe: ${plan.stripe_product_id} | ${plan.stripe_price_id}`);
            }
        });

    } catch (error) {
        console.error('  ❌ Error showing Stripe summary:', error);
    }
}

// Run the sync
syncDbToStripe().catch(console.error);
