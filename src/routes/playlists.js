import { Elysia, t } from 'elysia';
import { authPlugin } from '../plugins/auth.js';
import { databasePlugin } from '../plugins/database.js';
import { createPlaylistSchema, updatePlaylistSchema } from '../utils/validation.js';

export const playlistRoutes = new Elysia({ prefix: '/playlists' })
    .use(authPlugin)
    .use(databasePlugin)
    .guard({
        beforeHandle: ({ requireAuth }) => requireAuth()
    })

    // Get all playlists for user
    .get('/', async ({ getUserId, db }) => {
        const userId = await getUserId();

        const playlists = await db.getMany(
            'SELECT id, name, url, username, is_active, created_at FROM playlists WHERE user_id = $1 ORDER BY created_at DESC',
            [userId]
        );

        return playlists;
    })

    // Create new playlist
    .post('/', async ({ body, getUserId, db }) => {
        const userId = await getUserId();

        // Validate request body
        const validatedData = createPlaylistSchema.parse(body);
        const { name, url, username, password } = validatedData;

        // Get user's plan limits
        const userPlan = await db.getOne(`
      SELECT 
        COALESCE(p.max_playlists, 1) as max_playlists
      FROM users u
      LEFT JOIN subscriptions s ON u.id = s.user_id AND s.status = 'active'
      LEFT JOIN plans p ON s.plan_id = p.id
      WHERE u.id = $1
    `, [userId]);

        const maxPlaylists = userPlan?.max_playlists || 1;

        // Check current playlist count
        const playlistCount = await db.getOne(
            'SELECT COUNT(*) as count FROM playlists WHERE user_id = $1',
            [userId]
        );

        if (maxPlaylists !== -1 && parseInt(playlistCount.count) >= maxPlaylists) {
            throw new Error(`Plan limit reached. Maximum playlists: ${maxPlaylists}`);
        }

        // Create playlist (password stored as plain text)
        const playlist = await db.insert('playlists', {
            user_id: userId,
            name,
            url,
            username,
            password,
            is_active: true
        });

        // Don't return encrypted password
        delete playlist.password;

        return playlist;
    }, {
        body: t.Object({
            name: t.String({ minLength: 1, maxLength: 255 }),
            url: t.String({ format: 'url' }),
            username: t.String({ minLength: 1 }),
            password: t.String({ minLength: 1 })
        }),
        transform({ body }) {
            return createPlaylistSchema.parse(body);
        }
    })

    // Get playlist details
    .get('/:id', async ({ params, getUserId, db }) => {
        const userId = await getUserId();
        const playlistId = params.id;

        const playlist = await db.getOne(
            'SELECT * FROM playlists WHERE id = $1 AND user_id = $2',
            [playlistId, userId]
        );

        if (!playlist) {
            throw new Error('Playlist not found');
        }

        // Password is already in plain text
        return playlist;
    }, {
        params: t.Object({
            id: t.String()
        })
    })

    // Update playlist
    .patch('/:id', async ({ params, body, getUserId, db }) => {
        const userId = await getUserId();
        const playlistId = params.id;

        // Validate request body
        const validatedData = updatePlaylistSchema.parse(body);

        // Verify ownership
        const exists = await db.getOne(
            'SELECT id FROM playlists WHERE id = $1 AND user_id = $2',
            [playlistId, userId]
        );

        if (!exists) {
            throw new Error('Playlist not found');
        }

        // Prepare update data
        const updateData = {};
        if (validatedData.name !== undefined) updateData.name = validatedData.name;
        if (validatedData.url !== undefined) updateData.url = validatedData.url;
        if (validatedData.username !== undefined) updateData.username = validatedData.username;
        if (validatedData.is_active !== undefined) updateData.is_active = validatedData.is_active;
        if (validatedData.password !== undefined) updateData.password = validatedData.password;

        const playlist = await db.update('playlists', playlistId, updateData);

        // Don't return encrypted password
        delete playlist.password;

        return playlist;
    }, {
        params: t.Object({
            id: t.String()
        }),
        body: t.Object({
            name: t.Optional(t.String({ minLength: 1, maxLength: 255 })),
            url: t.Optional(t.String({ format: 'url' })),
            username: t.Optional(t.String({ minLength: 1 })),
            password: t.Optional(t.String({ minLength: 1 })),
            is_active: t.Optional(t.Boolean())
        }),
        transform({ body }) {
            return updatePlaylistSchema.parse(body);
        }
    })

    // Delete playlist
    .delete('/:id', async ({ params, getUserId, db }) => {
        const userId = await getUserId();
        const playlistId = params.id;

        const result = await db.query(
            'DELETE FROM playlists WHERE id = $1 AND user_id = $2 RETURNING id',
            [playlistId, userId]
        );

        if (result.rowCount === 0) {
            throw new Error('Playlist not found');
        }

        return { message: 'Playlist deleted successfully' };
    }, {
        params: t.Object({
            id: t.String()
        })
    });
