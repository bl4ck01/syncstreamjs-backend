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

console.log('🔄 Starting Enhanced Stripe Plans Sync...');

async function enhancedSyncStripePlans() {
    try {
        console.log('📊 Fetching Stripe products and prices...');
        
        // Get all active products from Stripe
        const products = await stripe.products.list({
            active: true,
            limit: 100,
        });

        console.log(`📦 Found ${products.data.length} active products`);

        // Get all active prices for these products
        const prices = await stripe.prices.list({
            active: true,
            limit: 1000,
        });

        console.log(`💰 Found ${prices.data.length} active prices`);

        // First, let's see what plans we have locally
        const localPlans = await pool.query('SELECT * FROM plans WHERE is_active = TRUE');
        console.log(`\n📋 Found ${localPlans.rows.length} local plans`);

        // Group prices by product
        const productPrices = {};
        prices.data.forEach(price => {
            if (!productPrices[price.product]) {
                productPrices[price.product] = [];
            }
            productPrices[price.product].push(price);
        });

        // Sync each product with its prices
        for (const product of products.data) {
            console.log(`\n🔄 Syncing product: ${product.name} (${product.id})`);
            
            const productPrices = prices.data.filter(p => p.product === product.id);
            
            for (const price of productPrices) {
                if (price.type === 'recurring') {
                    await enhancedSyncPlanToDatabase(product, price, localPlans.rows);
                }
            }
        }

        // Now let's try to match existing plans with Stripe plans by name
        console.log('\n🔍 Attempting to match existing plans with Stripe plans...');
        await matchExistingPlansWithStripe(products.data, prices.data, localPlans.rows);

        // Clean up any duplicate plans
        console.log('\n🧹 Cleaning up duplicate plans...');
        await cleanupDuplicatePlans();

        // Show final summary
        console.log('\n📊 Final Database State:');
        await showFinalSummary();

        console.log('\n✅ Enhanced Stripe plans sync completed successfully!');
        
    } catch (error) {
        console.error('❌ Error syncing Stripe plans:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

async function enhancedSyncPlanToDatabase(product, price, localPlans) {
    try {
        // Extract billing interval
        const interval = price.recurring?.interval || 'month';
        const intervalCount = price.recurring?.interval_count || 1;
        
        // Calculate monthly price
        let monthlyPrice = price.unit_amount / 100; // Convert from cents
        if (interval === 'year') {
            monthlyPrice = monthlyPrice / 12;
        } else if (interval === 'week') {
            monthlyPrice = monthlyPrice * 4.33; // Approximate weeks per month
        } else if (interval === 'day') {
            monthlyPrice = monthlyPrice * 30.44; // Approximate days per month
        }
        
        // Determine plan name based on product and interval
        let planName = product.name;
        if (intervalCount > 1) {
            planName += ` (${intervalCount} ${interval}s)`;
        }
        
        // Check if plan already exists by stripe_price_id
        const existingPlanByPriceId = await pool.query(
            'SELECT id FROM plans WHERE stripe_price_id = $1',
            [price.id]
        );

        if (existingPlanByPriceId.rows.length > 0) {
            // Update existing plan
            await pool.query(`
                UPDATE plans SET
                    name = $1,
                    stripe_product_id = $2,
                    stripe_price_id = $3,
                    price_monthly = $4,
                    billing_interval = $5,
                    billing_interval_count = $6,
                    is_active = $7,
                    updated_at = NOW()
                WHERE stripe_price_id = $3
            `, [
                planName,
                product.id,
                price.id,
                monthlyPrice,
                interval,
                intervalCount,
                true
            ]);
            
            console.log(`  ✅ Updated plan by price_id: ${planName} - $${monthlyPrice.toFixed(2)}/month`);
        } else {
            // Check if we can match by plan name (case-insensitive)
            const existingPlanByName = localPlans.find(plan => 
                plan.name.toLowerCase() === planName.toLowerCase() ||
                plan.name.toLowerCase().includes(product.name.toLowerCase()) ||
                product.name.toLowerCase().includes(plan.name.toLowerCase())
            );

            if (existingPlanByName) {
                // Update existing plan with Stripe information
                await pool.query(`
                    UPDATE plans SET
                        stripe_product_id = $1,
                        stripe_price_id = $2,
                        price_monthly = $3,
                        billing_interval = $4,
                        billing_interval_count = $5,
                        updated_at = NOW()
                    WHERE id = $6
                `, [
                    product.id,
                    price.id,
                    monthlyPrice,
                    interval,
                    intervalCount,
                    existingPlanByName.id
                ]);
                
                console.log(`  🔄 Updated existing plan by name: ${existingPlanByName.name} -> ${planName} - $${monthlyPrice.toFixed(2)}/month`);
            } else {
                // Create new plan
                const result = await pool.query(`
                    INSERT INTO plans (
                        name,
                        stripe_product_id,
                        stripe_price_id,
                        price_monthly,
                        billing_interval,
                        billing_interval_count,
                        max_profiles,
                        max_playlists,
                        max_favorites,
                        features,
                        is_active,
                        created_at,
                        updated_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
                    RETURNING id
                `, [
                    planName,
                    product.id,
                    price.id,
                    monthlyPrice,
                    interval,
                    intervalCount,
                    extractPlanLimits(product, 'profiles'),
                    extractPlanLimits(product, 'playlists'),
                    extractPlanLimits(product, 'favorites'),
                    extractPlanFeatures(product),
                    true
                ]);
                
                console.log(`  ➕ Created new plan: ${planName} - $${monthlyPrice.toFixed(2)}/month (ID: ${result.rows[0].id})`);
            }
        }
        
    } catch (error) {
        console.error(`  ❌ Error syncing plan ${product.name}:`, error);
    }
}

async function matchExistingPlansWithStripe(products, prices, localPlans) {
    try {
        // Look for plans that have placeholder stripe_price_id values
        const placeholderPlans = localPlans.filter(plan => 
            plan.stripe_price_id && 
            plan.stripe_price_id.startsWith('price_') && 
            !plan.stripe_price_id.includes('_1S') // Skip real Stripe IDs
        );

        console.log(`  🔍 Found ${placeholderPlans.length} plans with placeholder stripe_price_id`);

        for (const plan of placeholderPlans) {
            // Try to find a matching Stripe product by name
            const matchingProduct = products.find(product => {
                const planNameLower = plan.name.toLowerCase();
                const productNameLower = product.name.toLowerCase();
                
                return planNameLower === productNameLower ||
                       planNameLower.includes(productNameLower) ||
                       productNameLower.includes(planNameLower);
            });

            if (matchingProduct) {
                // Find the price for this product
                const matchingPrice = prices.find(price => 
                    price.product === matchingProduct.id && 
                    price.type === 'recurring'
                );

                if (matchingPrice) {
                    // Check if this price_id is already used by another plan
                    const existingPlanWithPrice = await pool.query(
                        'SELECT id, name FROM plans WHERE stripe_price_id = $1 AND id != $2',
                        [matchingPrice.id, plan.id]
                    );

                    if (existingPlanWithPrice.rows.length > 0) {
                        // This price is already used by another plan, so we need to handle this differently
                        const existingPlan = existingPlanWithPrice.rows[0];
                        console.log(`  ⚠️  Price ${matchingPrice.id} already used by plan: ${existingPlan.name}`);
                        
                        // Option 1: Merge the plans (recommended)
                        if (plan.name.toLowerCase() === existingPlan.name.toLowerCase() || 
                            plan.name.toLowerCase().includes(existingPlan.name.toLowerCase()) ||
                            existingPlan.name.toLowerCase().includes(plan.name.toLowerCase())) {
                            
                            console.log(`  🔄 Merging similar plans: ${plan.name} -> ${existingPlan.name}`);
                            
                            // Update the existing plan with better information if needed
                            await pool.query(`
                                UPDATE plans SET
                                    stripe_product_id = $1,
                                    updated_at = NOW()
                                WHERE id = $2
                            `, [matchingProduct.id, existingPlan.id]);
                            
                            // Deactivate the duplicate plan
                            await pool.query(
                                'UPDATE plans SET is_active = FALSE, updated_at = NOW() WHERE id = $1',
                                [plan.id]
                            );
                            
                            console.log(`  ✅ Merged ${plan.name} into ${existingPlan.name} and deactivated duplicate`);
                        } else {
                            // Option 2: Just link the product_id without the price_id
                            console.log(`  🔗 Linking ${plan.name} to product ${matchingProduct.id} (without price_id)`);
                            
                            await pool.query(`
                                UPDATE plans SET
                                    stripe_product_id = $1,
                                    updated_at = NOW()
                                WHERE id = $2
                            `, [matchingProduct.id, plan.id]);
                        }
                    } else {
                        // Safe to update with the price_id
                        await pool.query(`
                            UPDATE plans SET
                                stripe_product_id = $1,
                                stripe_price_id = $2,
                                updated_at = NOW()
                            WHERE id = $3
                        `, [matchingProduct.id, matchingPrice.id, plan.id]);

                        console.log(`  🔗 Linked ${plan.name} to Stripe product: ${matchingProduct.name}`);
                    }
                }
            }
        }
    } catch (error) {
        console.error('  ❌ Error matching existing plans:', error);
    }
}

async function cleanupDuplicatePlans() {
    try {
        // Find plans with duplicate names (case-insensitive)
        const duplicateNames = await pool.query(`
            SELECT LOWER(name) as name_lower, COUNT(*) as count
            FROM plans 
            WHERE is_active = TRUE
            GROUP BY LOWER(name) 
            HAVING COUNT(*) > 1
        `);

        if (duplicateNames.rows.length === 0) {
            console.log('  ✅ No duplicate plan names found');
            return;
        }

        console.log(`  🔍 Found ${duplicateNames.rows.length} duplicate plan names`);

        for (const duplicate of duplicateNames.rows) {
            const plansWithSameName = await pool.query(`
                SELECT id, name, stripe_product_id, stripe_price_id, created_at
                FROM plans 
                WHERE LOWER(name) = $1 AND is_active = TRUE
                ORDER BY created_at ASC
            `, [duplicate.name_lower]);

            if (plansWithSameName.rows.length > 1) {
                // Keep the first one (oldest) and deactivate others
                const [keepPlan, ...duplicatePlans] = plansWithSameName.rows;
                
                console.log(`  🔄 Keeping plan: ${keepPlan.name} (ID: ${keepPlan.id})`);
                
                for (const dupPlan of duplicatePlans) {
                    await pool.query(
                        'UPDATE plans SET is_active = FALSE, updated_at = NOW() WHERE id = $1',
                        [dupPlan.id]
                    );
                    console.log(`  🚫 Deactivated duplicate: ${dupPlan.name} (ID: ${dupPlan.id})`);
                }
            }
        }
    } catch (error) {
        console.error('  ❌ Error cleaning up duplicate plans:', error);
    }
}

async function showFinalSummary() {
    try {
        const activePlans = await pool.query(`
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

        console.log(`  📋 Active Plans: ${activePlans.rows.length}`);
        
        activePlans.rows.forEach(plan => {
            const status = plan.stripe_product_id ? '✅ Linked' : '⚠️  Not Linked';
            console.log(`    ${status} ${plan.name} - $${plan.price_monthly}/month`);
            if (plan.stripe_product_id) {
                console.log(`      Stripe: ${plan.stripe_product_id} | ${plan.stripe_price_id}`);
            }
        });

        const inactivePlans = await pool.query(`
            SELECT COUNT(*) as count FROM plans WHERE is_active = FALSE
        `);
        
        if (inactivePlans.rows[0].count > 0) {
            console.log(`  🚫 Inactive Plans: ${inactivePlans.rows[0].count}`);
        }
    } catch (error) {
        console.error('  ❌ Error showing final summary:', error);
    }
}

function extractPlanLimits(product, limitType) {
    // Try to extract limits from product metadata
    const metadata = product.metadata || {};
    
    // Check for specific limit keys
    const limitKeys = [
        `max_${limitType}`,
        `max_${limitType}_limit`,
        `${limitType}_limit`,
        limitType
    ];
    
    for (const key of limitKeys) {
        if (metadata[key]) {
            const value = parseInt(metadata[key]);
            if (!isNaN(value)) {
                return value;
            }
        }
    }
    
    // Default limits based on plan type
    if (product.name.toLowerCase().includes('basic')) {
        return limitType === 'favorites' ? 100 : 3;
    } else if (product.name.toLowerCase().includes('premium')) {
        return limitType === 'favorites' ? 500 : 10;
    } else if (product.name.toLowerCase().includes('enterprise') || product.name.toLowerCase().includes('unlimited')) {
        return limitType === 'favorites' ? -1 : 50;
    }
    
    // Default fallback
    return limitType === 'favorites' ? 100 : 5;
}

function extractPlanFeatures(product) {
    const metadata = product.metadata || {};
    const features = {};
    
    // Extract boolean features
    const booleanFeatures = ['ads', 'hd', '4k', 'priority_support', 'trial'];
    booleanFeatures.forEach(feature => {
        if (metadata[feature] !== undefined) {
            features[feature] = metadata[feature] === 'true' || metadata[feature] === true;
        }
    });
    
    // Extract numeric features
    const numericFeatures = ['trial_days', 'max_devices'];
    numericFeatures.forEach(feature => {
        if (metadata[feature]) {
            const value = parseInt(metadata[feature]);
            if (!isNaN(value)) {
                features[feature] = value;
            }
        }
    });
    
    // Set default features based on plan name if none found
    if (Object.keys(features).length === 0) {
        const planName = product.name.toLowerCase();
        features.ads = !planName.includes('premium') && !planName.includes('enterprise');
        features.hd = true;
        features['4k'] = planName.includes('premium') || planName.includes('enterprise');
        features.priority_support = planName.includes('enterprise');
        features.trial = true;
        features.trial_days = 7;
    }
    
    return features;
}

// Run the enhanced sync
enhancedSyncStripePlans().catch(console.error);
