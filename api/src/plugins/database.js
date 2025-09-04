import { Elysia } from 'elysia';
import pool from '../db/connection.js';

export const databasePlugin = new Elysia({ name: 'database' })
    .decorate('db', {
        query: (text, params) => pool.query(text, params),

        // Transaction helper
        transaction: async (callback) => {
            const client = await pool.connect();

            try {
                await client.query('BEGIN');
                const result = await callback(client);
                await client.query('COMMIT');
                return result;
            } catch (error) {
                await client.query('ROLLBACK');
                throw error;
            } finally {
                client.release();
            }
        },

        // Get one record
        getOne: async (text, params) => {
            const result = await pool.query(text, params);
            return result.rows[0] || null;
        },

        // Get many records
        getMany: async (text, params) => {
            const result = await pool.query(text, params);
            return result.rows;
        },

        // Insert and return record
        insert: async (table, data) => {
            const keys = Object.keys(data);
            const values = Object.values(data);
            const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');

            const query = `
        INSERT INTO ${table} (${keys.join(', ')})
        VALUES (${placeholders})
        RETURNING *
      `;

            const result = await pool.query(query, values);
            return result.rows[0];
        },

        // Update and return record
        update: async (table, id, data) => {
            const keys = Object.keys(data);
            const values = Object.values(data);
            const setClause = keys.map((key, i) => `${key} = $${i + 2}`).join(', ');

            const query = `
        UPDATE ${table}
        SET ${setClause}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
      `;

            const result = await pool.query(query, [id, ...values]);
            return result.rows[0];
        }
    });
