import { Elysia, t } from 'elysia';
import { authPlugin } from '../plugins/auth.js';
import { databasePlugin } from '../plugins/database.js';
import { authMiddleware } from '../middleware/auth.js';
import { profileSelectionMiddleware } from '../middleware/auth.js';
import { updateProgressSchema } from '../utils/schemas.js';

export const progressRoutes = new Elysia({ prefix: '/progress' })
    .use(authPlugin)
    .use(databasePlugin)
    .use(authMiddleware) // Apply auth middleware to all progress routes
    .use(profileSelectionMiddleware)

    // Get watch progress for current profile
    .get('/', async ({ query, db, profileId }) => {

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

        return {
            success: true,
            message: null,
            data: progress
        };
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
    .put('/', async ({ body, db, profileId }) => {
        const {
            item_id,
            item_type,
            progress_seconds,
            duration_seconds,
            series_id,
            season_number,
            episode_number,
            metadata
        } = body;

        // Calculate if completed (95% watched)
        const completed = (progress_seconds / duration_seconds) >= 0.95;

        // Upsert progress record
        const progress = await db.query(`
            INSERT INTO watch_progress (
                profile_id, item_id, item_type, progress_seconds, 
                duration_seconds, completed, series_id, season_number, 
                episode_number, metadata, last_watched
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP)
            ON CONFLICT (profile_id, item_id) 
            DO UPDATE SET 
                progress_seconds = $4,
                duration_seconds = $5,
                completed = $6,
                metadata = $10,
                last_watched = CURRENT_TIMESTAMP
            RETURNING *
        `, [
            profileId,
            item_id,
            item_type,
            progress_seconds,
            duration_seconds,
            completed,
            series_id,
            season_number,
            episode_number,
            metadata || {}
        ]);

        return {
            success: true,
            message: 'Progress updated',
            data: progress.rows[0]
        };
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
        })
    })

    // Get continue watching
    .get('/continue-watching', async ({ db, query, profileId }) => {
        const limit = query.limit || 20;

        const items = await db.getMany(`
            SELECT * FROM watch_progress 
            WHERE profile_id = $1 
                AND completed = false 
                AND progress_seconds > 0
            ORDER BY last_watched DESC
            LIMIT $2
        `, [profileId, limit]);

        return {
            success: true,
            message: null,
            data: items
        };
    }, {
        query: t.Object({
            limit: t.Optional(t.Number({ minimum: 1, maximum: 100 }))
        })
    })

    // Clear progress for item
    .delete('/:itemId', async ({ params, db, profileId }) => {
        const result = await db.query(
            'DELETE FROM watch_progress WHERE profile_id = $1 AND item_id = $2 RETURNING id',
            [profileId, params.itemId]
        );

        if (result.rowCount === 0) {
            throw new Error('Progress record not found');
        }

        return {
            success: true,
            message: 'Progress cleared',
            data: null
        };
    }, {
        params: t.Object({
            itemId: t.String()
        })
    });
