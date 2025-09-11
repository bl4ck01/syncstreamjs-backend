import { useLiveStore } from '@/store/live-store';
import { useMoviesStore } from '@/store/movies-store';
import { useSeriesStore } from '@/store/series-store';
import { duckdbManager } from '@/lib/duckdb-database';

class OptimizedDataService {
  constructor() {
    this.initialized = false;
    this.cache = new Map();
    this.cacheTimeout = 2 * 60 * 1000; // 2 minutes
  }

  async initialize() {
    if (this.initialized) return;
    
    console.log('[OptimizedDataService] 🚀 Initializing optimized data service...');
    
    try {
      // Initialize DuckDB
      await duckdbManager.initialize();
      
      // Initialize all stores
      const { initialize: initLive } = useLiveStore.getState();
      const { initialize: initMovies } = useMoviesStore.getState();
      const { initialize: initSeries } = useSeriesStore.getState();
      
      await Promise.all([
        initLive(),
        initMovies(),
        initSeries()
      ]);
      
      this.initialized = true;
      console.log('[OptimizedDataService] ✅ Initialized successfully');
    } catch (error) {
      console.error('[OptimizedDataService] ❌ Initialization failed:', error);
      throw error;
    }
  }

  // Get data for live page - only live channels
  async getLivePageData(options = {}) {
    const cacheKey = `live:${JSON.stringify(options)}`;
    
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    console.log('[OptimizedDataService] 📺 Getting live page data...');
    
    try {
      const state = useLiveStore.getState();
      
      // Load categories first
      const categories = await duckdbManager.getCategories('live');
      
      // Load channels for each category (progressive loading)
      const categoryData = [];
      const limit = options.limit || 20; // Load 20 channels per category initially
      
      for (const category of categories.slice(0, 10)) { // First 10 categories
        const channels = await duckdbManager.getLiveChannelsByCategory(category.name, { limit });
        categoryData.push({
          name: category.name,
          items: channels,
          count: channels.length,
          totalItems: category.channel_count,
          categoryId: category.name.replace(/[^a-zA-Z0-9]/g, '-'),
          isOptimized: true
        });
      }

      const result = {
        categories: categoryData,
        totalCategories: categories.length,
        totalChannels: categories.reduce((sum, cat) => sum + cat.channel_count, 0),
        featured: categoryData.slice(0, 3).flatMap(cat => cat.items.slice(0, 1))
      };

      this.cache.set(cacheKey, { data: result, timestamp: Date.now() });
      
      console.log(`[OptimizedDataService] ✅ Live page data: ${result.categories.length} categories, ${result.totalChannels} channels`);
      return result;
    } catch (error) {
      console.error('[OptimizedDataService] ❌ Failed to get live page data:', error);
      throw error;
    }
  }

  // Get data for movies page - only movies
  async getMoviesPageData(options = {}) {
    const cacheKey = `movies:${JSON.stringify(options)}`;
    
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    console.log('[OptimizedDataService] 🎬 Getting movies page data...');
    
    try {
      // Load categories first
      const categories = await duckdbManager.getCategories('vod');
      
      // Load movies for each category (progressive loading)
      const categoryData = [];
      const limit = options.limit || 20; // Load 20 movies per category initially
      
      for (const category of categories.slice(0, 10)) { // First 10 categories
        const movies = await duckdbManager.getMoviesByCategory(category.name, { limit });
        categoryData.push({
          name: category.name,
          items: movies,
          count: movies.length,
          totalItems: category.movie_count,
          categoryId: category.name.replace(/[^a-zA-Z0-9]/g, '-'),
          isOptimized: true
        });
      }

      const result = {
        categories: categoryData,
        totalCategories: categories.length,
        totalMovies: categories.reduce((sum, cat) => sum + cat.movie_count, 0),
        featured: categoryData.slice(0, 3).flatMap(cat => cat.items.slice(0, 1))
      };

      this.cache.set(cacheKey, { data: result, timestamp: Date.now() });
      
      console.log(`[OptimizedDataService] ✅ Movies page data: ${result.categories.length} categories, ${result.totalMovies} movies`);
      return result;
    } catch (error) {
      console.error('[OptimizedDataService] ❌ Failed to get movies page data:', error);
      throw error;
    }
  }

  // Get data for series page - only series
  async getSeriesPageData(options = {}) {
    const cacheKey = `series:${JSON.stringify(options)}`;
    
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    console.log('[OptimizedDataService] 📺 Getting series page data...');
    
    try {
      // Load categories first
      const categories = await duckdbManager.getCategories('series');
      
      // Load series for each category (progressive loading)
      const categoryData = [];
      const limit = options.limit || 20; // Load 20 series per category initially
      
      for (const category of categories.slice(0, 10)) { // First 10 categories
        const series = await duckdbManager.getSeriesByCategory(category.name, { limit });
        categoryData.push({
          name: category.name,
          items: series,
          count: series.length,
          totalItems: category.series_count,
          categoryId: category.name.replace(/[^a-zA-Z0-9]/g, '-'),
          isOptimized: true
        });
      }

      const result = {
        categories: categoryData,
        totalCategories: categories.length,
        totalSeries: categories.reduce((sum, cat) => sum + cat.series_count, 0),
        featured: categoryData.slice(0, 3).flatMap(cat => cat.items.slice(0, 1))
      };

      this.cache.set(cacheKey, { data: result, timestamp: Date.now() });
      
      console.log(`[OptimizedDataService] ✅ Series page data: ${result.categories.length} categories, ${result.totalSeries} series`);
      return result;
    } catch (error) {
      console.error('[OptimizedDataService] ❌ Failed to get series page data:', error);
      throw error;
    }
  }

  // Load more categories for a specific content type
  async loadMoreCategories(contentType, currentCount, limit = 5) {
    console.log(`[OptimizedDataService] 📂 Loading more ${contentType} categories...`);
    
    try {
      const categories = await duckdbManager.getCategories(
        contentType === 'movies' ? 'vod' : contentType
      );
      
      const newCategories = categories.slice(currentCount, currentCount + limit);
      const categoryData = [];
      
      for (const category of newCategories) {
        let items;
        switch (contentType) {
          case 'live':
            items = await duckdbManager.getLiveChannelsByCategory(category.name, { limit: 20 });
            break;
          case 'movies':
            items = await duckdbManager.getMoviesByCategory(category.name, { limit: 20 });
            break;
          case 'series':
            items = await duckdbManager.getSeriesByCategory(category.name, { limit: 20 });
            break;
        }
        
        categoryData.push({
          name: category.name,
          items,
          count: items.length,
          totalItems: contentType === 'live' ? category.channel_count :
                      contentType === 'movies' ? category.movie_count :
                      category.series_count,
          categoryId: category.name.replace(/[^a-zA-Z0-9]/g, '-'),
          isOptimized: true
        });
      }

      console.log(`[OptimizedDataService] ✅ Loaded ${categoryData.length} more ${contentType} categories`);
      return {
        categories: categoryData,
        hasMore: currentCount + limit < categories.length
      };
    } catch (error) {
      console.error(`[OptimizedDataService] ❌ Failed to load more ${contentType} categories:`, error);
      throw error;
    }
  }

  // Load more items for a specific category
  async loadMoreItems(contentType, category, offset, limit = 12) {
    console.log(`[OptimizedDataService] 🔄 Loading more ${contentType} items for category: ${category}`);
    
    try {
      let items;
      switch (contentType) {
        case 'live':
          items = await duckdbManager.getLiveChannelsByCategory(category, { offset, limit });
          break;
        case 'movies':
          items = await duckdbManager.getMoviesByCategory(category, { offset, limit });
          break;
        case 'series':
          items = await duckdbManager.getSeriesByCategory(category, { offset, limit });
          break;
      }
      
      console.log(`[OptimizedDataService] ✅ Loaded ${items.length} more ${contentType} items`);
      return items;
    } catch (error) {
      console.error(`[OptimizedDataService] ❌ Failed to load more ${contentType} items:`, error);
      throw error;
    }
  }

  // Search within a specific content type
  async search(contentType, query, options = {}) {
    console.log(`[OptimizedDataService] 🔍 Searching ${contentType}: ${query}`);
    
    try {
      let results;
      switch (contentType) {
        case 'live':
          results = await duckdbManager.getLiveChannels({ search: query, limit: options.limit || 50 });
          break;
        case 'movies':
          results = await duckdbManager.getMovies({ search: query, limit: options.limit || 50 });
          break;
        case 'series':
          results = await duckdbManager.getSeries({ search: query, limit: options.limit || 50 });
          break;
        default:
          // Search all types
          const searchResults = await duckdbManager.searchAll(query, options);
          return searchResults;
      }
      
      console.log(`[OptimizedDataService] ✅ Found ${results.length} ${contentType} results`);
      return results;
    } catch (error) {
      console.error(`[OptimizedDataService] ❌ Search failed for ${contentType}:`, error);
      throw error;
    }
  }

  // Get database statistics
  async getStats() {
    try {
      const stats = await duckdbManager.getStats();
      console.log('[OptimizedDataService] 📊 Database stats:', stats);
      return stats;
    } catch (error) {
      console.error('[OptimizedDataService] ❌ Failed to get stats:', error);
      throw error;
    }
  }

  // Import playlist data
  async importPlaylist(playlist) {
    console.log('[OptimizedDataService] 📥 Importing playlist...');
    
    try {
      const result = await duckdbManager.importPlaylist(playlist);
      
      // Clear cache after import
      this.cache.clear();
      
      console.log('[OptimizedDataService] ✅ Playlist imported successfully');
      return result;
    } catch (error) {
      console.error('[OptimizedDataService] ❌ Import failed:', error);
      throw error;
    }
  }

  // Clear cache
  clearCache() {
    this.cache.clear();
    console.log('[OptimizedDataService] 🧹 Cache cleared');
  }

  // Clear all data
  async clearAll() {
    try {
      await duckdbManager.clearAll();
      this.cache.clear();
      
      // Reset store states
      useLiveStore.getState().reset();
      useMoviesStore.getState().reset();
      useSeriesStore.getState().reset();
      
      console.log('[OptimizedDataService] 🧹 All data cleared');
    } catch (error) {
      console.error('[OptimizedDataService] ❌ Failed to clear all data:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const optimizedDataService = new OptimizedDataService();
export default optimizedDataService;