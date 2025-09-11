import localforage from 'localforage';

class SimpleDatabaseManager {
  constructor() {
    console.log('[SimpleDatabaseManager] 🔧 Constructor called');
    this.initialized = false;
    this.initializing = false;
    this.initPromise = null;
    this.cache = new Map();
    this.cacheTimeout = 2 * 60 * 1000; // 2 minutes
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
      
      // Update cache
      this._setCache(playlistId, enrichedData);
      
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
      
      // Check cache first
      const cached = this._getFromCache(playlistId);
      if (cached) {
        console.log(`[SimpleDatabaseManager] 🎯 Cache hit for playlist: ${playlistId}`);
        return cached;
      }
      
      const store = localforage.createInstance({ name: 'playlist-store' });
      const data = await store.getItem(playlistId);
      
      if (data) {
        console.log(`[SimpleDatabaseManager] ✅ Loaded playlist: ${playlistId}`);
        // Cache the result
        this._setCache(playlistId, data);
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
      
      // Check cache first
      const cacheKey = 'all_playlists';
      const cached = this._getFromCache(cacheKey);
      if (cached) {
        console.log('[SimpleDatabaseManager] 🎯 Cache hit for all playlists');
        return cached;
      }
      
      const store = localforage.createInstance({ name: 'playlist-store' });
      const playlists = [];
      
      await store.iterate((value, key) => {
        // Skip internal keys and ensure valid data
        if (key !== 'playlist-store' && key !== '_test' && value && typeof value === 'object') {
          playlists.push({ id: key, ...value });
        }
      });

      console.log(`[SimpleDatabaseManager] 📋 Loaded ${playlists.length} playlists`);
      
      // Cache the result
      this._setCache(cacheKey, playlists);
      
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

      // Clear cache
      this.cache.delete(playlistId);
      this.cache.delete('all_playlists');

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

  // Get category streams with pagination support
  async getCategoryStreams(playlistId, categoryId, type, limit = 50, offset = 0) {
    console.log(`[SimpleDatabaseManager] 📂 Getting category streams:`, {
      playlistId,
      categoryId,
      type,
      limit,
      offset
    });
    
    try {
      const store = localforage.createInstance({ name: 'playlist-store' });
      const playlistData = await store.getItem(playlistId);
      
      if (!playlistData?.categorizedStreams) {
        console.log(`[SimpleDatabaseManager] ⚠️ No categorized streams found for playlist: ${playlistId}`);
        return { streams: [], total: 0 };
      }
      
      const categoryData = playlistData.categorizedStreams[type] || [];
      const targetCategory = categoryData.find(cat => 
        cat.categoryId === categoryId || 
        cat.category_id === categoryId || 
        cat.categoryName === categoryId || 
        cat.category_name === categoryId ||
        cat.name === categoryId
      );
      
      if (!targetCategory) {
        console.log(`[SimpleDatabaseManager] ⚠️ Category not found: ${categoryId}`);
        return { streams: [], total: 0 };
      }
      
      const allStreams = targetCategory.streams || [];
      const total = allStreams.length;
      const streams = allStreams.slice(offset, offset + limit);
      
      console.log(`[SimpleDatabaseManager] ✅ Retrieved category streams:`, {
        categoryId,
        categoryName: targetCategory.categoryName || targetCategory.category_name || targetCategory.name,
        type,
        total,
        limit,
        offset,
        returned: streams.length,
        hasMore: offset + limit < total
      });
      
      return { streams, total };
    } catch (error) {
      console.error('[SimpleDatabaseManager] ❌ Failed to get category streams:', error);
      return { streams: [], total: 0 };
    }
  }

  // Get optimized content by type (reduces memory usage)
  async getContentByType(playlistId, type, options = {}) {
    console.log(`[SimpleDatabaseManager] 🎯 Getting content by type:`, {
      playlistId,
      type,
      options
    });
    
    const { limit = 100, offset = 0, categoryId = null } = options;
    
    try {
      const store = localforage.createInstance({ name: 'playlist-store' });
      const playlistData = await store.getItem(playlistId);
      
      if (!playlistData?.categorizedStreams) {
        console.log(`[SimpleDatabaseManager] ⚠️ No categorized streams found for playlist: ${playlistId}`);
        return { categories: [], total: 0 };
      }
      
      const categoriesData = playlistData.categorizedStreams[type] || [];
      let result = [];
      let totalStreams = 0;
      
      if (categoryId) {
        // Get specific category
        const targetCategory = categoriesData.find(cat => 
          cat.categoryId === categoryId || 
          cat.category_id === categoryId || 
          cat.categoryName === categoryId || 
          cat.category_name === categoryId ||
          cat.name === categoryId
        );
        
        if (targetCategory) {
          const streams = (targetCategory.streams || []).slice(offset, offset + limit);
          result = [{
            ...targetCategory,
            streams,
            streamCount: streams.length,
            totalStreamCount: targetCategory.streams?.length || 0
          }];
          totalStreams = targetCategory.streams?.length || 0;
        }
      } else {
        // Get all categories with limited streams
        result = categoriesData.map(category => ({
          ...category,
          streams: (category.streams || []).slice(0, limit), // Limit streams per category
          streamCount: Math.min(limit, category.streams?.length || 0),
          totalStreamCount: category.streams?.length || 0
        }));
        totalStreams = categoriesData.reduce((sum, cat) => sum + (cat.streams?.length || 0), 0);
      }
      
      console.log(`[SimpleDatabaseManager] ✅ Retrieved ${result.length} categories, ${totalStreams} total streams for type: ${type}`);
      
      return {
        categories: result,
        total: totalStreams,
        metadata: {
          playlistName: playlistData._meta?.name || 'Unknown',
          type,
          limit,
          offset
        }
      };
    } catch (error) {
      console.error('[SimpleDatabaseManager] ❌ Failed to get content by type:', error);
      return { categories: [], total: 0 };
    }
  }

  // Get minimal playlist metadata (for playlists page)
  async getPlaylistMetadata(playlistId) {
    try {
      const store = localforage.createInstance({ name: 'playlist-store' });
      const playlistData = await store.getItem(playlistId);
      
      if (!playlistData) {
        return null;
      }
      
      // Return only essential metadata, not the full data
      return {
        id: playlistId,
        name: playlistData._meta?.name || 'Unknown',
        baseUrl: playlistData._meta?.baseUrl || '',
        username: playlistData._meta?.username || '',
        statistics: playlistData.statistics || {},
        loadedAt: playlistData._meta?.loadedAt || Date.now(),
        categoryCounts: {
          live: playlistData.categorizedStreams?.live?.length || 0,
          vod: playlistData.categorizedStreams?.vod?.length || 0,
          series: playlistData.categorizedStreams?.series?.length || 0
        }
      };
    } catch (error) {
      console.error('[SimpleDatabaseManager] ❌ Failed to get playlist metadata:', error);
      return null;
    }
  }

  // Caching methods
  _getFromCache(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  _setCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
    
    // Clean up old cache entries
    if (this.cache.size > 50) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
  }

  _clearCache() {
    this.cache.clear();
  }

  // Utility methods
  async clearAllData() {
    try {
      console.log('[SimpleDatabaseManager] 🧹 Clearing all data...');
      
      await localforage.dropInstance({ name: 'playlist-store' });
      this._clearCache();
      
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
export const getCategoryStreams = (playlistId, categoryId, type, limit, offset) => simpleDbManager.getCategoryStreams(playlistId, categoryId, type, limit, offset);
export const getContentByType = (playlistId, type, options) => simpleDbManager.getContentByType(playlistId, type, options);
export const getPlaylistMetadata = (playlistId) => simpleDbManager.getPlaylistMetadata(playlistId);
export const clearAllData = () => simpleDbManager.clearAllData();
export const getStorageInfo = () => simpleDbManager.getStorageInfo();