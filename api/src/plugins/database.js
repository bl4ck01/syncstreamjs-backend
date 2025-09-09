import { Elysia } from 'elysia';
import pool from '../db/connection.js';
import { handleDatabaseError } from '../utils/errors.js';

export const databasePlugin = new Elysia({ name: 'database' })
    .decorate('db', {
        query: async (text, params) => {
            try {
                return await pool.query(text, params);
            } catch (error) {
                handleDatabaseError(error);
            }
        },

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
                handleDatabaseError(error);
            } finally {
                client.release();
            }
        },

        // Get one record
        getOne: async (text, params) => {
            try {
                const result = await pool.query(text, params);
                return result.rows[0] || null;
            } catch (error) {
                handleDatabaseError(error);
            }
        },

        // Get many records
        getMany: async (text, params) => {
            try {
                const result = await pool.query(text, params);
                return result.rows;
            } catch (error) {
                handleDatabaseError(error);
            }
        },

        // Insert and return record
        insert: async (table, data) => {
            try {
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
            } catch (error) {
                handleDatabaseError(error);
            }
        },

        // Update and return record
        update: async (table, data, where = {}) => {
            try {
                // Handle both old signature (table, id, data) and new signature (table, data, where)
                if (typeof data === 'string' || typeof data === 'number') {
                    // Old signature: update(table, id, data)
                    const id = data;
                    const actualData = where;
                    const keys = Object.keys(actualData);
                    const values = Object.values(actualData);
                    const setClause = keys.map((key, i) => `${key} = $${i + 2}`).join(', ');

                    const query = `
                UPDATE ${table}
                SET ${setClause}, updated_at = CURRENT_TIMESTAMP
                WHERE id = $1
                RETURNING *
              `;

                    const result = await pool.query(query, [id, ...values]);
                    return result.rows[0];
                } else {
                    // New signature: update(table, data, where)
                    const keys = Object.keys(data);
                    const values = Object.values(data);
                    const whereKeys = Object.keys(where);
                    const whereValues = Object.values(where);

                    const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(', ');
                    const whereClause = whereKeys.map((key, i) => `${key} = $${keys.length + i + 1}`).join(' AND ');

                    const query = `
                UPDATE ${table}
                SET ${setClause}
                WHERE ${whereClause}
                RETURNING *
              `;

                    const result = await pool.query(query, [...values, ...whereValues]);
                    return result.rows[0];
                }
            } catch (error) {
                handleDatabaseError(error);
            }
        },

        // Delete record
        delete: async (table, id) => {
            try {
                const query = `DELETE FROM ${table} WHERE id = $1 RETURNING *`;
                const result = await pool.query(query, [id]);
                return result.rows[0] || null;
            } catch (error) {
                handleDatabaseError(error);
            }
        }
    });
