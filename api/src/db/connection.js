import pg from 'pg';
import env from '../utils/env.js';
import { DatabaseError, handleDatabaseError } from '../utils/errors.js';

const { Pool } = pg;

// Create connection pool with optimized settings
const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: env.DATABASE_MAX_CONNECTIONS,
  idleTimeoutMillis: env.DATABASE_IDLE_TIMEOUT,
  connectionTimeoutMillis: env.DATABASE_CONNECTION_TIMEOUT,
  ssl: env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,

  // Query timeout
  statement_timeout: env.QUERY_TIMEOUT,
  query_timeout: env.QUERY_TIMEOUT,

  // Connection retry
  allowExitOnIdle: false
});

// Connection event handlers
pool.on('connect', (client) => {
  console.log('✅ Database client connected');

  // Set default schema and timezone for each connection
  client.query('SET search_path TO public');
  client.query("SET timezone = 'UTC'");
});

pool.on('error', (err, client) => {
  console.error('❌ Unexpected database error on idle client', err);
  // Don't exit the process, let the pool handle reconnection
});

pool.on('remove', () => {
  console.log('Database client removed from pool');
});

// Test connection with retry logic
const testConnection = async (retries = 3, delay = 1000) => {
  for (let i = 0; i < retries; i++) {
    try {
      const client = await pool.connect();
      const result = await client.query('SELECT NOW() as current_time, version() as pg_version');
      console.log('✅ Database connected successfully');
      console.log(`   PostgreSQL ${result.rows[0].pg_version.split(' ')[1]}`);
      console.log(`   Server time: ${result.rows[0].current_time}`);
      client.release();
      return true;
    } catch (error) {
      console.error(`❌ Database connection attempt ${i + 1} failed:`, error.message);

      if (i < retries - 1) {
        console.log(`   Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
      } else {
        throw new DatabaseError('Failed to connect to database after multiple attempts', error);
      }
    }
  }
};

// Initialize connection
testConnection().catch(error => {
  console.error('❌ Critical: Could not establish database connection');
  if (env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

// Prepared statements cache
const preparedStatements = new Map();

// Enhanced query function with prepared statements
export const query = async (text, params = [], options = {}) => {
  const {
    usePrepared = false,
    name = null,
    rowMode = 'object'
  } = options;

  try {
    const start = Date.now();

    let queryConfig = {
      text,
      values: params,
      rowMode: rowMode === 'array' ? 'array' : undefined
    };

    // Use prepared statement if requested
    if (usePrepared && name) {
      queryConfig.name = name;

      // Cache the prepared statement
      if (!preparedStatements.has(name)) {
        preparedStatements.set(name, text);
      }
    }

    const result = await pool.query(queryConfig);

    const duration = Date.now() - start;

    // Log slow queries in development
    if (env.NODE_ENV === 'development' && duration > 1000) {
      console.warn(`⚠️  Slow query (${duration}ms):`, text.substring(0, 100));
    }

    return result;
  } catch (error) {
    handleDatabaseError(error);
  }
};

// Transaction helper with automatic rollback
export const transaction = async (callback) => {
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
};

// Batch insert helper for better performance
export const batchInsert = async (table, columns, values, options = {}) => {
  const {
    chunkSize = 1000,
    onConflict = null,
    returning = '*'
  } = options;

  if (values.length === 0) return [];

  const results = [];

  for (let i = 0; i < values.length; i += chunkSize) {
    const chunk = values.slice(i, i + chunkSize);

    // Build the query
    const placeholders = chunk.map((_, rowIndex) =>
      `(${columns.map((_, colIndex) =>
        `$${rowIndex * columns.length + colIndex + 1}`
      ).join(', ')})`
    ).join(', ');

    let query = `
      INSERT INTO ${table} (${columns.join(', ')})
      VALUES ${placeholders}
    `;

    if (onConflict) {
      query += ` ON CONFLICT ${onConflict}`;
    }

    if (returning) {
      query += ` RETURNING ${returning}`;
    }

    // Flatten the values array
    const flatValues = chunk.flat();

    const result = await pool.query(query, flatValues);
    results.push(...result.rows);
  }

  return results;
};

// Connection pool statistics
export const getPoolStats = () => {
  return {
    total: pool.totalCount,
    idle: pool.idleCount,
    waiting: pool.waitingCount
  };
};

// Graceful shutdown
export const closePool = async () => {
  console.log('Closing database connection pool...');
  await pool.end();
  console.log('Database connection pool closed');
};

// Handle process termination
process.on('SIGTERM', async () => {
  await closePool();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await closePool();
  process.exit(0);
});

export default pool;
