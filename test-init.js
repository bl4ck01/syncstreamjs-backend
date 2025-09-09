#!/usr/bin/env node

// Test script to verify the application initialization flow
const http = require('http');

// Test the home page endpoint
const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/',
  method: 'GET',
  headers: {
    'User-Agent': 'Mozilla/5.0 (Test Script)'
  }
};

const req = http.request(options, (res) => {
  console.log(`Status Code: ${res.statusCode}`);
  console.log(`Headers: ${JSON.stringify(res.headers, null, 2)}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log(`Response Length: ${data.length} bytes`);
    console.log('✅ Home page endpoint is responding');
    
    // Check for key indicators of successful initialization
    const hasDatabaseStatus = data.includes('Database Status');
    const hasHomeContent = data.includes('Home');
    const hasError = data.toLowerCase().includes('error');
    
    console.log(`📊 Database Status Present: ${hasDatabaseStatus}`);
    console.log(`🏠 Home Content Present: ${hasHomeContent}`);
    console.log(`❌ Error Content Present: ${hasError}`);
    
    if (hasDatabaseStatus && hasHomeContent && !hasError) {
      console.log('✅ Application appears to be initialized correctly');
    } else {
      console.log('⚠️  Application may have initialization issues');
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request failed:', error.message);
});

req.setTimeout(5000, () => {
  console.log('⏰ Request timed out');
  req.destroy();
});

req.end();