import { beforeAll, afterAll, beforeEach } from 'bun:test';
import pg from 'pg';
import env from '../src/utils/env.js';

const { Pool } = pg;

// Test database connection
export const testPool = new Pool({
    connectionString: env.DATABASE_URL.replace('/syncstream_dev', '/syncstream_test'),
    max: 5
});

// Setup test database
export const setupTestDatabase = async () => {
    try {
        // Create test database if it doesn't exist
        const client = await testPool.connect();

        // Clean up existing data
        await client.query(`
      TRUNCATE TABLE 
        credits_transactions,
        watch_progress,
        favorites,
        playlists,
        profiles,
        subscriptions,
        users,
        plans,
        idempotency_keys
      CASCADE
    `);

        // Insert test plans
        await client.query(`
      INSERT INTO plans (id, name, stripe_price_id, price_monthly, max_profiles, max_playlists, max_favorites, features)
      VALUES 
        ('00000000-0000-0000-0000-000000000001', 'Free', 'price_free', 0, 1, 1, 10, '{"ads": true, "hd": false}'),
        ('00000000-0000-0000-0000-000000000002', 'Basic', 'price_basic_test', 4.99, 3, 5, 100, '{"ads": false, "hd": true}'),
        ('00000000-0000-0000-0000-000000000003', 'Premium', 'price_premium_test', 9.99, 5, 10, 500, '{"ads": false, "hd": true, "4k": true}')
    `);

        client.release();
        console.log('✅ Test database setup complete');
    } catch (error) {
        console.error('❌ Test database setup failed:', error);
        throw error;
    }
};

// Clean up test database
export const cleanupTestDatabase = async () => {
    await testPool.end();
    console.log('✅ Test database connections closed');
};

// Create test user
export const createTestUser = async (overrides = {}) => {
    const defaultUser = {
        email: `test${Date.now()}@example.com`,
        password_hash: '$2b$10$K7L1OJ0TfPIoANwqsJu.8uQGKqWBHiwHQvub5BLbRLZi2qKSp4iq', // password123
        full_name: 'Test User',
        role: 'user',
        has_used_trial: false,
        credits_balance: 0
    };

    const userData = { ...defaultUser, ...overrides };

    const result = await testPool.query(
        `INSERT INTO users (email, password_hash, full_name, role, has_used_trial, credits_balance)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
        [userData.email, userData.password_hash, userData.full_name, userData.role, userData.has_used_trial, userData.credits_balance]
    );

    return result.rows[0];
};

// Create test profile
export const createTestProfile = async (userId, overrides = {}) => {
    const defaultProfile = {
        name: 'Test Profile',
        is_kids_profile: false,
        is_active: true
    };

    const profileData = { ...defaultProfile, ...overrides };

    const result = await testPool.query(
        `INSERT INTO profiles (user_id, name, is_kids_profile, is_active, parental_pin)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
        [userId, profileData.name, profileData.is_kids_profile, profileData.is_active, profileData.parental_pin]
    );

    return result.rows[0];
};

// Create test subscription
export const createTestSubscription = async (userId, planId, overrides = {}) => {
    const defaultSubscription = {
        stripe_subscription_id: `sub_test_${Date.now()}`,
        stripe_customer_id: `cus_test_${Date.now()}`,
        status: 'active',
        current_period_start: new Date(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
    };

    const subscriptionData = { ...defaultSubscription, ...overrides };

    const result = await testPool.query(
        `INSERT INTO subscriptions (user_id, plan_id, stripe_subscription_id, stripe_customer_id, status, current_period_start, current_period_end)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
        [userId, planId, subscriptionData.stripe_subscription_id, subscriptionData.stripe_customer_id,
            subscriptionData.status, subscriptionData.current_period_start, subscriptionData.current_period_end]
    );

    return result.rows[0];
};

// Generate auth token
export const generateTestToken = (userId, email, role = 'user', profileId = null) => {
    // This would use the actual JWT signing logic
    // For now, return a mock token
    return `test_token_${userId}_${role}`;
};

// Test API request helper
export const testRequest = async (app, method, path, options = {}) => {
    const { body, headers = {}, token } = options;

    const requestOptions = {
        method,
        headers: {
            'Content-Type': 'application/json',
            ...headers,
            ...(token && { 'Cookie': `auth=${token}` })
        }
    };

    if (body) {
        requestOptions.body = JSON.stringify(body);
    }

    const response = await app.handle(new Request(`http://localhost${path}`, requestOptions));
    const data = await response.json();

    return {
        status: response.status,
        headers: response.headers,
        data
    };
};

// Mock Stripe
export const mockStripe = {
    customers: {
        create: async (data) => ({ id: `cus_test_${Date.now()}`, ...data }),
        retrieve: async (id) => ({ id, email: 'test@example.com' }),
        update: async (id, data) => ({ id, ...data })
    },
    subscriptions: {
        create: async (data) => ({
            id: `sub_test_${Date.now()}`,
            status: 'active',
            current_period_end: Math.floor(Date.now() / 1000) + 2592000,
            ...data
        }),
        retrieve: async (id) => ({ id, status: 'active' }),
        update: async (id, data) => ({ id, ...data }),
        cancel: async (id) => ({ id, status: 'canceled' })
    },
    checkout: {
        sessions: {
            create: async (data) => ({
                id: `cs_test_${Date.now()}`,
                url: 'https://checkout.stripe.com/test',
                ...data
            })
        }
    },
    webhooks: {
        constructEvent: (payload, signature, secret) => {
            // Mock webhook event
            return JSON.parse(payload);
        }
    }
};
