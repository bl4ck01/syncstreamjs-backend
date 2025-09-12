import * as duckdb from '@duckdb/duckdb-wasm';

let dbInstance = null;

export async function getDatabase() {
  if (!dbInstance) {
    console.log('🚀 Initializing DuckDB WASM...');
    
    const bundles = duckdb.getJsDelivrBundles();
    const bundle = await duckdb.selectBundle(bundles);
    
    const worker = new Worker(bundle.mainWorker);
    const logger = new duckdb.ConsoleLogger();
    dbInstance = new duckdb.AsyncDuckDB(logger, worker);
    
    await dbInstance.instantiate(bundle.mainModule, bundle.pthreadWorker);
    console.log('✅ DuckDB WASM initialized');
  }
  return dbInstance;
}

export async function getConnection() {
  const db = await getDatabase();
  return await db.connect();
}