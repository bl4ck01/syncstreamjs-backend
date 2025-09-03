// Test script to verify authentication fix for playlists endpoint
const BASE_URL = 'http://localhost:3000/api/v1';

async function testPlaylistsEndpoint() {
    console.log('Testing playlists endpoint authentication fix...\n');
    
    // Test 1: Without authentication token
    console.log('1. Testing without authentication token:');
    try {
        const response = await fetch(`${BASE_URL}/playlists`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        console.log('   Status:', response.status);
        console.log('   Response:', JSON.stringify(data, null, 2));
        
        if (response.status === 401 && data.success === false) {
            console.log('   ✅ PASS: Correctly returns 401 with formatted JSON');
        } else {
            console.log('   ❌ FAIL: Should return 401 with formatted JSON');
        }
    } catch (error) {
        console.log('   ❌ ERROR:', error.message);
    }
    
    // Test 2: With invalid token
    console.log('\n2. Testing with invalid authentication token:');
    try {
        const response = await fetch(`${BASE_URL}/playlists`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer invalid-token-here'
            }
        });
        
        const data = await response.json();
        console.log('   Status:', response.status);
        console.log('   Response:', JSON.stringify(data, null, 2));
        
        if (response.status === 401 && data.success === false) {
            console.log('   ✅ PASS: Correctly returns 401 with formatted JSON');
        } else {
            console.log('   ❌ FAIL: Should return 401 with formatted JSON');
        }
    } catch (error) {
        console.log('   ❌ ERROR:', error.message);
    }
    
    // Test favorites endpoint
    console.log('\n3. Testing favorites endpoint (also fixed):');
    try {
        const response = await fetch(`${BASE_URL}/favorites`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        console.log('   Status:', response.status);
        console.log('   Response:', JSON.stringify(data, null, 2));
        
        if (response.status === 401 && data.success === false) {
            console.log('   ✅ PASS: Correctly returns 401 with formatted JSON');
        } else {
            console.log('   ❌ FAIL: Should return 401 with formatted JSON');
        }
    } catch (error) {
        console.log('   ❌ ERROR:', error.message);
    }
    
    // Test progress endpoint
    console.log('\n4. Testing progress endpoint (also fixed):');
    try {
        const response = await fetch(`${BASE_URL}/progress`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        console.log('   Status:', response.status);
        console.log('   Response:', JSON.stringify(data, null, 2));
        
        if (response.status === 401 && data.success === false) {
            console.log('   ✅ PASS: Correctly returns 401 with formatted JSON');
        } else {
            console.log('   ❌ FAIL: Should return 401 with formatted JSON');
        }
    } catch (error) {
        console.log('   ❌ ERROR:', error.message);
    }
}

// Check if server is running first
fetch(`${BASE_URL}/health`)
    .then(() => {
        testPlaylistsEndpoint();
    })
    .catch(() => {
        console.log('❌ Server is not running. Please start the server first with: npm start');
    });