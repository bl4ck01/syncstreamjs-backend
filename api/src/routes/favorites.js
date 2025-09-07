import { Elysia, t } from 'elysia';
import { authPlugin } from '../plugins/auth.js';
import { databasePlugin } from '../plugins/database.js';
import { authMiddleware, profileSelectionMiddleware } from '../middleware/auth.js';
import { addFavoriteSchema } from '../utils/schemas.js';

export const favoritesRoutes = new Elysia({ prefix: '/favorites' })
    .use(authPlugin)
    .use(databasePlugin)
    .use(authMiddleware) // Apply auth middleware to all favorites routes
    .use(profileSelectionMiddleware)

    // Get favorites for current profile
    .get('/', async ({ query, db, userId, profileId }) => {
        // profileId already validated in middleware

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
    .post('/', async ({ body, db, userId, profileId }) => {
        const validatedData = { ...body, profile_id: profileId };

        // profileId ownership validated in middleware

        // Note: Favorites feature is available to all users without limits

        // Try to insert favorite (will fail if duplicate)
        try {
            const favorite = await db.insert('favorites', {
                profile_id: validatedData.profile_id,
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
    .delete('/:itemId', async ({ params, db, profileId }) => {
        const itemId = params.itemId;

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
        }),
        query: t.Object({})
    })

    // Check if item is favorited
    .get('/check/:itemId', async ({ params, db, profileId }) => {
        const itemId = params.itemId;

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
        }),
        query: t.Object({})
    });
