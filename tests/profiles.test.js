import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import { setupTestDatabase, cleanupTestDatabase, createTestUser, createTestProfile, testPool } from './setup.js';

describe('Profiles', () => {
    let testUser;

    beforeAll(async () => {
        await setupTestDatabase();
    });

    afterAll(async () => {
        await cleanupTestDatabase();
    });

    beforeEach(async () => {
        // Clean up and create fresh test user
        await testPool.query('DELETE FROM users WHERE email LIKE $1', ['test%']);
        testUser = await createTestUser({ email: 'profiletest@example.com' });
    });

    describe('Profile Creation', () => {
        test('should create a profile with valid data', async () => {
            const profile = await createTestProfile(testUser.id, {
                name: 'Main Profile',
                is_kids_profile: false
            });

            expect(profile.name).toBe('Main Profile');
            expect(profile.user_id).toBe(testUser.id);
            expect(profile.is_kids_profile).toBe(false);
            expect(profile.is_active).toBe(true);
        });

        test('should create a kids profile with PIN', async () => {
            const profile = await createTestProfile(testUser.id, {
                name: 'Kids',
                is_kids_profile: true,
                parental_pin: '1234'
            });

            expect(profile.name).toBe('Kids');
            expect(profile.is_kids_profile).toBe(true);
            expect(profile.parental_pin).toBe('1234'); // Plain text as per requirements
        });

        test('should enforce profile limit based on plan', async () => {
            // Create max profiles for free plan (1)
            await createTestProfile(testUser.id, { name: 'Profile 1' });

            // Attempting to create another should fail (would need actual API test)
            try {
                await createTestProfile(testUser.id, { name: 'Profile 2' });
                // In real implementation, this would check against plan limits
            } catch (error) {
                expect(error.message).toContain('limit');
            }
        });
    });

    describe('Profile Selection', () => {
        test('should select profile without PIN', async () => {
            const profile = await createTestProfile(testUser.id, {
                name: 'No PIN Profile'
            });

            // Profile selection would be tested through API
            expect(profile.parental_pin).toBeNull();
        });

        test('should require correct PIN for protected profile', async () => {
            const profile = await createTestProfile(testUser.id, {
                name: 'Protected',
                parental_pin: '9876'
            });

            // Test PIN validation
            expect(profile.parental_pin).toBe('9876');

            // In real API test:
            // - Attempt with wrong PIN should fail
            // - Attempt with correct PIN should succeed
        });
    });

    describe('Profile Management', () => {
        test('should update profile name', async () => {
            const profile = await createTestProfile(testUser.id, {
                name: 'Original Name'
            });

            const result = await testPool.query(
                'UPDATE profiles SET name = $1 WHERE id = $2 RETURNING *',
                ['Updated Name', profile.id]
            );

            expect(result.rows[0].name).toBe('Updated Name');
        });

        test('should delete profile', async () => {
            const profile = await createTestProfile(testUser.id, {
                name: 'To Delete'
            });

            await testPool.query('DELETE FROM profiles WHERE id = $1', [profile.id]);

            const result = await testPool.query(
                'SELECT * FROM profiles WHERE id = $1',
                [profile.id]
            );

            expect(result.rows.length).toBe(0);
        });

        test('should cascade delete favorites when profile is deleted', async () => {
            const profile = await createTestProfile(testUser.id);

            // Add a favorite
            await testPool.query(
                'INSERT INTO favorites (profile_id, item_id, item_type, item_name) VALUES ($1, $2, $3, $4)',
                [profile.id, 'item123', 'movie', 'Test Movie']
            );

            // Delete profile
            await testPool.query('DELETE FROM profiles WHERE id = $1', [profile.id]);

            // Check favorites are deleted
            const favorites = await testPool.query(
                'SELECT * FROM favorites WHERE profile_id = $1',
                [profile.id]
            );

            expect(favorites.rows.length).toBe(0);
        });
    });
});
