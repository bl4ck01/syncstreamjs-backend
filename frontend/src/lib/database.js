import localforage from 'localforage';
import * as duckdb from '@duckdb/duckdb-wasm';

class DatabaseManager {
  constructor() {
    console.log('[DatabaseManager] 🔧 Constructor called');
    this.db = null;
    this.initialized = false;
    this.initializing = false;
    this.initPromise = null;
  }

  async initialize() {
    console.log('[DatabaseManager] 🚀 initialize() called');
    if (this.initialized) {
      console.log('[DatabaseManager] ✅ Already initialized, returning existing db');
      return this.db;
    }
    if (this.initializing) {
      console.log('[DatabaseManager] ⏳ Already initializing, returning existing promise');
      return this.initPromise;
    }

    console.log('[DatabaseManager] 🔥 Starting initialization...');
    this.initializing = true;
    this.initPromise = this._initializeInternal();
    
    try {
      await this.initPromise;
      this.initialized = true;
      console.log('[DatabaseManager] ✅ Initialization completed successfully');
      return this.db;
    } catch (error) {
      console.error('[DatabaseManager] ❌ Initialization failed:', error);
      this.initializing = false;
      this.initPromise = null;
      throw error;
    }
  }

  async _initializeInternal() {
    try {
      console.log('[DatabaseManager] 🔧 Starting internal initialization...');
      
      // Initialize LocalForage with optimal settings
      console.log('[DatabaseManager] 📦 Setting up LocalForage...');
      await this._setupLocalForage();
      console.log('[DatabaseManager] ✅ LocalForage setup completed');
      
      // Initialize DuckDB-WASM
      console.log('[DatabaseManager] 🦆 Setting up DuckDB-WASM...');
      await this._setupDuckDB();
      console.log('[DatabaseManager] ✅ DuckDB-WASM setup completed');
      
      console.log('[DatabaseManager] 🎉 Database initialized successfully');
      return this.db;
    } catch (error) {
      console.error('[DatabaseManager] ❌ Failed to initialize database:', error);
      throw error;
    }
  }

  async _setupLocalForage() {
    // Configure LocalForage for optimal performance
    const stores = [
      {
        name: 'playlist-store',
        driver: [localforage.INDEXEDDB, localforage.LOCALSTORAGE, localforage.WEBSQL],
        size: 50 * 1024 * 1024 // 50MB
      },
      {
        name: 'user-preferences',
        driver: [localforage.INDEXEDDB, localforage.LOCALSTORAGE],
        size: 5 * 1024 * 1024 // 5MB
      },
      {
        name: 'cache-data',
        driver: [localforage.INDEXEDDB],
        size: 100 * 1024 * 1024 // 100MB
      }
    ];

    for (const storeConfig of stores) {
      const instance = localforage.createInstance({
        name: storeConfig.name,
        storeName: 'data',
        driver: storeConfig.driver,
        size: storeConfig.size
      });

      // Test the store
      await instance.setItem('_test', { timestamp: Date.now() });
      await instance.removeItem('_test');
      
      console.log(`[DatabaseManager] ✅ LocalForage store '${storeConfig.name}' initialized`);
    }
  }

  async _setupDuckDB() {
    try {
      // Use manual bundle configuration for better compatibility
      const bundle = this._selectBundle();
      
      // Create worker from the selected bundle
      const worker = new Worker(bundle.mainWorker);
      
      // Create logger
      const logger = new duckdb.ConsoleLogger();
      
      // Create DuckDB instance
      this.db = new duckdb.AsyncDuckDB(logger, worker);
      await this.db.instantiate(bundle.mainModule, bundle.pthreadWorker);
      
      // Create optimal schema for streaming data
      await this._createSchema();
      
      console.log('[DatabaseManager] ✅ DuckDB-WASM initialized');
    } catch (error) {
      console.warn('[DatabaseManager] ⚠️ DuckDB initialization failed, falling back to LocalForage only:', error);
      this.db = null; // Will use LocalForage fallback
    }
  }

  _selectBundle() {
    try {
      // Try to use the official bundle selection method
      const availableBundles = duckdb.getJsDelivrBundles();
      
      // If it's an array, use the original logic
      if (Array.isArray(availableBundles)) {
        if (typeof SharedArrayBuffer !== 'undefined' && typeof Atomics !== 'undefined') {
          const ehBundle = availableBundles.find(b => b.mainModule.endsWith('duckdb-eh.wasm'));
          if (ehBundle) {
            console.log('[DatabaseManager] 🚀 Using enhanced DuckDB bundle (shared memory support)');
            return ehBundle;
          }
        }
        
        const mvpBundle = availableBundles.find(b => b.mainModule.endsWith('duckdb-mvp.wasm'));
        if (mvpBundle) {
          console.log('[DatabaseManager] 📦 Using MVP DuckDB bundle');
          return mvpBundle;
        }
      }
    } catch (error) {
      console.warn('[DatabaseManager] ⚠️ Failed to get bundles from getJsDelivrBundles:', error);
    }
    
    // Fallback: create manual bundle configuration
    console.log('[DatabaseManager] 🔧 Using manual bundle configuration');
    
    // Use CDN URLs as fallback
    const cdnBase = 'https://cdn.jsdelivr.net/npm/@duckdb/duckdb-wasm@latest/dist/';
    
    if (typeof SharedArrayBuffer !== 'undefined' && typeof Atomics !== 'undefined') {
      return {
        mainModule: cdnBase + 'duckdb-eh.wasm',
        mainWorker: cdnBase + 'duckdb-browser-eh.worker.js',
        pthreadWorker: cdnBase + 'duckdb-browser-eh.pthread.worker.js'
      };
    }
    
    return {
      mainModule: cdnBase + 'duckdb-mvp.wasm',
      mainWorker: cdnBase + 'duckdb-browser-mvp.worker.js',
      pthreadWorker: undefined
    };
  }

  async _createSchema() {
    if (!this.db) return;

    try {
      // Create tables for efficient querying
      await this.db.exec(`
        CREATE TABLE IF NOT EXISTS playlists (
          id VARCHAR PRIMARY KEY,
          name VARCHAR,
          base_url VARCHAR,
          username VARCHAR,
          data JSON,
          statistics JSON,
          created_at TIMESTAMP,
          updated_at TIMESTAMP,
          size_bytes INTEGER
        );

        CREATE TABLE IF NOT EXISTS streams (
          id VARCHAR PRIMARY KEY,
          playlist_id VARCHAR,
          name VARCHAR,
          type VARCHAR,
          category_id VARCHAR,
          category_name VARCHAR,
          stream_icon VARCHAR,
          metadata JSON,
          created_at TIMESTAMP,
          FOREIGN KEY (playlist_id) REFERENCES playlists(id)
        );

        CREATE TABLE IF NOT EXISTS categories (
          id VARCHAR PRIMARY KEY,
          playlist_id VARCHAR,
          name VARCHAR,
          type VARCHAR,
          stream_count INTEGER,
          created_at TIMESTAMP,
          FOREIGN KEY (playlist_id) REFERENCES playlists(id)
        );

        CREATE INDEX IF NOT EXISTS idx_streams_playlist_type ON streams(playlist_id, type);
        CREATE INDEX IF NOT EXISTS idx_streams_name ON streams(name);
        CREATE INDEX IF NOT EXISTS idx_categories_playlist_type ON categories(playlist_id, type);
      `);

      console.log('[DatabaseManager] ✅ Database schema created');
    } catch (error) {
      console.error('[DatabaseManager] ❌ Failed to create schema:', error);
    }
  }

  // Playlist operations
  async savePlaylist(playlistId, playlistData) {
    try {
      const store = localforage.createInstance({ name: 'playlist-store' });
      
      const enrichedData = {
        ...playlistData,
        _meta: {
          ...playlistData._meta,
          savedAt: Date.now(),
          version: '1.0'
        }
      };

      await store.setItem(playlistId, enrichedData);
      
      // Also save to DuckDB if available
      if (this.db) {
        await this._savePlaylistToDuckDB(playlistId, enrichedData);
      }

      console.log(`[DatabaseManager] 💾 Saved playlist: ${playlistId}`);
      return true;
    } catch (error) {
      console.error('[DatabaseManager] ❌ Failed to save playlist:', error);
      return false;
    }
  }

  async loadPlaylist(playlistId) {
    try {
      const store = localforage.createInstance({ name: 'playlist-store' });
      const data = await store.getItem(playlistId);
      
      if (data) {
        console.log(`[DatabaseManager] 📂 Loaded playlist: ${playlistId}`);
      }
      
      return data;
    } catch (error) {
      console.error('[DatabaseManager] ❌ Failed to load playlist:', error);
      return null;
    }
  }

  async getAllPlaylists() {
    try {
      const store = localforage.createInstance({ name: 'playlist-store' });
      const playlists = [];
      
      await store.iterate((value, key) => {
        if (key !== 'playlist-store') { // Skip internal keys
          playlists.push({ id: key, ...value });
        }
      });

      console.log(`[DatabaseManager] 📋 Loaded ${playlists.length} playlists`);
      return playlists;
    } catch (error) {
      console.error('[DatabaseManager] ❌ Failed to load playlists:', error);
      return [];
    }
  }

  async deletePlaylist(playlistId) {
    try {
      const store = localforage.createInstance({ name: 'playlist-store' });
      await store.removeItem(playlistId);
      
      // Also remove from DuckDB if available
      if (this.db) {
        await this.db.exec(`DELETE FROM playlists WHERE id = '${playlistId}'`);
        await this.db.exec(`DELETE FROM streams WHERE playlist_id = '${playlistId}'`);
        await this.db.exec(`DELETE FROM categories WHERE playlist_id = '${playlistId}'`);
      }

      console.log(`[DatabaseManager] 🗑️ Deleted playlist: ${playlistId}`);
      return true;
    } catch (error) {
      console.error('[DatabaseManager] ❌ Failed to delete playlist:', error);
      return false;
    }
  }

  async _savePlaylistToDuckDB(playlistId, playlistData) {
    if (!this.db) return;

    try {
      const { _meta, categorizedStreams, statistics, categories } = playlistData;
      
      // Save playlist metadata
      await this.db.exec(`
        INSERT OR REPLACE INTO playlists VALUES (
          '${playlistId}',
          '${_meta?.name || 'Unknown'}',
          '${_meta?.baseUrl || ''}',
          '${_meta?.username || ''}',
          '${JSON.stringify(playlistData)}',
          '${JSON.stringify(statistics || {})}',
          '${new Date().toISOString()}',
          '${new Date().toISOString()}',
          ${JSON.stringify(playlistData).length}
        )
      `);

      // Save categories
      if (categories) {
        for (const [type, cats] of Object.entries(categories)) {
          for (const cat of cats) {
            await this.db.exec(`
              INSERT OR REPLACE INTO categories VALUES (
                '${cat.category_id}',
                '${playlistId}',
                '${cat.category_name}',
                '${type}',
                0, -- Will be updated with actual count
                '${new Date().toISOString()}'
              )
            `);
          }
        }
      }

      // Save streams
      if (categorizedStreams) {
        for (const [type, categories] of Object.entries(categorizedStreams)) {
          for (const category of categories) {
            for (const stream of category.streams) {
              await this.db.exec(`
                INSERT OR REPLACE INTO streams VALUES (
                  '${stream.stream_id || stream.num || Math.random().toString(36).substr(2, 9)}',
                  '${playlistId}',
                  '${stream.name.replace(/'/g, "''")}',
                  '${type}',
                  '${stream.category_id || ''}',
                  '${stream.category_name || ''}',
                  '${stream.stream_icon || ''}',
                  '${JSON.stringify(stream)}',
                  '${new Date().toISOString()}'
                )
              `);
            }
          }
        }
      }

      console.log(`[DatabaseManager] 💾 Saved playlist to DuckDB: ${playlistId}`);
    } catch (error) {
      console.error('[DatabaseManager] ❌ Failed to save playlist to DuckDB:', error);
    }
  }

  // Search functionality
  async searchStreams(query, filters = {}) {
    if (!this.db) {
      // Fallback to LocalForage search
      return this._searchLocalForage(query, filters);
    }

    try {
      let whereClause = `WHERE LOWER(s.name) LIKE '%${query.toLowerCase()}%'`;
      
      if (filters.type) {
        whereClause += ` AND s.type = '${filters.type}'`;
      }
      if (filters.playlistId) {
        whereClause += ` AND s.playlist_id = '${filters.playlistId}'`;
      }

      const result = await this.db.exec(`
        SELECT s.*, p.name as playlist_name
        FROM streams s
        LEFT JOIN playlists p ON s.playlist_id = p.id
        ${whereClause}
        LIMIT 100
      `);

      return result.toArray().map(row => ({
        ...row,
        metadata: JSON.parse(row.metadata || '{}')
      }));
    } catch (error) {
      console.error('[DatabaseManager] ❌ DuckDB search failed, falling back to LocalForage:', error);
      return this._searchLocalForage(query, filters);
    }
  }

  async _searchLocalForage(query, filters = {}) {
    try {
      const store = localforage.createInstance({ name: 'playlist-store' });
      const results = [];
      
      await store.iterate((playlistData, playlistId) => {
        if (playlistData.categorizedStreams) {
          for (const [type, categories] of Object.entries(playlistData.categorizedStreams)) {
            if (filters.type && filters.type !== type) continue;
            
            for (const category of categories) {
              for (const stream of category.streams) {
                if (stream.name?.toLowerCase().includes(query.toLowerCase())) {
                  results.push({
                    ...stream,
                    playlistId,
                    playlistName: playlistData._meta?.name || 'Unknown',
                    type
                  });
                }
              }
            }
          }
        }
      });

      return results.slice(0, 100);
    } catch (error) {
      console.error('[DatabaseManager] ❌ LocalForage search failed:', error);
      return [];
    }
  }

  // Utility methods
  async clearAllData() {
    try {
      // Clear LocalForage stores
      await localforage.dropInstance({ name: 'playlist-store' });
      await localforage.dropInstance({ name: 'user-preferences' });
      await localforage.dropInstance({ name: 'cache-data' });
      
      // Clear DuckDB if available
      if (this.db) {
        await this.db.exec('DELETE FROM playlists');
        await this.db.exec('DELETE FROM streams');
        await this.db.exec('DELETE FROM categories');
      }

      console.log('[DatabaseManager] 🧹 Cleared all data');
      return true;
    } catch (error) {
      console.error('[DatabaseManager] ❌ Failed to clear data:', error);
      return false;
    }
  }

  async getStorageInfo() {
    try {
      const store = localforage.createInstance({ name: 'playlist-store' });
      let totalSize = 0;
      let itemCount = 0;
      
      await store.iterate((value, key) => {
        if (key !== 'playlist-store') {
          totalSize += JSON.stringify(value).length;
          itemCount++;
        }
      });

      return {
        totalSize: totalSize / (1024 * 1024), // Convert to MB
        itemCount,
        duckDBAvailable: !!this.db,
        stores: ['playlist-store', 'user-preferences', 'cache-data']
      };
    } catch (error) {
      console.error('[DatabaseManager] ❌ Failed to get storage info:', error);
      return { totalSize: 0, itemCount: 0, duckDBAvailable: false, stores: [] };
    }
  }
}

// Export singleton instance
export const dbManager = new DatabaseManager();

// Export convenience functions
export const initializeDatabase = () => dbManager.initialize();
export const savePlaylist = (id, data) => dbManager.savePlaylist(id, data);
export const loadPlaylist = (id) => dbManager.loadPlaylist(id);
export const getAllPlaylists = () => dbManager.getAllPlaylists();
export const deletePlaylist = (id) => dbManager.deletePlaylist(id);
export const searchStreams = (query, filters) => dbManager.searchStreams(query, filters);
export const clearAllData = () => dbManager.clearAllData();
export const getStorageInfo = () => dbManager.getStorageInfo();