#!/usr/bin/env bun

import Stripe from 'stripe';
import { config } from 'dotenv';

// Load environment variables
config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

console.log('🔄 Quick Stripe Plans Sync...');

async function quickSync() {
    try {
        console.log('📊 Fetching Stripe products...');

        const products = await stripe.products.list({
            active: true,
            limit: 10,
        });

        console.log(`\n📦 Found ${products.data.length} products:`);

        products.data.forEach(product => {
            console.log(`\n  Product: ${product.name} (${product.id})`);
            console.log(`    Description: ${product.description || 'No description'}`);
            console.log(`    Metadata:`, product.metadata);
        });

        console.log('\n💰 Fetching Stripe prices...');

        const prices = await stripe.prices.list({
            active: true,
            limit: 20,
        });

        console.log(`\n  Found ${prices.data.length} prices:`);

        prices.data.forEach(price => {
            if (price.type === 'recurring') {
                const amount = (price.unit_amount / 100).toFixed(2);
                const interval = price.recurring.interval;
                const intervalCount = price.recurring.interval_count;

                console.log(`    Price: $${amount}/${interval} (${intervalCount > 1 ? intervalCount + ' ' + interval + 's' : interval})`);
                console.log(`      ID: ${price.id}`);
                console.log(`      Product: ${price.product}`);
            }
        });

        console.log('\n✅ Quick sync completed!');

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

quickSync();
