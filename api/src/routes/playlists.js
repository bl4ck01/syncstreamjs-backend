import { Elysia } from 'elysia';
import { authPlugin } from '../plugins/auth.js';
import { databasePlugin } from '../plugins/database.js';
import { authMiddleware, userContextMiddleware, activeSubscriptionMiddleware } from '../middleware/auth.js';
import { createPlaylistSchema, updatePlaylistSchema, idParamSchema } from '../utils/schemas.js';

export const playlistRoutes = new Elysia({ prefix: '/playlists' })
    .use(authPlugin)
    .use(databasePlugin)
    .use(authMiddleware) // Apply auth middleware to all playlist routes

    // Get all playlists for user
    .get('/', async ({ userId, db }) => {
        const playlists = await db.getMany(
            'SELECT id, name, url, username, password, is_active, created_at FROM playlists WHERE user_id = $1 ORDER BY created_at DESC',
            [userId]
        );

        return {
            success: true,
            message: null,
            data: playlists
        };
    })

    // Create new playlist - requires active subscription
    .use(userContextMiddleware)
    .use(activeSubscriptionMiddleware)
    .post('/', async ({ body, userId, user, db }) => {
        // Check playlist count against plan limit (plan already loaded in middleware)
        const playlistCount = await db.getOne(
            'SELECT COUNT(*) as count FROM playlists WHERE user_id = $1 AND is_active = true',
            [userId]
        );

        const maxPlaylists = user.subscription?.plan?.max_playlists;
        if (maxPlaylists && maxPlaylists !== -1 && parseInt(playlistCount.count) >= maxPlaylists) {
            throw new Error(`Playlist limit reached. Your plan allows ${maxPlaylists} playlists.`);
        }

        // Create playlist (password encryption should be handled at a different layer)
        const playlist = await db.insert('playlists', {
            user_id: userId,
            name: body.name,
            url: body.url,
            username: body.username,
            password: body.password // Note: In production, this should be encrypted
        });

        return {
            success: true,
            message: 'Playlist created successfully',
            data: playlist
        };
    }, {
        body: createPlaylistSchema
    })

    // Get single playlist
    .get('/:id', async ({ params, userId, db }) => {
        const playlist = await db.getOne(
            'SELECT * FROM playlists WHERE id = $1 AND user_id = $2',
            [params.id, userId]
        );

        if (!playlist) {
            throw new Error('Playlist not found');
        }

        return {
            success: true,
            message: null,
            data: playlist
        };
    }, {
        params: idParamSchema
    })

    // Update playlist
    .put('/:id', async ({ params, body, userId, db }) => {
        // Verify ownership
        const existing = await db.getOne(
            'SELECT id FROM playlists WHERE id = $1 AND user_id = $2',
            [params.id, userId]
        );

        if (!existing) {
            throw new Error('Playlist not found');
        }

        const playlist = await db.update('playlists', params.id, body);

        return {
            success: true,
            message: 'Playlist updated successfully',
            data: playlist
        };
    }, {
        params: idParamSchema,
        body: updatePlaylistSchema
    })

    // Delete playlist
    .delete('/:id', async ({ params, userId, db }) => {
        // Verify ownership
        const existing = await db.getOne(
            'SELECT id FROM playlists WHERE id = $1 AND user_id = $2',
            [params.id, userId]
        );

        if (!existing) {
            throw new Error('Playlist not found');
        }

        // Soft delete
        await db.update('playlists', params.id, { is_active: false });

        return {
            success: true,
            message: 'Playlist deleted successfully',
            data: null
        };
    }, {
        params: idParamSchema
    });
