'use client';

import performanceMonitor from "@/utils/performance-monitor";


class DataService {
  constructor() {
    this.cache = new Map();
    this.loadingPromises = new Map();
    this.pageSize = 50;
    this.maxCacheSize = 1000;
  }

  // Generate cache key
  generateCacheKey(type, params = {}) {
    return `${type}-${JSON.stringify(params)}`;
  }

  // Get data with caching
  async getData(type, params = {}, fetchFn) {
    const cacheKey = this.generateCacheKey(type, params);
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
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

  // Fetch and cache data
  async fetchAndCache(cacheKey, fetchFn, params) {
    const measureId = performanceMonitor.startMeasure(`data-${cacheKey}`, 'dataLoad');
    
    try {
      const data = await fetchFn(params);
      
      // Ensure data is an array
      const arrayData = Array.isArray(data) ? data : [];
      
      // Cache the result
      this.cache.set(cacheKey, {
        data: arrayData,
        timestamp: Date.now(),
        params
      });
      
      // Clean up cache if too large
      this.cleanupCache();
      
      performanceMonitor.endMeasure(measureId, { 
        type: 'success',
        dataSize: arrayData.length
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

  // Get personalized recommendations
  async getRecommendations(profileId, type = 'all', limit = 20) {
    const cacheKey = this.generateCacheKey(`recommendations-${profileId}-${type}`, { limit });
    
    return this.getData(cacheKey, { limit }, async (params) => {
      // This would typically call your recommendation API
      // For now, we'll simulate with random selection from cache
      const mockRecommendations = await this.generateMockRecommendations(profileId, type, params.limit);
      return mockRecommendations;
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

  // Get recently added content
  async getRecentlyAdded(type = 'all', limit = 50) {
    const cacheKey = this.generateCacheKey(`recent-${type}`, { limit });
    
    return this.getData(cacheKey, { limit }, async (params) => {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const mockItems = [];
      for (let i = 0; i < limit; i++) {
        mockItems.push({
          id: `recent-${type}-${i}`,
          name: `New ${type} ${i + 1}`,
          type: type,
          rating: (Math.random() * 3 + 7).toFixed(1),
          year: 2024,
          addedDate: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
          poster: `/api/poster/recent/${type}/${i}`
        });
      }
      
      return mockItems.sort((a, b) => new Date(b.addedDate) - new Date(a.addedDate));
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
      hitRate: this.cache.size / (this.cache.size + this.loadingPromises.size)
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