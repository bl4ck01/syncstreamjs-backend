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

console.log('🔄 Starting New Plans Sync to Stripe...');

// Define the new plans structure
const newPlans = [
    {
        name: 'Basic',
        description: 'Perfect for individuals who want to enjoy IPTV',
        monthlyPrice: 299, // $2.99 in cents
        annualPrice: 2999, // $29.99 in cents
        metadata: {
            max_profiles: '1',
            trial_days: '7',
            cine_party: 'false',
            cine_party_voice_chat: 'false',
            sync_data_across_devices: 'true',
            record_live_tv: 'false',
            download_offline_viewing: 'false',
            parental_controls: 'true',
            support_level: 'email'
        }
    },
    {
        name: 'Family',
        description: 'Ideal for families with multiple users and premium features',
        monthlyPrice: 599, // $5.99 in cents
        annualPrice: 4800, // $48.00 in cents
        metadata: {
            max_profiles: '5',
            trial_days: '7',
            cine_party: 'true',
            cine_party_voice_chat: 'true',
            sync_data_across_devices: 'true',
            record_live_tv: 'true',
            download_offline_viewing: 'true',
            parental_controls: 'true',
            support_level: 'priority_24_7'
        }
    }
];

// Helper function to find existing product by name
async function findExistingProduct(productName) {
    try {
        const products = await stripe.products.list({
            active: true,
            limit: 100
        });
        
        return products.data.find(product => product.name === productName);
    } catch (error) {
        console.error('Error searching for existing product:', error);
        return null;
    }
}

// Helper function to find existing price for a product
async function findExistingPrice(productId, amount, interval) {
    try {
        const prices = await stripe.prices.list({
            product: productId,
            active: true,
            limit: 100
        });
        
        return prices.data.find(price => 
            price.unit_amount === amount &&
            price.currency === 'usd' &&
            price.recurring &&
            price.recurring.interval === interval
        );
    } catch (error) {
        console.error('Error searching for existing price:', error);
        return null;
    }
}

async function syncNewPlans() {
    try {
        console.log('📊 Syncing plans with Stripe...');
        
        for (const plan of newPlans) {
            console.log(`\n🔄 Processing plan: ${plan.name}`);
            
            // Check if product already exists in Stripe
            let product = await findExistingProduct(plan.name);
            
            if (product) {
                console.log(`  ✅ Found existing product: ${product.id}`);
            } else {
                // Create product in Stripe
                product = await stripe.products.create({
                    name: plan.name,
                    description: plan.description,
                    metadata: plan.metadata,
                    active: true
                });
                console.log(`  ✅ Created new product: ${product.id}`);
            }
            
            // Check if monthly price already exists
            let monthlyPrice = await findExistingPrice(product.id, plan.monthlyPrice, 'month');
            
            if (monthlyPrice) {
                console.log(`  ✅ Found existing monthly price: ${monthlyPrice.id}`);
            } else {
                // Create monthly price
                monthlyPrice = await stripe.prices.create({
                    product: product.id,
                    unit_amount: plan.monthlyPrice,
                    currency: 'usd',
                    recurring: {
                        interval: 'month'
                    },
                    metadata: {
                        billing_interval: 'month',
                        plan_name: plan.name
                    }
                });
                console.log(`  ✅ Created new monthly price: ${monthlyPrice.id}`);
            }
            
            // Check if annual price already exists
            let annualPrice = await findExistingPrice(product.id, plan.annualPrice, 'year');
            
            if (annualPrice) {
                console.log(`  ✅ Found existing annual price: ${annualPrice.id}`);
            } else {
                // Create annual price
                annualPrice = await stripe.prices.create({
                    product: product.id,
                    unit_amount: plan.annualPrice,
                    currency: 'usd',
                    recurring: {
                        interval: 'year'
                    },
                    metadata: {
                        billing_interval: 'year',
                        plan_name: plan.name
                    }
                });
                console.log(`  ✅ Created new annual price: ${annualPrice.id}`);
            }
            
            // Update database with Stripe IDs
            await updatePlanInDatabase(plan, product.id, monthlyPrice.id, annualPrice.id);
        }
        
        console.log('\n✅ Plans sync completed successfully!');
        
    } catch (error) {
        console.error('❌ Error syncing plans:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

async function updatePlanInDatabase(plan, productId, monthlyPriceId, annualPriceId) {
    try {
        // Check if plan exists and get current Stripe IDs
        const existingPlan = await pool.query(
            'SELECT id, stripe_product_id, stripe_price_id, stripe_price_id_annual FROM plans WHERE name = $1',
            [plan.name]
        );
        
        if (existingPlan.rows.length > 0) {
            const currentPlan = existingPlan.rows[0];
            
            // Check if Stripe IDs are already up to date
            if (currentPlan.stripe_product_id === productId && 
                currentPlan.stripe_price_id === monthlyPriceId && 
                currentPlan.stripe_price_id_annual === annualPriceId) {
                console.log(`  ✅ Plan ${plan.name} already up to date in database`);
                return;
            }
            
            // Update existing plan
            await pool.query(`
                UPDATE plans SET
                    stripe_product_id = $1,
                    stripe_price_id = $2,
                    stripe_price_id_annual = $3,
                    price_monthly = $4,
                    price_annual = $5,
                    max_profiles = $6,
                    trial_days = $7,
                    cine_party = $8,
                    cine_party_voice_chat = $9,
                    sync_data_across_devices = $10,
                    record_live_tv = $11,
                    download_offline_viewing = $12,
                    parental_controls = $13,
                    support_level = $14,
                    updated_at = NOW()
                WHERE name = $15
            `, [
                productId,
                monthlyPriceId,
                annualPriceId,
                plan.monthlyPrice / 100,
                plan.annualPrice / 100,
                parseInt(plan.metadata.max_profiles),
                parseInt(plan.metadata.trial_days),
                plan.metadata.cine_party === 'true',
                plan.metadata.cine_party_voice_chat === 'true',
                plan.metadata.sync_data_across_devices === 'true',
                plan.metadata.record_live_tv === 'true',
                plan.metadata.download_offline_viewing === 'true',
                plan.metadata.parental_controls === 'true',
                plan.metadata.support_level,
                plan.name
            ]);
            
            console.log(`  ✅ Updated plan in database: ${plan.name}`);
        } else {
            // Create new plan
            const result = await pool.query(`
                INSERT INTO plans (
                    name,
                    stripe_product_id,
                    stripe_price_id,
                    stripe_price_id_annual,
                    price_monthly,
                    price_annual,
                    max_profiles,
                    trial_days,
                    cine_party,
                    cine_party_voice_chat,
                    sync_data_across_devices,
                    record_live_tv,
                    download_offline_viewing,
                    parental_controls,
                    support_level,
                    is_active,
                    created_at,
                    updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW(), NOW())
                RETURNING id
            `, [
                plan.name,
                productId,
                monthlyPriceId,
                annualPriceId,
                plan.monthlyPrice / 100,
                plan.annualPrice / 100,
                parseInt(plan.metadata.max_profiles),
                parseInt(plan.metadata.trial_days),
                plan.metadata.cine_party === 'true',
                plan.metadata.cine_party_voice_chat === 'true',
                plan.metadata.sync_data_across_devices === 'true',
                plan.metadata.record_live_tv === 'true',
                plan.metadata.download_offline_viewing === 'true',
                plan.metadata.parental_controls === 'true',
                plan.metadata.support_level,
                true
            ]);
            
            console.log(`  ✅ Created plan in database: ${plan.name} (ID: ${result.rows[0].id})`);
        }
        
    } catch (error) {
        console.error(`  ❌ Error updating plan ${plan.name} in database:`, error);
    }
}

// Run the sync
syncNewPlans().catch(console.error);
