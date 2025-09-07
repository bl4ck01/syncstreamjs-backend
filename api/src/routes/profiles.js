import { Elysia, t } from 'elysia';
import { authPlugin } from '../plugins/auth.js';
import { databasePlugin } from '../plugins/database.js';
import { authMiddleware, userContextMiddleware, activeSubscriptionMiddleware } from '../middleware/auth.js';

export const profileRoutes = new Elysia({ prefix: '/profiles' })
    .use(authPlugin)
    .use(databasePlugin)
    .use(authMiddleware) // Apply auth middleware to all profile routes
    
    // Get all profiles for user
    .get('/', async ({ userId, db }) => {
        const profiles = await db.getMany(
            'SELECT id, name, avatar_url, has_pin, is_kids_profile, created_at FROM profiles WHERE user_id = $1 AND is_active = true ORDER BY created_at',
            [userId]
        );

        return {
            success: true,
            data: profiles
        };
    })

    // Get current selected profile using header token
    .get('/current', async ({ db, userId, profileId }) => {
        // profileId is provided by profileSelectionMiddleware when applied at app level
        if (!profileId) {
            return {
                success: false,
                message: 'Profile not selected',
                data: null
            };
        }

        const profile = await db.getOne(
            'SELECT id, name, avatar_url, has_pin as parental_pin, is_kids_profile, created_at FROM profiles WHERE id = $1 AND user_id = $2 AND is_active = true',
            [profileId, userId]
        );

        if (!profile) {
            return {
                success: false,
                message: 'Profile not found',
                data: null
            };
        }

        return {
            success: true,
            data: profile
        };
    })

    // Create new profile - requires active subscription
    .use(userContextMiddleware)
    .use(activeSubscriptionMiddleware)
    .post('/', async ({ body, userId, user, db }) => {
        // Body is already validated by Elysia
        const { name, avatar_url, parental_pin, is_kids_profile } = body;

        // Check profile count against plan limit (plan already loaded in middleware)
        const profileCount = await db.getOne(
            'SELECT COUNT(*) as count FROM profiles WHERE user_id = $1',
            [userId]
        );

        const maxProfiles = user.subscription?.plan?.max_profiles || 0;
        if (maxProfiles !== -1 && parseInt(profileCount.count) >= maxProfiles) {
            throw new Error(`Plan limit reached. Maximum profiles: ${maxProfiles}`);
        }

        try {
            // Create profile with plain text PIN
            const profile = await db.insert('profiles', {
                user_id: userId,
                name,
                avatar_url,
                parental_pin: parental_pin || null,
                has_pin: !!(parental_pin && parental_pin.trim()),
                is_kids_profile: is_kids_profile || false
            });

            // Remove sensitive data
            delete profile.parental_pin;

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
    .post('/:id/select', async ({ params, body, userId, db, signProfileToken }) => {
        const profileId = params.id;

        // Verify profile belongs to user
        const profile = await db.getOne(
            'SELECT * FROM profiles WHERE id = $1 AND user_id = $2 AND is_active = true',
            [profileId, userId]
        );

        if (!profile) {
            throw new Error('Profile not found');
        }

        // Verify PIN if required (plain text comparison)
        if (profile.has_pin) {
            if (!body.pin) {
                console.log(`[PROFILE] PIN required but not provided for profile ${profileId}`);
                // throw new Error('PIN required');
                return {
                    success: false,
                    message: 'PIN required',
                    data: null
                };
            }

            if (body.pin !== profile.parental_pin) {
                console.log(`[PROFILE] Invalid PIN for profile ${profileId}`);
                // throw new Error('Invalid PIN');
                return {
                    success: false,
                    message: 'Invalid PIN',
                    data: null
                };
            }
        }

        // Remove sensitive data from profile
        delete profile.parental_pin;

        // Issue profile JWT token to be stored by the frontend
        const profileToken = await signProfileToken(userId, profileId);

        console.log(`[PROFILE] User ${userId} selected profile ${profileId}`);

        return {
            success: true,
            message: 'Profile selected successfully',
            data: { profile, profile_token: profileToken }
        };
    }, {
        params: t.Object({
            id: t.String({ format: 'uuid' })
        }),
        body: t.Object({
            pin: t.Optional(t.Union([t.String(), t.Null()]))
        })
    })

    // Update profile
    .patch('/:id', async ({ params, body, userId, db }) => {
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
            updateData.parental_pin = body.parental_pin || null;
            updateData.has_pin = !!(body.parental_pin && body.parental_pin.trim());
        }

        // Manually set updated_at since we removed the trigger
        updateData.updated_at = new Date();

        try {
            const profile = await db.update('profiles', updateData, { id: profileId });
            delete profile.parental_pin;

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
    .delete('/:id', async ({ params, userId, db }) => {
        const profileId = params.id;

        // Check ownership and ensure at least one profile remains
        const profiles = await db.getMany(
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
