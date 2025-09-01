import { Elysia } from 'elysia';
import { databasePlugin } from '../plugins/database.js';

export const healthRoutes = new Elysia()
    .use(databasePlugin)

    // Basic health check
    .get('/health', () => {
        return {
            status: 'ok',
            timestamp: new Date().toISOString()
        };
    })

    // Database health check
    .get('/health/db', async ({ db }) => {
        try {
            const result = await db.query('SELECT NOW() as timestamp');
            return {
                status: 'ok',
                database: 'connected',
                timestamp: result.rows[0].timestamp
            };
        } catch (error) {
            throw new Error('Database connection failed');
        }
    });
