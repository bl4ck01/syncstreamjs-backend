import { Elysia, t } from 'elysia';
import { authPlugin } from '../plugins/auth.js';
import { databasePlugin } from '../plugins/database.js';
import { addFavoriteSchema } from '../utils/schemas.js';

export const favoritesRoutes = new Elysia({ prefix: '/favorites' })
    .use(authPlugin)
    .use(databasePlugin)
    .guard({
        beforeHandle: async ({ getUserId, set }) => {
            const userId = await getUserId();
            if (!userId) {
                set.status = 401;
                return {
                    success: false,
                    message: 'Unauthorized - Invalid or missing authentication token',
                    data: null
                };
            }
        }
    })

    // Get favorites for current profile
    .get('/', async ({ getCurrentProfileId, db, query }) => {
        const profileId = await getCurrentProfileId();

        if (!profileId) {
            throw new Error('No profile selected. Please select a profile first.');
        }

        // Build query with optional type filter
        let sqlQuery = 'SELECT * FROM favorites WHERE profile_id = $1';
        const params = [profileId];

        if (query.type) {
            sqlQuery += ' AND item_type = $2';
            params.push(query.type);
        }

        sqlQuery += ' ORDER BY created_at DESC';

        const favorites = await db.getMany(sqlQuery, params);

        return {
            success: true,
            message: null,
            data: favorites
        };
    }, {
        query: t.Object({
            type: t.Optional(t.Union([
                t.Literal('channel'),
                t.Literal('movie'),
                t.Literal('series')
            ]))
        })
    })

    // Add favorite
    .post('/', async ({ body, getCurrentProfileId, getUserId, db }) => {
        const profileId = await getCurrentProfileId();
        const userId = await getUserId();

        const validatedData = body;

        if (!profileId) {
            throw new Error('No profile selected. Please select a profile first.');
        }

        // Verify profile belongs to user
        const profile = await db.getOne(
            'SELECT user_id FROM profiles WHERE id = $1',
            [profileId]
        );

        if (!profile || profile.user_id !== userId) {
            throw new Error('Invalid profile');
        }

        // Note: Favorites feature is available to all users without limits

        // Try to insert favorite (will fail if duplicate)
        try {
            const favorite = await db.insert('favorites', {
                profile_id: profileId,
                item_id: validatedData.item_id,
                item_type: validatedData.item_type,
                item_name: validatedData.item_name,
                item_logo: validatedData.item_logo,
                metadata: validatedData.metadata || {}
            });

            return {
                success: true,
                message: 'Added to favorites',
                data: favorite
            };
        } catch (error) {
            if (error.code === '23505') { // Unique constraint violation
                throw new Error('Item is already in favorites');
            }
            throw error;
        }
    }, {
        body: addFavoriteSchema
    })

    // Remove favorite
    .delete('/:itemId', async ({ params, getCurrentProfileId, db }) => {
        const profileId = await getCurrentProfileId();
        const itemId = params.itemId;

        if (!profileId) {
            throw new Error('No profile selected. Please select a profile first.');
        }

        const result = await db.query(
            'DELETE FROM favorites WHERE profile_id = $1 AND item_id = $2 RETURNING id',
            [profileId, itemId]
        );

        if (result.rowCount === 0) {
            throw new Error('Favorite not found');
        }

        return {
            success: true,
            message: 'Favorite removed successfully',
            data: null
        };
    }, {
        params: t.Object({
            itemId: t.String()
        })
    })

    // Check if item is favorited
    .get('/check/:itemId', async ({ params, getCurrentProfileId, db }) => {
        const profileId = await getCurrentProfileId();
        const itemId = params.itemId;

        if (!profileId) {
            throw new Error('No profile selected. Please select a profile first.');
        }

        const favorite = await db.getOne(
            'SELECT id FROM favorites WHERE profile_id = $1 AND item_id = $2',
            [profileId, itemId]
        );

        return {
            success: true,
            message: null,
            data: { is_favorite: !!favorite }
        };
    }, {
        params: t.Object({
            itemId: t.String()
        })
    });
