// Global state management for IPTV data import
import { useMemo } from 'react';

class IPTVImportManager {
  constructor() {
    this.importPromise = null;
    this.isImporting = false;
    this.importStartTime = null;
    this.globalImportLock = false;
    this.importInitiator = null;
    
    // Hardcoded credentials
    this.DEFAULT_BASE_URL = 'http://line.ottcst.com';
    this.DEFAULT_USERNAME = 'AmroussO';
    this.DEFAULT_PASSWORD = 'IIFNYI3LTQ';
    
    // No caching - always fetch fresh data when needed

    // Debug logging - in production, this would use a proper logging service
    if (process.env.NODE_ENV === 'development') {
      console.debug('🏗️ IPTVImportManager instance created');
    }
  }

  // Get credentials with fallback to hardcoded defaults
  getCredentials() {
    const baseUrl = localStorage.getItem('iptv_base_url') || this.DEFAULT_BASE_URL;
    const username = localStorage.getItem('iptv_username') || this.DEFAULT_USERNAME;
    const password = localStorage.getItem('iptv_password') || this.DEFAULT_PASSWORD;
    
    return { baseUrl, username, password };
  }

  // Validate stored credentials
  validateCredentials(baseUrl, username, password) {
    if (!baseUrl || !username || !password) {
      throw new Error('Missing IPTV credentials. Please configure in settings.');
    }
    
    // Basic URL validation
    try {
      new URL(baseUrl);
    } catch (e) {
      throw new Error('Invalid base URL format');
    }
    
    return true;
  }

  // Check if we need to import data - only check if we have data, no cache validation
  async shouldImport() {
    try {
      const { db } = await import('@/lib/storage/db.js');
      const categoryCount = await db.categories.count();
      const streamCount = await db.streams.count();
      
      const hasData = categoryCount > 0 && streamCount > 0;
      
      console.log('📊 Database check:', {
        categoryCount,
        streamCount,
        hasData,
        shouldImport: !hasData
      });
      
      return !hasData; // Only import if we don't have any data
    } catch (error) {
      console.error('Error checking import status:', error);
      return true; // Default to import if we can't check
    }
  }

  // Start or join existing import
  async startImport(onProgress) {
    const now = Date.now();
    const caller = new Error().stack.split('\n')[2].trim();
    
    if (process.env.NODE_ENV === 'development') {
      console.debug('🔍 startImport called:', {
        isImporting: this.isImporting,
        hasImportPromise: !!this.importPromise,
        globalLock: this.globalImportLock,
        initiator: this.importInitiator,
        caller: caller
      });
    }

    // If already importing, return the existing promise
    if (this.importPromise) {
      if (process.env.NODE_ENV === 'development') {
        console.debug('🔄 Import already in progress, joining existing import');
      }
      return this.importPromise;
    }

    // Set global lock to prevent any other imports
    if (this.globalImportLock) {
      if (process.env.NODE_ENV === 'development') {
        console.debug(`🔒 Global import lock active, initiated by: ${this.importInitiator}`);
      }
      // Wait for the global lock to be released
      while (this.globalImportLock) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Set the global lock
    this.globalImportLock = true;
    this.importInitiator = caller;

    try {
      // Check if we need to import
      const needsImport = await this.shouldImport();
      
      if (process.env.NODE_ENV === 'development') {
        console.debug('📋 Should import:', needsImport);
      }
      
      // If no import needed, resolve immediately
      if (!needsImport) {
        if (process.env.NODE_ENV === 'development') {
          console.debug('✅ No import needed, using existing data');
        }
        return Promise.resolve({ categories: 0, streams: 0, skipped: true });
      }

      if (process.env.NODE_ENV === 'development') {
        console.debug('🚀 Starting new import process');
      }
      
      this.isImporting = true;
      this.importStartTime = now;

      this.importPromise = this.performImport(onProgress)
        .then(result => {
          this.isImporting = false;
          this.importPromise = null;
          const duration = Date.now() - this.importStartTime;
          
          if (process.env.NODE_ENV === 'development') {
            console.debug(`✅ Import process completed in ${duration}ms`);
          }
          
          return result;
        })
        .catch(error => {
          console.error('❌ Import failed:', error);
          this.isImporting = false;
          this.importPromise = null;
          throw error;
        })
        .finally(() => {
          // Release the global lock
          this.globalImportLock = false;
          this.importInitiator = null;
        });

      return this.importPromise;
    } catch (error) {
      // Release the global lock on error
      this.globalImportLock = false;
      this.importInitiator = null;
      throw error;
    }
  }

  // Actual import implementation
  async performImport(onProgress) {
    try {
      const { fetchPlaylistFromProxy } = await import('@/lib/proxy.js');
      const { importFromProxyResponse } = await import('@/lib/storage/importer.js');

      const { baseUrl, username, password } = this.getCredentials();
      
      // Validate credentials
      this.validateCredentials(baseUrl, username, password);

      if (onProgress) onProgress('Connecting to your IPTV provider...', 5);

      if (process.env.NODE_ENV === 'development') {
        console.debug('🌐 Fetching data from your IPTV provider with AbortController...');
      }
      
      const response = await fetchPlaylistFromProxy(baseUrl, username, password, { timeout: 60000 });
      const text = await response.text();
      
      if (process.env.NODE_ENV === 'development') {
        console.debug(`📄 Received ${text.length} characters of data`);
      }

      if (onProgress) onProgress('Importing categories and streams...', 10);

      const result = await importFromProxyResponse(text, (msg, pct) => {
        if (process.env.NODE_ENV === 'development') {
          console.debug(`📊 Import progress: ${msg} (${pct}%)`);
        }
        if (onProgress) onProgress(msg, pct);
      });

      if (onProgress) onProgress('Import completed!', 100);

      return result;
    } catch (error) {
      console.error('❌ Import failed:', error);
      
      // Provide more helpful error messages
      if (error.message.includes('timeout')) {
        throw new Error('The server is taking too long to respond. This might be due to a large content or slow network. Please try again.');
      } else if (error.message.includes('fetch') || error.message.includes('network')) {
        throw new Error('Unable to connect to your IPTV provider. Please check your internet connection and credentials.');
      } else {
        throw new Error(`Import failed: ${error.message}`);
      }
    }
  }

  // Get current import status
  getStatus() {
    return {
      isImporting: this.isImporting,
      hasActiveImport: !!this.importPromise,
      duration: this.importStartTime ? Date.now() - this.importStartTime : 0,
    };
  }

  // Force refresh - trigger fresh import
  async forceRefresh(onProgress) {
    // Clear any existing data to force fresh import
    const { db } = await import('@/lib/storage/db.js');
    await db.categories.clear();
    await db.streams.clear();
    
    if (process.env.NODE_ENV === 'development') {
      console.debug('🗑️ Database cleared, forcing fresh import');
    }
    
    // Start fresh import
    return this.startImport(onProgress);
  }
}

// Global singleton implementation - use globalThis to ensure true singleton across module reloads
let globalInstance = globalThis[Symbol.for('iptvImportManager')];

if (!globalInstance) {
  globalInstance = new IPTVImportManager();
  globalThis[Symbol.for('iptvImportManager')] = globalInstance;
  
  if (process.env.NODE_ENV === 'development') {
    console.debug('🌍 Created global IPTVImportManager singleton');
  }
} else if (process.env.NODE_ENV === 'development') {
  console.debug('♻️ Reusing existing IPTVImportManager singleton');
}

// Export both the singleton instance and the getter function for compatibility
export const iptvImportManager = globalInstance;

export const getIPTVImportManager = () => globalInstance;

// Hook for React components to use the import manager
export const useIPTVImport = () => {
  const manager = getIPTVImportManager();
  
  // Memoize the returned object to prevent unnecessary re-renders
  return useMemo(() => ({
    startImport: (onProgress) => manager.startImport(onProgress),
    forceRefresh: (onProgress) => manager.forceRefresh(onProgress),
    getStatus: () => manager.getStatus(),
  }), [manager]);
};