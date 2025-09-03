import { Elysia } from 'elysia';
import { authPlugin } from '../plugins/auth.js';
import { databasePlugin } from '../plugins/database.js';
import { createProfileSchema, updateProfileSchema, selectProfileSchema, idParamSchema } from '../utils/schemas.js';
import { createLogger, SECURITY_EVENTS } from '../services/logger.js';

export const profileRoutes = new Elysia({ prefix: '/profiles' })
    .use(authPlugin)
    .use(databasePlugin)
    .derive(({ db }) => ({
        logger: createLogger(db)
    }))

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
        body: createProfileSchema
    })

    // Select profile (sets current profile in JWT)
    .post('/:id/select', async ({ params, body, getUserId, db, signToken, logger, request }) => {
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
                await logger.logSecurityEvent({
                    event_type: SECURITY_EVENTS.PROFILE_ACCESS_DENIED,
                    user_id: userId,
                    success: false,
                    failure_reason: 'PIN required but not provided',
                    metadata: { profile_id: profileId },
                    request
                });
                throw new Error('PIN required');
            }

            if (body.pin !== profile.parental_pin) {
                await logger.logSecurityEvent({
                    event_type: SECURITY_EVENTS.PROFILE_PIN_FAILED,
                    user_id: userId,
                    success: false,
                    failure_reason: 'Invalid PIN',
                    metadata: { profile_id: profileId },
                    request
                });
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
        params: idParamSchema,
        body: selectProfileSchema
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
        Object.assign(updateData, body);

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
        params: idParamSchema,
        body: updateProfileSchema
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
        params: idParamSchema
    });
