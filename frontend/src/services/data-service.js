'use client';

import performanceMonitor from "@/utils/performance-monitor";
import { simpleDbManager } from '@/lib/simple-database';

class DataService {
  constructor() {
    this.cache = new Map();
    this.loadingPromises = new Map();
    this.pageSize = 50;
    this.maxCacheSize = 1000;
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    this.duckDBAvailable = false;
    this.stores = {};
    this.performanceMetrics = {
      cacheHits: 0,
      cacheMisses: 0,
      searchTime: 0,
      loadTime: 0
    };
  }

  // Generate cache key
  generateCacheKey(type, params = {}) {
    return `${type}-${JSON.stringify(params)}`;
  }

  // Initialize enhanced storage
  async initialize() {
    try {
      // Check if DuckDB is available
      if (typeof window !== 'undefined' && window.DuckDB) {
        this.duckDBAvailable = true;
        console.log('[DataService] 🦆 DuckDB is available');
      } else {
        console.log('[DataService] 📦 Using LocalForage only');
      }

      // Configure optimized LocalForage instances
      await this._setupOptimizedStorage();
      
      console.log('[DataService] ✅ Enhanced data service initialized');
    } catch (error) {
      console.error('[DataService] ❌ Failed to initialize:', error);
    }
  }

  // Setup optimized storage configuration
  async _setupOptimizedStorage() {
    const localforage = await import('localforage');
    
    // Main playlist data store
    this.stores.playlist = localforage.default.createInstance({
      name: 'syncstream-playlists',
      storeName: 'playlists',
      driver: [localforage.default.INDEXEDDB, localforage.default.LOCALSTORAGE],
      size: 100 * 1024 * 1024, // 100MB
      description: 'Main playlist storage'
    });

    // User preferences and state
    this.stores.user = localforage.default.createInstance({
      name: 'syncstream-users',
      storeName: 'user-data',
      driver: [localforage.default.INDEXEDDB, localforage.default.LOCALSTORAGE],
      size: 10 * 1024 * 1024, // 10MB
      description: 'User preferences and state'
    });

    // Search index cache
    this.stores.search = localforage.default.createInstance({
      name: 'syncstream-search',
      storeName: 'search-index',
      driver: [localforage.default.INDEXEDDB, localforage.default.LOCALSTORAGE],
      size: 50 * 1024 * 1024, // 50MB
      description: 'Search index and results cache'
    });

    // Test all stores
    await Promise.all([
      this.stores.playlist.setItem('_test', { ts: Date.now() }),
      this.stores.user.setItem('_test', { ts: Date.now() }),
      this.stores.search.setItem('_test', { ts: Date.now() })
    ]);

    await Promise.all([
      this.stores.playlist.removeItem('_test'),
      this.stores.user.removeItem('_test'),
      this.stores.search.removeItem('_test')
    ]);
  }

  // Enhanced cache management with TTL
  _getFromCache(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      this.performanceMetrics.cacheHits++;
      return cached.data;
    }
    this.cache.delete(key);
    this.performanceMetrics.cacheMisses++;
    return null;
  }

  _setCache(key, data) {
    if (this.cache.size >= this.maxCacheSize) {
      // Remove oldest entry
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
    
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  // Get data with enhanced caching
  async getData(type, params = {}, fetchFn) {
    const cacheKey = this.generateCacheKey(type, params);
    
    // Check cache first
    const cached = this._getFromCache(cacheKey);
    if (cached) {
      return Array.isArray(cached) ? cached : [];
    }
    
    // Check if already loading
    if (this.loadingPromises.has(cacheKey)) {
      return this.loadingPromises.get(cacheKey);
    }
    
    // Start loading
    const loadingPromise = this.fetchAndCache(cacheKey, fetchFn, params);
    this.loadingPromises.set(cacheKey, loadingPromise);
    
    try {
      const result = await loadingPromise;
      return Array.isArray(result) ? result : [];
    } catch (error) {
      console.warn(`Error loading data for ${type}:`, error);
      return [];
    } finally {
      this.loadingPromises.delete(cacheKey);
    }
  }

  // Fetch and cache data with enhanced performance
  async fetchAndCache(cacheKey, fetchFn, params) {
    const measureId = performanceMonitor.startMeasure(`data-${cacheKey}`, 'dataLoad');
    const startTime = performance.now();
    
    try {
      const data = await fetchFn(params);
      
      // Ensure data is an array
      const arrayData = Array.isArray(data) ? data : [];
      
      // Cache the result with TTL
      this._setCache(cacheKey, arrayData);
      
      // Clean up cache if too large
      this.cleanupCache();
      
      const loadTime = performance.now() - startTime;
      this.performanceMetrics.loadTime = loadTime;
      
      performanceMonitor.endMeasure(measureId, { 
        type: 'success',
        dataSize: arrayData.length,
        loadTime: loadTime.toFixed(2)
      });
      
      return arrayData;
    } catch (error) {
      performanceMonitor.endMeasure(measureId, { 
        type: 'error',
        error: error.message 
      });
      throw error;
    }
  }

  // Get paginated data
  async getPaginatedData(type, page = 1, filters = {}, fetchFn) {
    const params = { page, pageSize: this.pageSize, ...filters };
    const cacheKey = this.generateCacheKey(`${type}-page-${page}`, params);
    
    return this.getData(cacheKey, params, fetchFn);
  }

  // Get infinite scroll data
  async getInfiniteData(type, page = 1, filters = {}, fetchFn) {
    const allData = [];
    const measureId = performanceMonitor.startMeasure(`infinite-${type}`, 'dataLoad');
    
    try {
      let currentPage = 1;
      let hasMore = true;
      let totalCount = 0;
      
      while (hasMore && currentPage <= page) {
        const pageData = await this.getPaginatedData(type, currentPage, filters, fetchFn);
        
        if (pageData && Array.isArray(pageData.items)) {
          allData.push(...pageData.items);
          totalCount = pageData.totalCount || allData.length;
          hasMore = pageData.hasMore || allData.length < totalCount;
        } else {
          hasMore = false;
        }
        
        currentPage++;
      }
      
      performanceMonitor.endMeasure(measureId, { 
        totalPages: page,
        totalItems: allData.length,
        type: 'success'
      });
      
      return {
        items: allData,
        totalCount,
        hasMore
      };
    } catch (error) {
      performanceMonitor.endMeasure(measureId, { 
        error: error.message,
        type: 'error'
      });
      throw error;
    }
  }

  // Get personalized recommendations using real data
  async getRecommendations(profileId, type = 'all', limit = 20) {
    const cacheKey = this.generateCacheKey(`recommendations-${profileId}-${type}`, { limit });
    
    return this.getData(cacheKey, { limit }, async (params) => {
      try {
        // Get user preferences
        const userPrefs = await this.stores.user.getItem(`profile-${profileId}`) || {};
        const watchHistory = userPrefs?.watchHistory || [];
        const favorites = userPrefs?.favorites || [];

        // Get playlists for content
        const playlists = await simpleDbManager.getAllPlaylists();
        const recommendations = [];

        // Extract user preferences
        const userGenres = this._extractGenresFromHistory(watchHistory.concat(favorites));
        
        for (const playlist of playlists) {
          if (playlist.categorizedStreams) {
            const targetTypes = type === 'all' ? ['live', 'vod', 'series'] : [type === 'movies' ? 'vod' : type];
            
            for (const streamType of targetTypes) {
              const categories = playlist.categorizedStreams[streamType] || [];
              for (const category of categories) {
                // Boost score if category matches user preferences
                const genreMatch = userGenres.some(genre => 
                  category.categoryName?.toLowerCase().includes(genre.toLowerCase())
                );
                
                const streams = category.streams || [];
                for (const stream of streams) {
                  recommendations.push({
                    ...stream,
                    type: streamType,
                    score: genreMatch ? 2 : 1,
                    playlistName: playlist._meta?.name || 'Unknown'
                  });
                }
              }
            }
          }
        }

        // Sort by recommendation score and randomness
        recommendations.sort((a, b) => {
          const scoreDiff = (b.score || 0) - (a.score || 0);
          if (scoreDiff !== 0) return scoreDiff;
          return Math.random() - 0.5; // Add some randomness
        });

        return recommendations.slice(0, limit);
      } catch (error) {
        console.error('[DataService] ❌ Failed to get recommendations:', error);
        return [];
      }
    });
  }

  // Generate mock recommendations (replace with real API)
  async generateMockRecommendations(profileId, type, limit) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const mockItems = [];
    for (let i = 0; i < limit; i++) {
      mockItems.push({
        id: `${type}-${profileId}-${i}`,
        name: `${type} Recommendation ${i + 1}`,
        type: type,
        rating: (Math.random() * 3 + 7).toFixed(1),
        year: 2020 + Math.floor(Math.random() * 4),
        poster: `/api/poster/${type}/${i}`,
        isFavorite: Math.random() > 0.7,
        watchProgress: Math.random() > 0.5 ? Math.floor(Math.random() * 100) : null
      });
    }
    
    return mockItems;
  }

  // Get recently added content using real data
  async getRecentlyAdded(type = 'all', limit = 50) {
    const cacheKey = this.generateCacheKey(`recent-${type}`, { limit });
    
    return this.getData(cacheKey, { limit }, async (params) => {
      try {
        const playlists = await simpleDbManager.getAllPlaylists();
        const recentItems = [];

        for (const playlist of playlists) {
          if (playlist.categorizedStreams) {
            const targetTypes = type === 'all' ? ['live', 'vod', 'series'] : [type === 'movies' ? 'vod' : type];
            
            for (const streamType of targetTypes) {
              const categories = playlist.categorizedStreams[streamType] || [];
              for (const category of categories) {
                const streams = category.streams || [];
                for (const stream of streams) {
                  recentItems.push({
                    ...stream,
                    type: streamType,
                    playlistName: playlist._meta?.name || 'Unknown',
                    addedAt: stream.added_at || playlist._meta?.loadedAt || Date.now()
                  });
                }
              }
            }
          }
        }

        // Sort by added timestamp (if available) or use playlist timestamp
        recentItems.sort((a, b) => {
          const aTime = a.addedAt || a.added_at || a._meta?.addedAt || 0;
          const bTime = b.addedAt || b.added_at || b._meta?.addedAt || 0;
          return bTime - aTime;
        });

        return recentItems.slice(0, limit);
      } catch (error) {
        console.error('[DataService] ❌ Failed to get recently added:', error);
        return [];
      }
    });
  }

  // Get top rated content
  async getTopRated(type = 'all', limit = 50) {
    const cacheKey = this.generateCacheKey(`toprated-${type}`, { limit });
    
    return this.getData(cacheKey, { limit }, async (params) => {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const mockItems = [];
      for (let i = 0; i < limit; i++) {
        mockItems.push({
          id: `toprated-${type}-${i}`,
          name: `Top Rated ${type} ${i + 1}`,
          type: type,
          rating: (Math.random() * 2 + 8).toFixed(1), // Higher ratings
          year: 2020 + Math.floor(Math.random() * 4),
          poster: `/api/poster/toprated/${type}/${i}`,
          votes: Math.floor(Math.random() * 10000) + 1000
        });
      }
      
      return mockItems.sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating));
    });
  }

  // Get continue watching
  async getContinueWatching(profileId, limit = 20) {
    const cacheKey = this.generateCacheKey(`continue-${profileId}`, { limit });
    
    return this.getData(cacheKey, { limit }, async (params) => {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 30));
      
      const mockItems = [];
      for (let i = 0; i < limit; i++) {
        const progress = Math.floor(Math.random() * 100);
        mockItems.push({
          id: `continue-${profileId}-${i}`,
          name: `Continue Watching ${i + 1}`,
          type: ['movies', 'series'][Math.floor(Math.random() * 2)],
          progress: progress,
          episode: type === 'series' ? Math.floor(Math.random() * 10) + 1 : null,
          season: type === 'series' ? Math.floor(Math.random() * 5) + 1 : null,
          poster: `/api/poster/continue/${i}`,
          lastWatched: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString()
        });
      }
      
      return mockItems.sort((a, b) => new Date(b.lastWatched) - new Date(a.lastWatched));
    });
  }

  // Get favorites
  async getFavorites(profileId, limit = 50) {
    const cacheKey = this.generateCacheKey(`favorites-${profileId}`, { limit });
    
    return this.getData(cacheKey, { limit }, async (params) => {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 30));
      
      const mockItems = [];
      for (let i = 0; i < limit; i++) {
        mockItems.push({
          id: `favorite-${profileId}-${i}`,
          name: `Favorite ${i + 1}`,
          type: ['movies', 'series', 'live'][Math.floor(Math.random() * 3)],
          rating: (Math.random() * 3 + 7).toFixed(1),
          year: 2020 + Math.floor(Math.random() * 4),
          poster: `/api/poster/favorites/${i}`,
          addedDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
        });
      }
      
      return mockItems.sort((a, b) => new Date(b.addedDate) - new Date(a.addedDate));
    });
  }

  // Cache cleanup
  cleanupCache() {
    if (this.cache.size > this.maxCacheSize) {
      const entries = Array.from(this.cache.entries());
      const sortedEntries = entries.sort(([,a], [,b]) => a.timestamp - b.timestamp);
      
      // Remove oldest 20% of entries
      const entriesToRemove = sortedEntries.slice(0, Math.floor(this.maxCacheSize * 0.2));
      entriesToRemove.forEach(([key]) => this.cache.delete(key));
    }
  }

  // Clear cache
  clearCache() {
    this.cache.clear();
    this.loadingPromises.clear();
  }

  // Get cache stats
  getCacheStats() {
    return {
      size: this.cache.size,
      maxCacheSize: this.maxCacheSize,
      loadingPromises: this.loadingPromises.size,
      hitRate: this.performanceMetrics.cacheHits / (this.performanceMetrics.cacheHits + this.performanceMetrics.cacheMisses) || 0,
      performanceMetrics: this.performanceMetrics,
      duckDBAvailable: this.duckDBAvailable
    };
  }

  // Performance monitoring
  async getPerformanceMetrics() {
    return {
      ...this.performanceMetrics,
      cacheSize: this.cache.size,
      hitRate: this.performanceMetrics.cacheHits / (this.performanceMetrics.cacheHits + this.performanceMetrics.cacheMisses) || 0,
      duckDBAvailable: this.duckDBAvailable,
      storesConfigured: Object.keys(this.stores).length
    };
  }

  // Enhanced search with optimized performance
  async searchOptimized(query, filters = {}) {
    if (!query || query.trim().length < 2) {
      return [];
    }

    const startTime = performance.now();
    const searchKey = `${query}-${JSON.stringify(filters)}`;
    
    // Check cache first
    const cached = this._getFromCache(searchKey);
    if (cached) {
      this.performanceMetrics.searchTime = performance.now() - startTime;
      return cached;
    }

    try {
      // Use simpleDbManager for search with enhanced performance
      const results = await simpleDbManager.searchStreams(query, filters);
      
      const searchTime = performance.now() - startTime;
      this.performanceMetrics.searchTime = searchTime;

      // Cache results
      this._setCache(searchKey, results);

      console.log(`[DataService] 🔍 Optimized search completed in ${searchTime.toFixed(2)}ms: ${results.length} results`);
      return results;
    } catch (error) {
      console.error('[DataService] ❌ Optimized search failed:', error);
      return [];
    }
  }

  // Cleanup
  clearCache() {
    this.cache.clear();
    this.loadingPromises.clear();
    this.performanceMetrics = {
      cacheHits: 0,
      cacheMisses: 0,
      searchTime: 0,
      loadTime: 0
    };
  }
}

// Create singleton instance
export const dataService = new DataService();

// Export hook for React components
export function useDataService() {
  return {
    getData: dataService.getData.bind(dataService),
    getPaginatedData: dataService.getPaginatedData.bind(dataService),
    getInfiniteData: dataService.getInfiniteData.bind(dataService),
    getRecommendations: dataService.getRecommendations.bind(dataService),
    getRecentlyAdded: dataService.getRecentlyAdded.bind(dataService),
    getTopRated: dataService.getTopRated.bind(dataService),
    getContinueWatching: dataService.getContinueWatching.bind(dataService),
    getFavorites: dataService.getFavorites.bind(dataService),
    clearCache: dataService.clearCache.bind(dataService),
    getCacheStats: dataService.getCacheStats.bind(dataService)
  };
}

export default dataService;