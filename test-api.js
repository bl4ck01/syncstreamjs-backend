// Quick API test script
const BASE_URL = 'http://localhost:3000';

async function testAPI() {
  try {
    // Test health endpoint
    console.log('Testing /health endpoint...');
    const healthRes = await fetch(`${BASE_URL}/health`);
    const health = await healthRes.json();
    console.log('Health check:', health);
    
    // Test root endpoint
    console.log('\nTesting / endpoint...');
    const rootRes = await fetch(`${BASE_URL}/`);
    const root = await rootRes.json();
    console.log('Root endpoint:', root);
    
    // Test auth endpoints (will fail without DB)
    console.log('\nTesting /auth/signup (should fail without DB)...');
    const signupRes = await fetch(`${BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'password123',
        username: 'testuser',
        full_name: 'Test User'
      })
    });
    const signup = await signupRes.json();
    console.log('Signup response:', signup);
    
  } catch (error) {
    console.error('Test error:', error.message);
  }
}

testAPI();