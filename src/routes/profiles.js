import { Elysia, t } from 'elysia';
import { authPlugin } from '../plugins/auth.js';
import { databasePlugin } from '../plugins/database.js';

export const profileRoutes = new Elysia({ prefix: '/profiles' })
    .use(authPlugin)
    .use(databasePlugin)

    // Get all profiles for user
    .get('/', async ({ getUserId, db, set }) => {
        const userId = await getUserId();

        if (!userId) {
            set.status = 401;
            return {
                success: false,
                message: 'Unauthorized - Invalid or missing authentication token',
                data: null
            };
        }

        const profiles = await db.getMany(
            'SELECT id, name, avatar_url, is_kids_profile, created_at FROM profiles WHERE user_id = $1 ORDER BY created_at',
            [userId]
        );

        return {
            success: true,
            message: null,
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
      LEFT JOIN subscriptions s ON u.id = s.user_id AND s.status = 'active'
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

        // Create profile (PIN stored as plain text)
        const profile = await db.insert('profiles', {
            user_id: userId,
            name,
            avatar_url,
            parental_pin: parental_pin || null,
            is_kids_profile: is_kids_profile || false
        });

        // Remove sensitive data
        delete profile.parental_pin;

        return {
            success: true,
            message: 'Profile created successfully',
            data: profile
        };
    }, {
        body: t.Object({
            name: t.String({ minLength: 1, maxLength: 100 }),
            avatar_url: t.Optional(t.String({ format: 'url' })),
            parental_pin: t.Optional(t.String({ pattern: '^\\d{4}$' })),
            is_kids_profile: t.Optional(t.Boolean())
        })
    })

    // Select profile (sets current profile in JWT)
    .post('/:id/select', async ({ params, body, getUserId, db, signToken }) => {
        const userId = await getUserId();
        const profileId = params.id;

        // Get profile and verify ownership
        const profile = await db.getOne(
            'SELECT * FROM profiles WHERE id = $1 AND user_id = $2',
            [profileId, userId]
        );

        if (!profile) {
            throw new Error('Profile not found');
        }

        // Verify PIN if required (plain text comparison)
        if (profile.parental_pin) {
            if (!body.pin) {
                throw new Error('PIN required');
            }

            if (body.pin !== profile.parental_pin) {
                throw new Error('Invalid PIN');
            }
        }

        // Get user email for JWT
        const user = await db.getOne('SELECT email FROM users WHERE id = $1', [userId]);

        // Issue new JWT with selected profile
        const token = await signToken(userId, user.email, profileId);

        return {
            success: true,
            message: 'Profile selected successfully',
            data: {
                token,
                profile: {
                    id: profile.id,
                    name: profile.name,
                    avatar_url: profile.avatar_url,
                    is_kids_profile: profile.is_kids_profile
                }
            }
        };
    }, {
        params: t.Object({
            id: t.String()
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
        const exists = await db.getOne(
            'SELECT id FROM profiles WHERE id = $1 AND user_id = $2',
            [profileId, userId]
        );

        if (!exists) {
            throw new Error('Profile not found');
        }

        // Prepare update data
        const updateData = {};
        if (body.name !== undefined) updateData.name = body.name;
        if (body.avatar_url !== undefined) updateData.avatar_url = body.avatar_url;
        if (body.is_kids_profile !== undefined) updateData.is_kids_profile = body.is_kids_profile;

        // Handle PIN update (plain text)
        if (body.parental_pin !== undefined) {
            updateData.parental_pin = body.parental_pin || null;
        }

        const profile = await db.update('profiles', profileId, updateData);

        // Remove sensitive data
        delete profile.parental_pin;

        return {
            success: true,
            message: 'Profile updated successfully',
            data: profile
        };
    }, {
        params: t.Object({
            id: t.String()
        }),
        body: t.Object({
            name: t.Optional(t.String({ minLength: 1, maxLength: 100 })),
            avatar_url: t.Optional(t.String({ format: 'url' })),
            parental_pin: t.Optional(t.String({ pattern: '^\\d{4}$' })),
            is_kids_profile: t.Optional(t.Boolean())
        })
    })

    // Delete profile
    .delete('/:id', async ({ params, getUserId, db }) => {
        const userId = await getUserId();
        const profileId = params.id;

        // Can't delete last profile
        const profileCount = await db.getOne(
            'SELECT COUNT(*) as count FROM profiles WHERE user_id = $1',
            [userId]
        );

        if (parseInt(profileCount.count) <= 1) {
            throw new Error('Cannot delete the last profile');
        }

        // Delete profile (cascades to favorites and watch_progress)
        const result = await db.query(
            'DELETE FROM profiles WHERE id = $1 AND user_id = $2 RETURNING id',
            [profileId, userId]
        );

        if (result.rowCount === 0) {
            throw new Error('Profile not found');
        }

        return {
            success: true,
            message: 'Profile deleted successfully',
            data: null
        };
    }, {
        params: t.Object({
            id: t.String()
        })
    });
