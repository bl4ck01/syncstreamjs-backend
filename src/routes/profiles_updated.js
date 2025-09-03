// This is an updated version of profiles.js that works with the simplified schema
// and properly hashes parental PINs according to security rules

import { Elysia, t } from 'elysia';
import bcrypt from 'bcrypt';
import { verifyPassword } from '../utils/password.js';

const authPlugin = (app) => app.use((ctx) => ctx.store.auth);

export default new Elysia()
    .use(authPlugin)
    .get('/', async ({ getUserId, db }) => {
        const userId = await getUserId();
        
        const profiles = await db.getAll(
            'SELECT id, name, avatar_url, is_kids_profile, created_at FROM profiles WHERE user_id = $1 AND is_active = true ORDER BY created_at',
            [userId]
        );

        return {
            success: true,
            data: profiles
        };
    })

    // Create new profile
    .post('/', async ({ body, getUserId, db }) => {
        const userId = await getUserId();

        // Body is already validated by Elysia
        const { name, avatar_url, parental_pin, is_kids_profile } = body;

        // Get user's plan limits
        const userPlan = await db.getOne(`
      SELECT 
        COALESCE(p.max_profiles, 1) as max_profiles
      FROM users u
      LEFT JOIN subscriptions s ON u.id = s.user_id AND s.status IN ('active', 'trialing')
      LEFT JOIN plans p ON s.plan_id = p.id
      WHERE u.id = $1
    `, [userId]);

        const maxProfiles = userPlan?.max_profiles || 1;

        // Check current profile count
        const profileCount = await db.getOne(
            'SELECT COUNT(*) as count FROM profiles WHERE user_id = $1',
            [userId]
        );

        if (maxProfiles !== -1 && parseInt(profileCount.count) >= maxProfiles) {
            throw new Error(`Plan limit reached. Maximum profiles: ${maxProfiles}`);
        }

        try {
            // Hash the parental PIN if provided
            let parental_pin_hash = null;
            if (parental_pin) {
                parental_pin_hash = await bcrypt.hash(parental_pin, 10);
            }

            // Create profile with hashed PIN
            const profile = await db.insert('profiles', {
                user_id: userId,
                name,
                avatar_url,
                parental_pin_hash,
                is_kids_profile: is_kids_profile || false
            });

            // Remove sensitive data
            delete profile.parental_pin_hash;

            return {
                success: true,
                message: 'Profile created successfully',
                data: profile
            };
        } catch (err) {
            // Handle duplicate name error from the unique constraint
            if (err.constraint === 'unique_user_profile_name_case_insensitive') {
                throw new Error('A profile with this name already exists');
            }
            throw err;
        }
    }, {
        body: t.Object({
            name: t.String({ minLength: 1, maxLength: 100 }),
            avatar_url: t.Optional(t.String({ format: 'uri' })),
            parental_pin: t.Optional(t.String({ pattern: '^\\d{4}$' })),
            is_kids_profile: t.Optional(t.Boolean())
        })
    })

    // Select profile for current session
    .post('/:id/select', async ({ params, body, getUserId, db, signToken }) => {
        const userId = await getUserId();
        const profileId = params.id;

        // Verify profile belongs to user
        const profile = await db.getOne(
            'SELECT * FROM profiles WHERE id = $1 AND user_id = $2 AND is_active = true',
            [profileId, userId]
        );

        if (!profile) {
            throw new Error('Profile not found');
        }

        // Verify PIN if required (bcrypt comparison)
        if (profile.parental_pin_hash) {
            if (!body.pin) {
                console.log(`[PROFILE] PIN required but not provided for profile ${profileId}`);
                throw new Error('PIN required');
            }

            const isPinValid = await bcrypt.compare(body.pin, profile.parental_pin_hash);
            if (!isPinValid) {
                console.log(`[PROFILE] Invalid PIN for profile ${profileId}`);
                throw new Error('Invalid PIN');
            }
        }

        // Get user email for JWT
        const user = await db.getOne('SELECT email FROM users WHERE id = $1', [userId]);

        // Issue new JWT with selected profile
        const token = await signToken(userId, user.email, profileId);

        // Remove sensitive data from profile
        delete profile.parental_pin_hash;

        console.log(`[PROFILE] User ${userId} selected profile ${profileId}`);

        return {
            success: true,
            message: 'Profile selected successfully',
            data: { profile, token }
        };
    }, {
        params: t.Object({
            id: t.String({ format: 'uuid' })
        }),
        body: t.Object({
            pin: t.Optional(t.String({ pattern: '^\\d{4}$' }))
        })
    })

    // Update profile
    .patch('/:id', async ({ params, body, getUserId, db }) => {
        const userId = await getUserId();
        const profileId = params.id;

        // Verify ownership
        const existing = await db.getOne(
            'SELECT id FROM profiles WHERE id = $1 AND user_id = $2',
            [profileId, userId]
        );

        if (!existing) {
            throw new Error('Profile not found');
        }

        const updateData = {};
        if (body.name !== undefined) updateData.name = body.name;
        if (body.avatar_url !== undefined) updateData.avatar_url = body.avatar_url;
        if (body.is_kids_profile !== undefined) updateData.is_kids_profile = body.is_kids_profile;
        
        // Handle parental PIN update
        if (body.parental_pin !== undefined) {
            if (body.parental_pin) {
                updateData.parental_pin_hash = await bcrypt.hash(body.parental_pin, 10);
            } else {
                updateData.parental_pin_hash = null;
            }
        }

        // Manually set updated_at since we removed the trigger
        updateData.updated_at = new Date();

        try {
            const profile = await db.update('profiles', updateData, { id: profileId });
            delete profile.parental_pin_hash;

            return {
                success: true,
                message: 'Profile updated successfully',
                data: profile
            };
        } catch (err) {
            // Handle duplicate name error from the unique constraint
            if (err.constraint === 'unique_user_profile_name_case_insensitive') {
                throw new Error('A profile with this name already exists');
            }
            throw err;
        }
    }, {
        params: t.Object({
            id: t.String({ format: 'uuid' })
        }),
        body: t.Object({
            name: t.Optional(t.String({ minLength: 1, maxLength: 100 })),
            avatar_url: t.Optional(t.String({ format: 'uri' })),
            parental_pin: t.Optional(t.String({ pattern: '^\\d{4}$' })),
            is_kids_profile: t.Optional(t.Boolean())
        })
    })

    // Delete profile
    .delete('/:id', async ({ params, getUserId, db }) => {
        const userId = await getUserId();
        const profileId = params.id;

        // Check ownership and ensure at least one profile remains
        const profiles = await db.getAll(
            'SELECT id FROM profiles WHERE user_id = $1 AND is_active = true',
            [userId]
        );

        if (profiles.length <= 1) {
            throw new Error('Cannot delete last profile');
        }

        const isOwner = profiles.some(p => p.id === profileId);
        if (!isOwner) {
            throw new Error('Profile not found');
        }

        // Soft delete
        await db.update('profiles', { is_active: false, updated_at: new Date() }, { id: profileId });

        return {
            success: true,
            message: 'Profile deleted successfully'
        };
    }, {
        params: t.Object({
            id: t.String({ format: 'uuid' })
        })
    });