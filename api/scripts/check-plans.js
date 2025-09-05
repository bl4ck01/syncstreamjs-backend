#!/usr/bin/env bun

import { config } from 'dotenv';
import { Pool } from 'pg';

// Load environment variables
config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function checkPlans() {
    try {
        console.log('📊 Checking plans in database...\n');
        
        const result = await pool.query(`
            SELECT 
                name,
                price_monthly,
                price_annual,
                stripe_price_id,
                stripe_price_id_annual,
                max_profiles,
                max_playlists,
                trial_days,
                cine_party,
                record_live_tv,
                download_offline_viewing,
                multi_screen_viewing,
                support_level
            FROM plans 
            ORDER BY price_monthly
        `);
        
        console.log('📋 Current Plans:');
        console.log('================\n');
        
        result.rows.forEach(plan => {
            console.log(`🎯 ${plan.name} Plan`);
            console.log(`   💰 Monthly: $${plan.price_monthly}`);
            console.log(`   💰 Annual: $${plan.price_annual}`);
            console.log(`   👥 Profiles: ${plan.max_profiles === -1 ? 'Unlimited' : plan.max_profiles}`);
            console.log(`   📺 Playlists: ${plan.max_playlists === -1 ? 'Unlimited' : plan.max_playlists}`);
            console.log(`   🆓 Trial: ${plan.trial_days} days`);
            console.log(`   🎬 Cine Party: ${plan.cine_party ? '✅' : '❌'}`);
            console.log(`   📹 Record TV: ${plan.record_live_tv ? '✅' : '❌'}`);
            console.log(`   💾 Offline: ${plan.download_offline_viewing ? '✅' : '❌'}`);
            console.log(`   📱 Screens: ${plan.multi_screen_viewing}`);
            console.log(`   🆘 Support: ${plan.support_level}`);
            console.log(`   🔗 Monthly Price ID: ${plan.stripe_price_id}`);
            console.log(`   🔗 Annual Price ID: ${plan.stripe_price_id_annual}`);
            console.log('');
        });
        
        console.log('✅ Plans check completed successfully!');
        
    } catch (error) {
        console.error('❌ Error checking plans:', error);
    } finally {
        await pool.end();
    }
}

// Run the check
checkPlans().catch(console.error);
