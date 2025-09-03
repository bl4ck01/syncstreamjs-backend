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

console.log('🔄 Starting Stripe Plans Sync...');



async function syncStripePlans() {
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
                    await syncPlanToDatabase(product, price);
                }
            }
        }

        console.log('\n✅ Stripe plans sync completed successfully!');
        
    } catch (error) {
        console.error('❌ Error syncing Stripe plans:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

async function syncPlanToDatabase(product, price) {
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

        // Check if plan already exists
        const existingPlan = await pool.query(
            'SELECT id FROM plans WHERE stripe_price_id = $1',
            [price.id]
        );

        if (existingPlan.rows.length > 0) {
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

            console.log(`  ✅ Updated plan: ${planName} - $${monthlyPrice.toFixed(2)}/month`);
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

            console.log(`  ➕ Created plan: ${planName} - $${monthlyPrice.toFixed(2)}/month (ID: ${result.rows[0].id})`);
        }

    } catch (error) {
        console.error(`  ❌ Error syncing plan ${product.name}:`, error);
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

// Run the sync
syncStripePlans().catch(console.error);
