import localforage from 'localforage';

class SimpleDatabaseManager {
  constructor() {
    console.log('[SimpleDatabaseManager] 🔧 Constructor called');
    this.initialized = false;
    this.initializing = false;
    this.initPromise = null;
  }

  async initialize() {
    console.log('[SimpleDatabaseManager] 🚀 initialize() called');
    if (this.initialized) {
      console.log('[SimpleDatabaseManager] ✅ Already initialized');
      return true;
    }
    if (this.initializing) {
      console.log('[SimpleDatabaseManager] ⏳ Already initializing');
      return this.initPromise;
    }

    console.log('[SimpleDatabaseManager] 🔥 Starting initialization...');
    this.initializing = true;
    this.initPromise = this._initializeInternal();
    
    try {
      await this.initPromise;
      this.initialized = true;
      console.log('[SimpleDatabaseManager] ✅ Initialization completed successfully');
      return true;
    } catch (error) {
      console.error('[SimpleDatabaseManager] ❌ Initialization failed:', error);
      this.initializing = false;
      this.initPromise = null;
      throw error;
    }
  }

  async _initializeInternal() {
    try {
      console.log('[SimpleDatabaseManager] 🔧 Starting internal initialization...');
      
      // Initialize LocalForage with optimal settings
      console.log('[SimpleDatabaseManager] 📦 Setting up LocalForage...');
      await this._setupLocalForage();
      console.log('[SimpleDatabaseManager] ✅ LocalForage setup completed');
      
      console.log('[SimpleDatabaseManager] 🎉 Database initialized successfully');
      return true;
    } catch (error) {
      console.error('[SimpleDatabaseManager] ❌ Failed to initialize database:', error);
      throw error;
    }
  }

  async _setupLocalForage() {
    console.log('[SimpleDatabaseManager] 📚 Setting up LocalForage stores...');
    
    // Configure main playlist store
    const playlistStore = localforage.createInstance({
      name: 'playlist-store',
      storeName: 'data',
      driver: [localforage.INDEXEDDB, localforage.LOCALSTORAGE],
      size: 50 * 1024 * 1024 // 50MB
    });

    // Test the store
    await playlistStore.setItem('_test', { timestamp: Date.now() });
    await playlistStore.removeItem('_test');
    
    console.log('[SimpleDatabaseManager] ✅ Playlist store initialized');
  }

  // Playlist operations
  async savePlaylist(playlistId, playlistData) {
    try {
      console.log(`[SimpleDatabaseManager] 💾 Saving playlist: ${playlistId}`);
      
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
      
      console.log(`[SimpleDatabaseManager] ✅ Saved playlist: ${playlistId}`);
      return true;
    } catch (error) {
      console.error('[SimpleDatabaseManager] ❌ Failed to save playlist:', error);
      return false;
    }
  }

  async loadPlaylist(playlistId) {
    try {
      console.log(`[SimpleDatabaseManager] 📂 Loading playlist: ${playlistId}`);
      
      const store = localforage.createInstance({ name: 'playlist-store' });
      const data = await store.getItem(playlistId);
      
      if (data) {
        console.log(`[SimpleDatabaseManager] ✅ Loaded playlist: ${playlistId}`);
      } else {
        console.log(`[SimpleDatabaseManager] ⚠️ No playlist found: ${playlistId}`);
      }
      
      return data;
    } catch (error) {
      console.error('[SimpleDatabaseManager] ❌ Failed to load playlist:', error);
      return null;
    }
  }

  async getAllPlaylists() {
    try {
      console.log('[SimpleDatabaseManager] 📋 Loading all playlists...');
      
      const store = localforage.createInstance({ name: 'playlist-store' });
      const playlists = [];
      
  await store.iterate((value, key) => {
        // Skip internal keys and ensure valid data
        if (key !== 'playlist-store' && key !== '_test' && value && typeof value === 'object') {
          playlists.push({ id: key, ...value });
        }
      });

      console.log(`[SimpleDatabaseManager] 📋 Loaded ${playlists.length} playlists`);
      return playlists;
    } catch (error) {
      console.error('[SimpleDatabaseManager] ❌ Failed to load playlists:', error);
      return [];
    }
  }

  async deletePlaylist(playlistId) {
    try {
      console.log(`[SimpleDatabaseManager] 🗑️ Deleting playlist: ${playlistId}`);
      
      const store = localforage.createInstance({ name: 'playlist-store' });
      await store.removeItem(playlistId);

      console.log(`[SimpleDatabaseManager] ✅ Deleted playlist: ${playlistId}`);
      return true;
    } catch (error) {
      console.error('[SimpleDatabaseManager] ❌ Failed to delete playlist:', error);
      return false;
    }
  }

  // Search functionality
  async searchStreams(query, filters = {}) {
    console.log(`[SimpleDatabaseManager] 🔍 Searching for: "${query}"`, filters);
    
    try {
      const store = localforage.createInstance({ name: 'playlist-store' });
      const results = [];
      
      await store.iterate((playlistData, playlistId) => {
        if (playlistData?.categorizedStreams) {
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

      console.log(`[SimpleDatabaseManager] 🔍 Found ${results.length} results`);
      return results.slice(0, 100);
    } catch (error) {
      console.error('[SimpleDatabaseManager] ❌ Search failed:', error);
      return [];
    }
  }

  // Utility methods
  async clearAllData() {
    try {
      console.log('[SimpleDatabaseManager] 🧹 Clearing all data...');
      
      await localforage.dropInstance({ name: 'playlist-store' });
      
      console.log('[SimpleDatabaseManager] ✅ Cleared all data');
      return true;
    } catch (error) {
      console.error('[SimpleDatabaseManager] ❌ Failed to clear data:', error);
      return false;
    }
  }

  async getStorageInfo() {
    try {
      const store = localforage.createInstance({ name: 'playlist-store' });
      let totalSize = 0;
      let itemCount = 0;
      
      await store.iterate((value, key) => {
        if (key !== 'playlist-store' && key !== '_test') {
          totalSize += JSON.stringify(value).length;
          itemCount++;
        }
      });

      return {
        totalSize: totalSize / (1024 * 1024), // Convert to MB
        itemCount,
        duckDBAvailable: false,
        stores: ['playlist-store']
      };
    } catch (error) {
      console.error('[SimpleDatabaseManager] ❌ Failed to get storage info:', error);
      return { totalSize: 0, itemCount: 0, duckDBAvailable: false, stores: [] };
    }
  }
}

// Export singleton instance
export const simpleDbManager = new SimpleDatabaseManager();

// Export convenience functions
export const initializeDatabase = () => simpleDbManager.initialize();
export const savePlaylist = (id, data) => simpleDbManager.savePlaylist(id, data);
export const loadPlaylist = (id) => simpleDbManager.loadPlaylist(id);
export const getAllPlaylists = () => simpleDbManager.getAllPlaylists();
export const deletePlaylist = (id) => simpleDbManager.deletePlaylist(id);
export const searchStreams = (query, filters) => simpleDbManager.searchStreams(query, filters);
export const clearAllData = () => simpleDbManager.clearAllData();
export const getStorageInfo = () => simpleDbManager.getStorageInfo();