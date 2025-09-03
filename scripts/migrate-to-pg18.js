#!/usr/bin/env bun

/**
 * PostgreSQL 18 Migration Helper Script
 * 
 * This script helps with migrating to PostgreSQL 18 by:
 * 1. Checking current PostgreSQL version
 * 2. Validating compatibility
 * 3. Generating migration recommendations
 * 4. Creating performance benchmarks
 */

import pg from 'pg';
import env from '../src/utils/env.js';

const { Pool } = pg;

// Create connection pool
const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 1,
  ssl: env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  bold: '\x1b[1m'
};

// Helper functions
const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset}  ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset}  ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset}  ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset}  ${msg}`),
  header: (msg) => console.log(`\n${colors.bold}${msg}${colors.reset}\n${'='.repeat(msg.length)}`)
};

async function checkCurrentVersion() {
  log.header('Current PostgreSQL Version');
  
  try {
    const result = await pool.query('SELECT version()');
    const version = result.rows[0].version;
    const versionMatch = version.match(/PostgreSQL (\d+\.?\d*)/);
    
    if (versionMatch) {
      const versionNumber = parseFloat(versionMatch[1]);
      log.info(`Current version: PostgreSQL ${versionNumber}`);
      
      if (versionNumber >= 18) {
        log.success('Already running PostgreSQL 18 or later!');
        return { version: versionNumber, isV18: true };
      } else {
        log.warning(`Running PostgreSQL ${versionNumber}, upgrade to 18 recommended`);
        return { version: versionNumber, isV18: false };
      }
    }
  } catch (error) {
    log.error(`Failed to check version: ${error.message}`);
    return { version: null, isV18: false };
  }
}

async function checkCurrentSettings() {
  log.header('Current Database Settings');
  
  const settings = [
    'shared_buffers',
    'effective_cache_size',
    'work_mem',
    'maintenance_work_mem',
    'max_connections',
    'checkpoint_completion_target',
    'wal_buffers',
    'random_page_cost'
  ];
  
  for (const setting of settings) {
    try {
      const result = await pool.query('SHOW ' + setting);
      log.info(`${setting}: ${result.rows[0][setting]}`);
    } catch (error) {
      log.warning(`Could not retrieve ${setting}`);
    }
  }
}

async function analyzeQueryPerformance() {
  log.header('Query Performance Analysis');
  
  // Test queries that would benefit from PostgreSQL 18
  const testQueries = [
    {
      name: 'Complex Analytics Query',
      query: `
        SELECT 
          DATE_TRUNC('month', s.current_period_start) as period,
          COUNT(DISTINCT s.user_id) as subscribers,
          SUM(p.price_monthly) as revenue
        FROM subscriptions s
        JOIN plans p ON s.plan_id = p.id
        WHERE s.status = 'active' 
          AND s.created_at >= NOW() - INTERVAL '6 months'
        GROUP BY period
        ORDER BY period
      `
    },
    {
      name: 'Multi-column Index Query (Skip Scan candidate)',
      query: `
        SELECT * FROM subscriptions 
        WHERE status = 'active' 
          AND current_period_end > NOW()
        LIMIT 100
      `
    },
    {
      name: 'User Authentication Query',
      query: `
        SELECT u.*, s.status as subscription_status
        FROM users u
        LEFT JOIN subscriptions s ON u.id = s.user_id 
          AND s.status IN ('active', 'trialing')
        WHERE u.email = 'test@example.com'
      `
    }
  ];
  
  for (const test of testQueries) {
    try {
      const startTime = Date.now();
      const explainResult = await pool.query(`EXPLAIN (ANALYZE, BUFFERS) ${test.query}`);
      const duration = Date.now() - startTime;
      
      log.info(`${test.name}: ${duration}ms`);
      
      // Extract key metrics from EXPLAIN
      const planText = explainResult.rows.map(r => r['QUERY PLAN']).join('\n');
      const executionTime = planText.match(/Execution Time: ([\d.]+) ms/);
      const bufferHits = planText.match(/shared hit=(\d+)/);
      
      if (executionTime) {
        log.info(`  Execution Time: ${executionTime[1]}ms`);
      }
      if (bufferHits) {
        log.info(`  Buffer Hits: ${bufferHits[1]}`);
      }
      
      // Identify optimization opportunities
      if (planText.includes('Seq Scan') && !planText.includes('Index')) {
        log.warning('  ⚠️  Sequential scan detected - would benefit from PostgreSQL 18 AIO');
      }
      if (planText.includes('Hash Join')) {
        log.info('  ℹ️  Hash join detected - would benefit from PostgreSQL 18 optimizations');
      }
    } catch (error) {
      log.warning(`Could not analyze ${test.name}: ${error.message}`);
    }
  }
}

async function generateRecommendations(currentVersion) {
  log.header('PostgreSQL 18 Migration Recommendations');
  
  if (currentVersion.isV18) {
    log.success('Already on PostgreSQL 18! Here are optimization recommendations:');
    
    console.log(`
${colors.bold}1. Enable Asynchronous I/O:${colors.reset}
   ALTER SYSTEM SET io_method = 'worker';
   -- Or 'io_uring' on Linux with kernel 5.1+
   ALTER SYSTEM SET io_workers = 4;

${colors.bold}2. Optimize for your workload:${colors.reset}
   -- For 16GB RAM server
   ALTER SYSTEM SET shared_buffers = '4GB';
   ALTER SYSTEM SET effective_cache_size = '12GB';
   ALTER SYSTEM SET work_mem = '64MB';

${colors.bold}3. Monitor new features:${colors.reset}
   -- Check AIO performance
   SELECT * FROM pg_aios;
   
   -- Monitor I/O statistics
   SELECT * FROM pg_stat_io;
`);
  } else {
    log.warning(`Current version: PostgreSQL ${currentVersion.version}`);
    log.info('Migration path to PostgreSQL 18:');
    
    console.log(`
${colors.bold}1. Pre-migration steps:${colors.reset}
   - Backup your database
   - Test application with PostgreSQL 18 in staging
   - Review deprecated features (MD5 auth)

${colors.bold}2. Migration command:${colors.reset}
   pg_upgrade \\
     --old-datadir=/var/lib/postgresql/${currentVersion.version}/main \\
     --new-datadir=/var/lib/postgresql/18/main \\
     --old-bindir=/usr/lib/postgresql/${currentVersion.version}/bin \\
     --new-bindir=/usr/lib/postgresql/18/bin \\
     --jobs=4

${colors.bold}3. Post-migration:${colors.reset}
   - No need for ANALYZE (statistics preserved)
   - Enable AIO: ALTER SYSTEM SET io_method = 'worker';
   - Update connection string if needed
`);
  }
}

async function checkIndexOptimizations() {
  log.header('Index Optimization Opportunities');
  
  // Find multi-column indexes that could benefit from skip scan
  const multiColumnIndexes = await pool.query(`
    SELECT 
      schemaname,
      tablename,
      indexname,
      indexdef
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexdef LIKE '%,%'
    ORDER BY tablename, indexname
  `);
  
  if (multiColumnIndexes.rows.length > 0) {
    log.info(`Found ${multiColumnIndexes.rows.length} multi-column indexes that could benefit from skip scan:`);
    
    multiColumnIndexes.rows.forEach(idx => {
      console.log(`  - ${idx.indexname} on ${idx.tablename}`);
    });
  }
  
  // Check for UUID columns that could benefit from UUIDv7
  const uuidColumns = await pool.query(`
    SELECT 
      table_name,
      column_name,
      column_default
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND data_type = 'uuid'
      AND column_default LIKE '%gen_random_uuid%'
    ORDER BY table_name, column_name
  `);
  
  if (uuidColumns.rows.length > 0) {
    log.info(`\nFound ${uuidColumns.rows.length} UUID columns that could use UUIDv7:`);
    
    uuidColumns.rows.forEach(col => {
      console.log(`  - ${col.table_name}.${col.column_name}`);
    });
    
    log.info('\nTo migrate to UUIDv7 (after upgrading to PostgreSQL 18):');
    console.log(`  ALTER TABLE <table> ALTER COLUMN <column> SET DEFAULT uuidv7();`);
  }
}

async function generateMigrationChecklist() {
  log.header('Migration Checklist');
  
  console.log(`
${colors.bold}Pre-Migration Checklist:${colors.reset}
[ ] Full database backup completed
[ ] Application tested with PostgreSQL 18 in staging
[ ] Downtime window scheduled
[ ] Rollback plan documented
[ ] Team notified of migration

${colors.bold}Migration Steps:${colors.reset}
[ ] Stop application servers
[ ] Perform final backup
[ ] Run pg_upgrade with --check first
[ ] Execute pg_upgrade
[ ] Start PostgreSQL 18
[ ] Verify connectivity
[ ] Enable AIO settings
[ ] Start application servers
[ ] Monitor performance metrics

${colors.bold}Post-Migration Verification:${colors.reset}
[ ] All queries executing correctly
[ ] Performance metrics improved
[ ] No errors in logs
[ ] Monitoring alerts configured
[ ] Documentation updated
`);
}

// Main execution
async function main() {
  console.log(`${colors.bold}PostgreSQL 18 Migration Analysis${colors.reset}`);
  console.log('================================\n');
  
  try {
    // Check current version
    const versionInfo = await checkCurrentVersion();
    
    // Analyze current settings
    await checkCurrentSettings();
    
    // Analyze query performance
    await analyzeQueryPerformance();
    
    // Check for optimization opportunities
    await checkIndexOptimizations();
    
    // Generate recommendations
    await generateRecommendations(versionInfo);
    
    // Generate checklist
    await generateMigrationChecklist();
    
    log.success('\nAnalysis complete! Review the recommendations above.');
    
  } catch (error) {
    log.error(`Analysis failed: ${error.message}`);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

// Run the script
main();