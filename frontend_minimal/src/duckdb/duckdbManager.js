import * as duckdb from '@duckdb/duckdb-wasm';

let db = null;
let conn = null;
let isInitialized = false;
let isInitializing = false;

// In-memory fallback storage
let inMemoryStreams = [];

export function getInMemoryStreams() {
  return inMemoryStreams;
}

export function setInMemoryStreams(streams) {
  inMemoryStreams = streams;
}

export function addInMemoryStreams(streams) {
  if (!Array.isArray(streams)) return;
  inMemoryStreams.push(...streams);
}

export function clearInMemoryStreams() {
  inMemoryStreams = [];
}

// Initialize DuckDB asynchronously
export async function initializeDuckDB() {
  if (isInitialized) return true;
  if (isInitializing) {
    // Wait until initialization completes
    while (isInitializing && !isInitialized) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    return isInitialized;
  }

  isInitializing = true;

  try {
    // Quick checks for basic requirements
    if (typeof WebAssembly === 'undefined') {
      throw new Error('WebAssembly is not supported in this browser');
    }

    if (typeof duckdb === 'undefined') {
      throw new Error('DuckDB is not available');
    }

    if (typeof Worker === 'undefined') {
      throw new Error('Web Workers are not supported in this browser');
    }

    // Use the proper CDN approach from the documentation
    const JSDELIVR_BUNDLES = duckdb.getJsDelivrBundles();
    
    // Select a bundle based on browser checks
    const bundle = await duckdb.selectBundle(JSDELIVR_BUNDLES);
    
    if (!bundle || !bundle.mainModule || !bundle.mainWorker) {
      throw new Error('Invalid CDN bundle configuration');
    }

    // Create worker using Blob approach from documentation
    const worker_url = URL.createObjectURL(
      new Blob([`importScripts("${bundle.mainWorker}");`], {type: 'text/javascript'})
    );

    const logger = new duckdb.ConsoleLogger();
    const worker = new Worker(worker_url);

    try {
      db = new duckdb.AsyncDuckDB(logger, worker);
    } catch (dbError) {
      console.warn('Failed to create AsyncDuckDB:', dbError);
      worker.terminate();
      URL.revokeObjectURL(worker_url);
      throw new Error('Failed to initialize DuckDB instance');
    }
    
    try {
      // Use instantiate with both modules
      await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
    } catch (instantiateError) {
      console.warn('DuckDB instantiation failed:', instantiateError);
      // Clean up worker and db
      worker.terminate();
      URL.revokeObjectURL(worker_url);
      db = null;
      throw new Error('Failed to instantiate DuckDB WASM module');
    }
    
    // Clean up the object URL after successful instantiation
    URL.revokeObjectURL(worker_url);
    
    conn = await db.connect();
    isInitialized = true;

    // Load schema with fallback
    try {
      const schema = await fetch('/duckdb/schema.sql').then(r => r.text());
      await conn.query(schema);
    } catch (schemaError) {
      console.warn('Schema loading failed, creating table manually:', schemaError);
      await conn.query(`
        CREATE TABLE IF NOT EXISTS streams (
          id INTEGER PRIMARY KEY,
          stream_id INTEGER NOT NULL,
          name TEXT NOT NULL,
          type TEXT NOT NULL,
          category_id TEXT NOT NULL,
          category_name TEXT NOT NULL,
          stream_icon TEXT,
          cover TEXT,
          plot TEXT,
          genre TEXT,
          releaseDate TEXT,
          rating TEXT,
          added TEXT,
          num INTEGER
        )
      `);
    }

    console.log('✅ DuckDB initialized successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize DuckDB:', error);
    // Reset for retry
    db = null;
    conn = null;
    isInitialized = false;
    isInitializing = false;
    return false;
  } finally {
    isInitializing = false;
  }
}

// Check if DuckDB is ready
export async function isDuckDBAvailable() {
  if (!isInitialized && !isInitializing) {
    return false;
  }
  if (isInitializing) {
    await initializeDuckDB(); // Will wait if already initializing
  }
  return isInitialized;
}

// Get current connection (ensure initialized)
export async function getDuckDB() {
  if (!isInitialized) {
    const success = await initializeDuckDB();
    if (!success) throw new Error('DuckDB failed to initialize');
  }
  if (!conn) {
    conn = await db.connect();
  }
  return { db, conn };
}

// Quick availability check (sync) — useful for early skip
export function quickDuckDBCheck() {
  // Check for WebAssembly support
  if (typeof WebAssembly === 'undefined') return false;
  // Check for Worker support
  if (typeof Worker === 'undefined') return false;
  // Check for duckdb and bundle functions
  if (typeof duckdb === 'undefined') return false;
  if (typeof duckdb.getJsDelivrBundles === 'undefined') return false;
  return true;
}

// Cleanup (optional)
export async function closeDuckDB() {
  if (conn) {
    await conn.close();
    conn = null;
  }
  if (db) {
    await db.terminate();
    db = null;
  }
  isInitialized = false;
}