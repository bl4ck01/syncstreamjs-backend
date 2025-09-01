import { Elysia, t } from 'elysia';
import { authPlugin } from '../plugins/auth.js';
import { databasePlugin } from '../plugins/database.js';
import { updateProgressSchema } from '../utils/validation.js';

export const progressRoutes = new Elysia({ prefix: '/progress' })
    .use(authPlugin)
    .use(databasePlugin)
    .guard({
        beforeHandle: ({ requireAuth }) => requireAuth()
    })

    // Get watch progress for current profile
    .get('/', async ({ getCurrentProfileId, db, query }) => {
        const profileId = await getCurrentProfileId();

        if (!profileId) {
            throw new Error('No profile selected. Please select a profile first.');
        }

        // Build query
        let sqlQuery = 'SELECT * FROM watch_progress WHERE profile_id = $1';
        const params = [profileId];

        if (query.type) {
            sqlQuery += ' AND item_type = $2';
            params.push(query.type);
        }

        if (query.completed !== undefined) {
            sqlQuery += ` AND completed = $${params.length + 1}`;
            params.push(query.completed);
        }

        sqlQuery += ' ORDER BY last_watched DESC';

        const progress = await db.getMany(sqlQuery, params);

        return progress;
    }, {
        query: t.Object({
            type: t.Optional(t.Union([
                t.Literal('movie'),
                t.Literal('episode')
            ])),
            completed: t.Optional(t.Boolean())
        })
    })

    // Update watch progress
    .put('/', async ({ body, getCurrentProfileId, getUserId, db }) => {
        const profileId = await getCurrentProfileId();
        const userId = await getUserId();

        // Validate request body
        const validatedData = updateProgressSchema.parse(body);

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

        const { item_id, item_type, progress_seconds, duration_seconds, completed, metadata } = validatedData;

        // Check if progress exists
        const existing = await db.getOne(
            'SELECT id FROM watch_progress WHERE profile_id = $1 AND item_id = $2',
            [profileId, item_id]
        );

        if (existing) {
            // Update existing progress
            const updateData = {
                progress_seconds,
                last_watched: new Date().toISOString()
            };

            if (duration_seconds !== undefined) updateData.duration_seconds = duration_seconds;
            if (completed !== undefined) updateData.completed = completed;
            if (metadata !== undefined) updateData.metadata = metadata;

            const progress = await db.update('watch_progress', existing.id, updateData);
            return progress;
        } else {
            // Create new progress
            const progress = await db.insert('watch_progress', {
                profile_id: profileId,
                item_id,
                item_type,
                progress_seconds,
                duration_seconds: duration_seconds || null,
                completed: completed || false,
                metadata: metadata || {},
                last_watched: new Date().toISOString()
            });

            return progress;
        }
    }, {
        body: t.Object({
            item_id: t.String({ minLength: 1 }),
            item_type: t.Union([
                t.Literal('movie'),
                t.Literal('episode')
            ]),
            progress_seconds: t.Number({ minimum: 0 }),
            duration_seconds: t.Optional(t.Number({ minimum: 0 })),
            completed: t.Optional(t.Boolean()),
            metadata: t.Optional(t.Object({}))
        }),
        transform({ body }) {
            return updateProgressSchema.parse(body);
        }
    })

    // Get progress for specific item
    .get('/:itemId', async ({ params, getCurrentProfileId, db }) => {
        const profileId = await getCurrentProfileId();
        const itemId = params.itemId;

        if (!profileId) {
            throw new Error('No profile selected. Please select a profile first.');
        }

        const progress = await db.getOne(
            'SELECT * FROM watch_progress WHERE profile_id = $1 AND item_id = $2',
            [profileId, itemId]
        );

        if (!progress) {
            return {
                item_id: itemId,
                progress_seconds: 0,
                completed: false
            };
        }

        return progress;
    }, {
        params: t.Object({
            itemId: t.String()
        })
    })

    // Delete progress
    .delete('/:itemId', async ({ params, getCurrentProfileId, db }) => {
        const profileId = await getCurrentProfileId();
        const itemId = params.itemId;

        if (!profileId) {
            throw new Error('No profile selected. Please select a profile first.');
        }

        const result = await db.query(
            'DELETE FROM watch_progress WHERE profile_id = $1 AND item_id = $2 RETURNING id',
            [profileId, itemId]
        );

        if (result.rowCount === 0) {
            throw new Error('Progress not found');
        }

        return { message: 'Progress deleted successfully' };
    }, {
        params: t.Object({
            itemId: t.String()
        })
    });
