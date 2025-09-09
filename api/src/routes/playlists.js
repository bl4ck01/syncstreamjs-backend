import { Elysia } from 'elysia';
import { authPlugin } from '../plugins/auth.js';
import { databasePlugin } from '../plugins/database.js';
import { authMiddleware, userContextMiddleware, activeSubscriptionMiddleware } from '../middleware/auth.js';
import { createPlaylistSchema, updatePlaylistSchema, idParamSchema } from '../utils/schemas.js';
import env from '../utils/env.js';

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

        // Check if user can add more playlists
        const currentPlaylistCount = playlists.length;
        const maxPlaylists = env.MAX_PLAYLISTS;
        const canAddPlaylist = currentPlaylistCount < maxPlaylists;

        return {
            success: true,
            message: null,
            data: playlists,
            can_add_playlist: canAddPlaylist,
            playlist_count: currentPlaylistCount,
            max_playlists: maxPlaylists
        };
    })

    // Create new playlist - requires active subscription
    .use(userContextMiddleware)
    .use(activeSubscriptionMiddleware)
    .post('/', async ({ body, userId, user, db }) => {
        // Check playlist limit
        const currentPlaylists = await db.getMany(
            'SELECT id FROM playlists WHERE user_id = $1',
            [userId]
        );

        const currentPlaylistCount = currentPlaylists.length;
        const maxPlaylists = env.MAX_PLAYLISTS;

        if (currentPlaylistCount >= maxPlaylists) {
            return {
                success: false,
                message: `You have reached the maximum limit of ${maxPlaylists} playlists. Please delete a playlist before creating a new one.`,
                data: null
            };
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

        // Hard delete - actually remove the playlist from database
        await db.delete('playlists', params.id);

        return {
            success: true,
            message: 'Playlist deleted successfully',
            data: null
        };
    }, {
        params: idParamSchema
    });
