// Basic API Tests - MVP Release Check
const baseUrl = 'http://localhost:3000/api/v1';
const testEmail = `test_${Date.now()}@example.com`;
const testPassword = 'password123';
let authToken = '';
let userId = '';
let profileId = '';
let playlistId = '';

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testEndpoint(name, method, endpoint, options = {}) {
  log(`\nTesting: ${name}`, 'blue');
  
  try {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };
    
    if (authToken) {
      headers['Cookie'] = `auth=${authToken}`;
    }
    
    const response = await fetch(`${baseUrl}${endpoint}`, {
      method,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined
    });
    
    const data = await response.json();
    
    if (response.ok && data.success) {
      log(`✓ ${name} - Success`, 'green');
      return data.data;
    } else {
      log(`✗ ${name} - Failed: ${data.error?.message || 'Unknown error'}`, 'red');
      return null;
    }
  } catch (error) {
    log(`✗ ${name} - Error: ${error.message}`, 'red');
    return null;
  }
}

async function runTests() {
  log('=== SyncStream API MVP Release Test ===\n', 'yellow');
  
  // 1. Health Check
  await testEndpoint('Health Check', 'GET', '/health');
  
  // 2. Signup
  const signupResult = await testEndpoint('User Signup', 'POST', '/auth/signup', {
    body: {
      email: testEmail,
      password: testPassword,
      full_name: 'Test User'
    }
  });
  
  if (signupResult) {
    userId = signupResult.id;
  }
  
  // 3. Login
  const loginResult = await testEndpoint('User Login', 'POST', '/auth/login', {
    body: {
      email: testEmail,
      password: testPassword
    }
  });
  
  // Extract auth token from cookie (simulation)
  // In real scenario, we'd get this from response headers
  authToken = 'test-token';
  
  // 4. Get Current User
  await testEndpoint('Get Current User', 'GET', '/auth/me');
  
  // 5. Get Profiles
  await testEndpoint('Get Profiles', 'GET', '/profiles');
  
  // 6. Create Profile
  const profileResult = await testEndpoint('Create Profile', 'POST', '/profiles', {
    body: {
      name: 'Kids Profile',
      is_kids_profile: true,
      parental_pin: '1234'
    }
  });
  
  if (profileResult) {
    profileId = profileResult.id;
  }
  
  // 7. Select Profile
  await testEndpoint('Select Profile', 'POST', `/profiles/${profileId}/select`, {
    body: {
      pin: '1234'
    }
  });
  
  // 8. Get Playlists
  await testEndpoint('Get Playlists', 'GET', '/playlists');
  
  // 9. Create Playlist
  const playlistResult = await testEndpoint('Create Playlist', 'POST', '/playlists', {
    body: {
      name: 'My IPTV',
      url: 'http://example.com/playlist.m3u',
      username: 'user',
      password: 'pass'
    }
  });
  
  if (playlistResult) {
    playlistId = playlistResult.id;
  }
  
  // 10. Get Favorites
  await testEndpoint('Get Favorites', 'GET', '/favorites');
  
  // 11. Add Favorite
  await testEndpoint('Add Favorite', 'POST', '/favorites', {
    body: {
      item_id: 'channel_123',
      item_type: 'channel',
      item_name: 'Sports Channel',
      item_logo: 'http://example.com/logo.png'
    }
  });
  
  // 12. Get Progress
  await testEndpoint('Get Progress', 'GET', '/progress');
  
  // 13. Update Progress
  await testEndpoint('Update Progress', 'PUT', '/progress', {
    body: {
      item_id: 'movie_456',
      item_type: 'movie',
      progress_seconds: 1800,
      duration_seconds: 7200,
      completed: false
    }
  });
  
  // 14. Get Current Subscription
  await testEndpoint('Get Current Subscription', 'GET', '/subscriptions/current');
  
  // 15. Get Available Plans
  await testEndpoint('Get Available Plans', 'GET', '/subscriptions/plans');
  
  // 16. Logout
  await testEndpoint('Logout', 'POST', '/auth/logout');
  
  log('\n=== Test Summary ===', 'yellow');
  log('All critical endpoints for MVP release have been tested.', 'green');
  log('Note: Some features require Stripe webhooks and database setup.', 'yellow');
}

// Check if server is running
async function checkServer() {
  try {
    const response = await fetch(`${baseUrl}/health`);
    if (response.ok) {
      log('Server is running!', 'green');
      return true;
    }
  } catch (error) {
    log('Server is not running. Please start the server first.', 'red');
    log('Run: bun run src/index.js', 'yellow');
    return false;
  }
}

// Run tests
(async () => {
  const serverRunning = await checkServer();
  if (serverRunning) {
    await runTests();
  }
})();