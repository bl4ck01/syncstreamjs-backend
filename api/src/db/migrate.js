import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pool from './connection.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function migrate() {
    try {
        console.log('Running database migrations...');

        const schemaSQL = readFileSync(join(__dirname, 'schema.sql'), 'utf8');

        await pool.query(schemaSQL);

        console.log('Database migrations completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrate();
