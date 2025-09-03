import { Elysia } from 'elysia';

const baseUrl = 'http://localhost:3001';
let authToken = '';
let userId = '';

// Helper function to make API calls
async function apiCall(method, endpoint, body = null, token = null) {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
        }
    };
    
    if (body) {
        options.body = JSON.stringify(body);
    }
    
    try {
        const response = await fetch(`${baseUrl}${endpoint}`, options);
        const data = await response.json();
        return { status: response.status, data };
    } catch (error) {
        console.error(`Error calling ${endpoint}:`, error);
        return { status: 500, data: { error: error.message } };
    }
}

async function runTests() {
    console.log('🧪 Testing Profile Updates and User Info Endpoint\n');
    
    // 1. Create test user
    console.log('1. Creating test user...');
    const timestamp = Date.now();
    const signupResult = await apiCall('POST', '/auth/signup', {
        email: `test${timestamp}@example.com`,
        password: 'Test123!',
        full_name: 'Test User'
    });
    
    if (signupResult.status !== 200) {
        console.error('❌ Failed to create test user:', signupResult.data);
        return;
    }
    
    authToken = signupResult.data.data.token;
    userId = signupResult.data.data.id;
    console.log('✅ Test user created successfully\n');
    
    // 2. Test /auth/me endpoint
    console.log('2. Testing /auth/me endpoint...');
    const meResult = await apiCall('GET', '/auth/me', null, authToken);
    console.log('Response:', JSON.stringify(meResult.data, null, 2));
    
    if (meResult.data.data.stripe_customer_id !== undefined) {
        console.error('❌ stripe_customer_id should not be returned');
    }
    if (meResult.data.data.has_used_trial !== undefined) {
        console.error('❌ has_used_trial should not be returned');
    }
    if (meResult.data.data.parent_reseller_id !== undefined) {
        console.error('❌ parent_reseller_id should not be returned');
    }
    if (meResult.data.data.role !== 'reseller' && meResult.data.data.credits_balance !== undefined) {
        console.error('❌ credits_balance should not be returned for non-reseller users');
    }
    if (meResult.data.data.subscription_status === undefined) {
        console.error('❌ subscription_status should be returned');
    } else {
        console.log('✅ /auth/me endpoint returns correct fields\n');
    }
    
    // 3. Get existing profiles
    console.log('3. Getting existing profiles...');
    const profilesResult = await apiCall('GET', '/profiles', null, authToken);
    console.log(`Found ${profilesResult.data.data.length} profiles\n`);
    
    // 4. Test creating profile with duplicate name
    console.log('4. Testing duplicate profile name prevention...');
    const duplicateResult = await apiCall('POST', '/profiles', {
        name: 'Default',
        avatar_url: 'https://example.com/avatar.png'
    }, authToken);
    
    if (duplicateResult.status === 500 && duplicateResult.data.message.includes('already exists')) {
        console.log('✅ Duplicate profile name correctly prevented');
        console.log('Error message:', duplicateResult.data.message, '\n');
    } else {
        console.error('❌ Duplicate profile name was not prevented\n');
    }
    
    // 5. Create profiles with unique names
    console.log('5. Creating profiles with unique names...');
    const profile1Result = await apiCall('POST', '/profiles', {
        name: 'Profile 1',
        avatar_url: 'https://example.com/avatar1.png'
    }, authToken);
    
    const profile2Result = await apiCall('POST', '/profiles', {
        name: 'Profile 2',
        avatar_url: 'https://example.com/avatar2.png',
        is_kids_profile: true
    }, authToken);
    
    if (profile1Result.status === 200 && profile2Result.status === 200) {
        console.log('✅ Profiles created successfully\n');
    } else {
        console.error('❌ Failed to create profiles\n');
    }
    
    // 6. Test updating profile with duplicate name
    console.log('6. Testing profile update with duplicate name...');
    if (profile1Result.status === 200) {
        const updateResult = await apiCall('PATCH', `/profiles/${profile1Result.data.data.id}`, {
            name: 'Profile 2'
        }, authToken);
        
        if (updateResult.status === 500 && updateResult.data.message.includes('already exists')) {
            console.log('✅ Duplicate name prevented during update');
            console.log('Error message:', updateResult.data.message, '\n');
        } else {
            console.error('❌ Duplicate name was not prevented during update\n');
        }
    }
    
    // 7. Test deleting profiles (including the last one)
    console.log('7. Testing profile deletion...');
    const allProfilesResult = await apiCall('GET', '/profiles', null, authToken);
    const allProfiles = allProfilesResult.data.data;
    
    // Delete all profiles one by one
    for (let i = 0; i < allProfiles.length; i++) {
        const profile = allProfiles[i];
        console.log(`Deleting profile "${profile.name}"...`);
        const deleteResult = await apiCall('DELETE', `/profiles/${profile.id}`, null, authToken);
        
        if (deleteResult.status === 200) {
            console.log(`✅ Profile "${profile.name}" deleted successfully`);
        } else {
            console.error(`❌ Failed to delete profile "${profile.name}":`, deleteResult.data.message);
        }
    }
    
    // Verify all profiles are deleted
    const finalProfilesResult = await apiCall('GET', '/profiles', null, authToken);
    if (finalProfilesResult.data.data.length === 0) {
        console.log('✅ All profiles deleted successfully (including the last one)\n');
    } else {
        console.error('❌ Some profiles were not deleted\n');
    }
    
    // 8. Test admin user info endpoint (requires admin token)
    console.log('8. Testing admin user info endpoint...');
    console.log('Note: This requires admin authentication. Showing expected response format:');
    console.log(`
Expected response for /admin/users/${userId}:
{
    "success": true,
    "message": null,
    "data": {
        "id": "user-id",
        "email": "user@example.com",
        "full_name": "Test User",
        "role": "user",
        "subscription": {
            "status": "active",
            "plan_name": "Basic",
            ...
        },
        "usage": {
            "profiles_count": 2,
            "playlists_count": 3,
            "favorites_by_profile": [...]
        },
        "profiles": [...],
        "playlists": [...],
        "subscription_history": [...]
    }
}
    `);
    
    console.log('\n✅ All tests completed!');
}

// Run the tests
runTests().catch(console.error);