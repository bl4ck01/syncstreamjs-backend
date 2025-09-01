// API Endpoint Test Script
const BASE_URL = 'http://localhost:3000';

// Test data
const testUser = {
    email: 'test@example.com',
    password: 'password123',
    full_name: 'Test User'
};

const adminUser = {
    email: 'admin@syncstream.tv',
    password: 'admin123'
};

let authToken = null;
let adminToken = null;

async function testEndpoint(name, method, path, body = null, token = null) {
    console.log(`\n📍 Testing: ${name}`);
    console.log(`   ${method} ${path}`);
    
    try {
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json'
            }
        };
        
        if (body) {
            options.body = JSON.stringify(body);
        }
        
        if (token) {
            options.headers['Cookie'] = `auth=${token}`;
        }
        
        const response = await fetch(`${BASE_URL}${path}`, options);
        const data = await response.json();
        
        if (response.ok) {
            console.log('   ✅ Success:', data);
        } else {
            console.log('   ❌ Failed:', response.status, data);
        }
        
        return { response, data };
    } catch (error) {
        console.log('   ❌ Error:', error.message);
        return { error };
    }
}

async function extractAuthToken(response) {
    const setCookie = response.headers.get('set-cookie');
    if (setCookie) {
        const match = setCookie.match(/auth=([^;]+)/);
        return match ? match[1] : null;
    }
    return null;
}

async function runTests() {
    console.log('🚀 Starting API Tests...\n');
    
    // Health check
    await testEndpoint('Health Check', 'GET', '/health');
    
    // Auth tests
    const signupResult = await testEndpoint('User Signup', 'POST', '/auth/signup', testUser);
    if (signupResult.response?.ok) {
        authToken = await extractAuthToken(signupResult.response);
    }
    
    // Login with email
    const loginResult = await testEndpoint('Login with Email', 'POST', '/auth/login', {
        email: testUser.email,
        password: testUser.password
    });
    if (loginResult.response?.ok) {
        authToken = await extractAuthToken(loginResult.response);
    }
    
    // Login test already covered above
    
    // Get current user
    await testEndpoint('Get Current User', 'GET', '/auth/me', null, authToken);
    
    // Profile tests
    await testEndpoint('List Profiles', 'GET', '/profiles', null, authToken);
    
    const profileResult = await testEndpoint('Create Profile', 'POST', '/profiles', {
        name: 'Kids Profile',
        is_kids_profile: true,
        parental_pin: '1234'
    }, authToken);
    
    if (profileResult.data?.data?.id) {
        await testEndpoint('Select Profile', 'POST', `/profiles/${profileResult.data.data.id}/select`, {
            pin: '1234'
        }, authToken);
    }
    
    // Playlist tests
    await testEndpoint('Create Playlist', 'POST', '/playlists', {
        name: 'My IPTV',
        url: 'http://example.com/playlist.m3u',
        username: 'iptv_user',
        password: 'iptv_pass'
    }, authToken);
    
    // Subscription tests
    await testEndpoint('Get Available Plans', 'GET', '/subscriptions/plans', null, authToken);
    await testEndpoint('Get Current Subscription', 'GET', '/subscriptions/current', null, authToken);
    
    // Admin tests
    console.log('\n\n🔐 Admin Tests...\n');
    
    const adminLoginResult = await testEndpoint('Admin Login', 'POST', '/auth/login', adminUser);
    if (adminLoginResult.response?.ok) {
        adminToken = await extractAuthToken(adminLoginResult.response);
    }
    
    await testEndpoint('Get System Stats', 'GET', '/admin/stats', null, adminToken);
    await testEndpoint('List All Users', 'GET', '/admin/users', null, adminToken);
    await testEndpoint('List Plans (Admin)', 'GET', '/admin/plans', null, adminToken);
    
    console.log('\n\n✅ Tests completed!');
}

// Run tests
runTests().catch(console.error);
