// Configuration and utilities for DuckDB
export const DUCKDB_CONFIG = {
  enabled: true, // Can be set to false to completely disable DuckDB
  fallbackToMemory: true,
  skipInitOnErrors: true,
  useCDNBundles: true, // Use CDN bundles instead of local files
  bundleSource: 'cdn' // 'cdn' or 'local'
};

// Check if current environment supports DuckDB
export function checkDuckDBSupport() {
  try {
    // Basic requirements check
    if (typeof WebAssembly === 'undefined') {
      console.warn('WebAssembly is not supported in this browser');
      return false;
    }

    if (typeof Worker === 'undefined') {
      console.warn('Web Workers are not supported in this browser');
      return false;
    }

    // Check if DuckDB module is available
    if (typeof duckdb === 'undefined') {
      console.warn('DuckDB module is not available');
      return false;
    }

    // Check if CDN bundle functions are available
    if (DUCKDB_CONFIG.useCDNBundles) {
      if (typeof duckdb.getJsDelivrBundles === 'undefined' || typeof duckdb.getJsDelivrWorker === 'undefined') {
        console.warn('CDN bundle functions not available');
        return false;
      }
    }

    // Check if we're in a supported environment
    const isSupportedBrowser = /Chrome|Firefox|Safari|Edge/.test(navigator.userAgent);
    if (!isSupportedBrowser) {
      console.warn('Browser may not fully support WebAssembly features');
    }

    return true;
  } catch (error) {
    console.warn('Error checking DuckDB support:', error);
    return false;
  }
}

// Get environment-specific configuration
export function getDuckDBEnvironmentConfig() {
  // Force disable DuckDB in certain environments
  if (typeof window !== 'undefined') {
    // Check for mobile browsers that might have limited WebAssembly support
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // Check for older browsers
    const isOldBrowser = !/Chrome\/[90+]|Firefox\/[90+]|Safari\/[14+]|Edge\/[90+]/.test(navigator.userAgent);
    
    if (isMobile && isOldBrowser) {
      console.warn('DuckDB disabled for mobile/older browser compatibility');
      return { ...DUCKDB_CONFIG, enabled: false };
    }
  }

  return DUCKDB_CONFIG;
}

// Get DuckDB bundle configuration
export function getDuckDBBundleConfig() {
  const config = getDuckDBEnvironmentConfig();
  
  if (!config.useCDNBundles) {
    return {
      logger: new duckdb.VoidLogger(),
      workerSource: 'local',
      bundleSource: 'local'
    };
  }
  
  return {
    bundleSource: duckdb.getJsDelivrBundles(),
    useBlobWorker: true,
    logger: new duckdb.ConsoleLogger()
  };
}