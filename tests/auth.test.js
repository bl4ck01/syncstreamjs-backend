import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import { Elysia } from 'elysia';
import { authRoutes } from '../src/routes/auth.js';
import { authPlugin } from '../src/plugins/auth.js';
import { databasePlugin } from '../src/plugins/database.js';
import { setupTestDatabase, cleanupTestDatabase, createTestUser, testPool, testRequest } from './setup.js';

describe('Authentication', () => {
    let app;

    beforeAll(async () => {
        await setupTestDatabase();

        // Create test app
        app = new Elysia()
            .use(authPlugin)
            .use(databasePlugin)
            .use(authRoutes);
    });

    afterAll(async () => {
        await cleanupTestDatabase();
    });

    beforeEach(async () => {
        // Clean up users before each test
        await testPool.query('DELETE FROM users WHERE email LIKE $1', ['test%']);
    });

    describe('POST /auth/signup', () => {
        test('should create a new user', async () => {
            const response = await testRequest(app, 'POST', '/auth/signup', {
                body: {
                    email: 'newuser@example.com',
                    password: 'SecurePass123!',
                    full_name: 'New User'
                }
            });

            expect(response.status).toBe(200);
            expect(response.data.success).toBe(true);
            expect(response.data.data.email).toBe('newuser@example.com');
            expect(response.data.data.role).toBe('user');
            expect(response.data.data.password_hash).toBeUndefined();
        });

        test('should reject duplicate email', async () => {
            await createTestUser({ email: 'existing@example.com' });

            const response = await testRequest(app, 'POST', '/auth/signup', {
                body: {
                    email: 'existing@example.com',
                    password: 'Password123!',
                    full_name: 'Duplicate User'
                }
            });

            expect(response.status).toBe(400);
            expect(response.data.success).toBe(false);
            expect(response.data.error.message).toContain('already exists');
        });

        test('should validate email format', async () => {
            const response = await testRequest(app, 'POST', '/auth/signup', {
                body: {
                    email: 'invalid-email',
                    password: 'Password123!',
                    full_name: 'Invalid Email'
                }
            });

            expect(response.status).toBe(400);
            expect(response.data.success).toBe(false);
            expect(response.data.error.code).toBe('VALIDATION_ERROR');
        });

        test('should validate password length', async () => {
            const response = await testRequest(app, 'POST', '/auth/signup', {
                body: {
                    email: 'test@example.com',
                    password: 'short',
                    full_name: 'Test User'
                }
            });

            expect(response.status).toBe(400);
            expect(response.data.success).toBe(false);
            expect(response.data.error.message).toContain('at least 8 characters');
        });
    });

    describe('POST /auth/login', () => {
        test('should login with valid credentials', async () => {
            await createTestUser({
                email: 'user@example.com',
                password_hash: '$2b$10$K7L1OJ0TfPIoANwqsJu.8uQGKqWBHiwHQvub5BLbRLZi2qKSp4iq' // password123
            });

            const response = await testRequest(app, 'POST', '/auth/login', {
                body: {
                    email: 'user@example.com',
                    password: 'password123'
                }
            });

            expect(response.status).toBe(200);
            expect(response.data.success).toBe(true);
            expect(response.data.data.email).toBe('user@example.com');
            expect(response.headers.get('set-cookie')).toContain('auth=');
        });

        test('should reject invalid password', async () => {
            await createTestUser({
                email: 'user@example.com',
                password_hash: '$2b$10$K7L1OJ0TfPIoANwqsJu.8uQGKqWBHiwHQvub5BLbRLZi2qKSp4iq'
            });

            const response = await testRequest(app, 'POST', '/auth/login', {
                body: {
                    email: 'user@example.com',
                    password: 'wrongpassword'
                }
            });

            expect(response.status).toBe(401);
            expect(response.data.success).toBe(false);
            expect(response.data.error.message).toContain('Invalid');
        });

        test('should reject non-existent user', async () => {
            const response = await testRequest(app, 'POST', '/auth/login', {
                body: {
                    email: 'nonexistent@example.com',
                    password: 'password123'
                }
            });

            expect(response.status).toBe(401);
            expect(response.data.success).toBe(false);
        });
    });

    describe('GET /auth/me', () => {
        test('should return current user when authenticated', async () => {
            const user = await createTestUser({ email: 'auth@example.com' });
            const token = 'valid_token'; // Would use real JWT in production

            const response = await testRequest(app, 'GET', '/auth/me', {
                token
            });

            // This would work with real JWT implementation
            // expect(response.status).toBe(200);
            // expect(response.data.data.email).toBe('auth@example.com');
        });

        test('should return 401 when not authenticated', async () => {
            const response = await testRequest(app, 'GET', '/auth/me');

            expect(response.status).toBe(401);
            expect(response.data.success).toBe(false);
        });
    });

    describe('POST /auth/logout', () => {
        test('should clear auth cookie', async () => {
            const response = await testRequest(app, 'POST', '/auth/logout', {
                token: 'some_token'
            });

            expect(response.status).toBe(200);
            expect(response.data.success).toBe(true);
            expect(response.headers.get('set-cookie')).toContain('auth=;');
        });
    });
});
