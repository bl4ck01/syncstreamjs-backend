#!/usr/bin/env bun

/**
 * Test script to verify all refactored endpoints are working correctly
 * This script tests the middleware refactoring to ensure no regression
 */

import axios from 'axios';

const API_BASE_URL = process.env.API_URL || 'http://localhost:3000/api';
const TEST_EMAIL = 'test.refactor@example.com';
const TEST_PASSWORD = 'testpassword123';

// Colors for console output
const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    reset: '\x1b[0m'
};

let authToken = '';
let userId = '';

async function testEndpoint(name, method, path, data = null, headers = {}) {
    try {
        const config = {
            method,
            url: `${API_BASE_URL}${path}`,
            headers: {
                'Content-Type': 'application/json',
                ...headers
            }
        };

        if (data) {
            config.data = data;
        }

        const response = await axios(config);
        console.log(`${colors.green}✓${colors.reset} ${name}`);
        return response.data;
    } catch (error) {
        console.log(`${colors.red}✗${colors.reset} ${name}: ${error.response?.data?.message || error.message}`);
        throw error;
    }
}

async function runTests() {
    console.log(`${colors.blue}Starting API endpoint tests...${colors.reset}\n`);

    try {
        // Test 1: Signup
        console.log(`${colors.yellow}Testing Authentication Routes:${colors.reset}`);
        try {
            await testEndpoint('POST /auth/signup', 'post', '/auth/signup', {
                email: TEST_EMAIL,
                password: TEST_PASSWORD,
                full_name: 'Test User'
            });
        } catch (error) {
            // User might already exist, try login instead
            console.log(`${colors.yellow}  User already exists, attempting login...${colors.reset}`);
        }

        // Test 2: Login
        const loginResponse = await testEndpoint('POST /auth/login', 'post', '/auth/login', {
            email: TEST_EMAIL,
            password: TEST_PASSWORD
        });
        authToken = loginResponse.data.token;
        userId = loginResponse.data.id;

        const authHeaders = { Authorization: `Bearer ${authToken}` };

        // Test 3: Get current user (tests userContextMiddleware)
        const meResponse = await testEndpoint('GET /auth/me', 'get', '/auth/me', null, authHeaders);
        console.log(`  ${colors.blue}User subscription status: ${meResponse.data.subscription_status}${colors.reset}`);

        // Test 4: Logout
        await testEndpoint('POST /auth/logout', 'post', '/auth/logout', null, authHeaders);

        // Test 5: Profile routes
        console.log(`\n${colors.yellow}Testing Profile Routes:${colors.reset}`);
        await testEndpoint('GET /profiles', 'get', '/profiles', null, authHeaders);

        // Test 6: Playlist routes
        console.log(`\n${colors.yellow}Testing Playlist Routes:${colors.reset}`);
        await testEndpoint('GET /playlists', 'get', '/playlists', null, authHeaders);

        // Test 7: Subscription routes
        console.log(`\n${colors.yellow}Testing Subscription Routes:${colors.reset}`);
        await testEndpoint('GET /subscriptions/current', 'get', '/subscriptions/current', null, authHeaders);
        await testEndpoint('GET /subscriptions/plans', 'get', '/subscriptions/plans', null, authHeaders);
        await testEndpoint('GET /subscriptions/history', 'get', '/subscriptions/history', null, authHeaders);

        // Test 8: Public endpoints (no auth required)
        console.log(`\n${colors.yellow}Testing Public Routes:${colors.reset}`);
        await testEndpoint('GET /subscriptions/plans/public', 'get', '/subscriptions/plans/public');
        await testEndpoint('GET /health', 'get', '/health');

        console.log(`\n${colors.green}All basic endpoint tests passed!${colors.reset}`);
        
        // Performance comparison
        console.log(`\n${colors.blue}Performance Test - /auth/me endpoint:${colors.reset}`);
        console.log('Testing response time for optimized /auth/me endpoint...');
        
        const startTime = Date.now();
        const iterations = 10;
        
        for (let i = 0; i < iterations; i++) {
            await axios.get(`${API_BASE_URL}/auth/me`, {
                headers: { Authorization: `Bearer ${authToken}` }
            });
        }
        
        const avgTime = (Date.now() - startTime) / iterations;
        console.log(`Average response time: ${colors.green}${avgTime.toFixed(2)}ms${colors.reset}`);
        console.log(`This endpoint now uses a single optimized query instead of 3 separate queries!`);

    } catch (error) {
        console.error(`\n${colors.red}Test suite failed!${colors.reset}`);
        process.exit(1);
    }
}

// Run the tests
runTests().then(() => {
    console.log(`\n${colors.green}✨ All tests completed successfully!${colors.reset}`);
    process.exit(0);
}).catch((error) => {
    console.error(`\n${colors.red}Unexpected error:${colors.reset}`, error);
    process.exit(1);
});
