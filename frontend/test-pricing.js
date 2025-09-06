// Simple test to verify the pricing page loads correctly
import { getPlans } from './src/server/actions.js';

async function testPricingData() {
    console.log('Testing getPlans function...');
    
    try {
        const response = await getPlans();
        console.log('\n✅ Response received:', JSON.stringify(response, null, 2));
        
        if (response?.success && response?.data) {
            console.log(`\n✅ Found ${response.data.length} plans:`);
            response.data.forEach((plan, index) => {
                console.log(`\n${index + 1}. ${plan.name} Plan:`);
                console.log(`   - Monthly: $${plan.price_monthly}`);
                console.log(`   - Annual: $${plan.price_annual}`);
                console.log(`   - Profiles: ${plan.max_profiles === -1 ? 'Unlimited' : plan.max_profiles}`);
                console.log(`   - Trial: ${plan.trial_days} days`);
            });
        } else {
            console.log('\n❌ Failed to fetch plans:', response?.message || 'Unknown error');
        }
    } catch (error) {
        console.error('\n❌ Error:', error.message);
    }
}

testPricingData();
