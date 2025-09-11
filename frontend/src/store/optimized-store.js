import { create } from 'zustand';
import { subscribeWithSelector, persist } from 'zustand/middleware';
import { devtools } from 'zustand/middleware';
import { 
  initializeDatabase, 
  savePlaylist, 
  loadPlaylist, 
  getAllPlaylists, 
  deletePlaylist,
  searchStreams,
  clearAllData
} from '@/lib/simple-database';
import { fetchPlaylistData } from '@/lib/proxy';

// Performance optimization: LRU cache with TTL
class LRUCache {
  constructor(maxSize = 50, ttl = 5 * 60 * 1000) {
    this.maxSize = maxSize;
    this.ttl = ttl;
    this.cache = new Map();
    this.timers = new Map();
  }

  get(key) {
    if (this.cache.has(key)) {
      const item = this.cache.get(key);
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, item);
      return item;
    }
    return undefined;
  }

  set(key, value) {
    if (this.cache.size >= this.maxSize) {
      // Remove least recently used (first item)
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
      clearTimeout(this.timers.get(firstKey));
      this.timers.delete(firstKey);
    }

    this.cache.set(key, value);
    
    // Set TTL
    const timer = setTimeout(() => {
      this.cache.delete(key);
      this.timers.delete(key);
    }, this.ttl);
    
    this.timers.set(key, timer);
  }

  clear() {
    this.cache.clear();
    this.timers.forEach(timer => clearTimeout(timer));
    this.timers.clear();
  }
}

// Global cache instance
const globalCache = new LRUCache(100, 5 * 60 * 1000);

// Optimized store with better performance patterns
export const useOptimizedStore = create(
  subscribeWithSelector(
    devtools(
      persist(
        (set, get) => ({
          // Core state
          playlists: {},
          defaultPlaylistId: null,
          isInitialized: false,
          loadingStates: {},
          error: null,
          globalLoading: false,
          failedPlaylistIds: new Set(),
          searchResults: [],
          isSearching: false,
          
          // Performance tracking
          performanceMetrics: {
            lastFetchTime: null,
            cacheHits: 0,
            cacheMisses: 0,
            averageLoadTime: 0
          },

          // Optimized selectors with caching
          getPlaylistData: (playlistId) => {
            const cacheKey = `playlist:${playlistId}`;
            const cached = globalCache.get(cacheKey);
            
            if (cached) {
              get().updateMetrics('cacheHit');
              return cached;
            }
            
            const playlist = get().playlists[playlistId];
            if (playlist) {
              globalCache.set(cacheKey, playlist);
              get().updateMetrics('cacheMiss');
            }
            
            return playlist || null;
          },

          getCategorizedStreams: (playlistId, type = 'live') => {
            const cacheKey = `categorized:${playlistId}:${type}`;
            const cached = globalCache.get(cacheKey);
            
            if (cached) {
              get().updateMetrics('cacheHit');
              return cached;
            }

            const playlist = get().getPlaylistData(playlistId);
            if (!playlist) {
              get().updateMetrics('cacheMiss');
              return [];
            }

            let result = [];
            
            // Use new categorized structure if available
            if (playlist.categorizedStreams) {
              switch (type) {
                case 'live': 
                  result = playlist.categorizedStreams.live || [];
                  break;
                case 'movies':
                case 'vod': 
                  result = playlist.categorizedStreams.vod || [];
                  break;
                case 'series': 
                  result = playlist.categorizedStreams.series || [];
                  break;
                default: 
                  result = [];
              }
            } else if (playlist.streams && playlist.categories) {
              // Fallback to old structure with optimized grouping
              const streams = playlist.streams[type === 'movies' ? 'vod' : type] || [];
              const categories = playlist.categories[type === 'movies' ? 'vod' : type] || [];
              
              const categoryMap = new Map();
              categories.forEach(cat => {
                categoryMap.set(cat.category_id, {
                  categoryId: cat.category_id,
                  categoryName: cat.category_name,
                  streams: [],
                  streamCount: 0
                });
              });

              categoryMap.set('uncategorized', {
                categoryId: 'uncategorized',
                categoryName: 'Uncategorized',
                streams: [],
                streamCount: 0
              });

              streams.forEach(stream => {
                const categoryId = stream.category_id || 'uncategorized';
                const category = categoryMap.get(categoryId);
                if (category) {
                  category.streams.push(stream);
                  category.streamCount++;
                }
              });

              result = Array.from(categoryMap.values()).filter(cat => cat.streamCount > 0);
            }

            globalCache.set(cacheKey, result);
            get().updateMetrics('cacheMiss');
            return result;
          },

          getPlaylistCounts: (playlistId) => {
            const cacheKey = `counts:${playlistId}`;
            const cached = globalCache.get(cacheKey);
            
            if (cached) {
              get().updateMetrics('cacheHit');
              return cached;
            }

            const playlist = get().getPlaylistData(playlistId);
            if (!playlist) {
              get().updateMetrics('cacheMiss');
              return null;
            }

            const stats = playlist.statistics;
            const counts = stats ? {
              totalLive: stats.totalLive || 0,
              totalVod: stats.totalVod || 0,
              totalSeries: stats.totalSeries || 0,
              totalChannels: stats.totalItems || 0,
              lastUpdated: playlist.fetchedAt || Date.now()
            } : null;

            if (counts) {
              globalCache.set(cacheKey, counts);
            }
            
            get().updateMetrics('cacheMiss');
            return counts;
          },

          // Performance metrics tracking
          updateMetrics: (type) => {
            set(state => ({
              performanceMetrics: {
                ...state.performanceMetrics,
                cacheHits: type === 'cacheHit' ? state.performanceMetrics.cacheHits + 1 : state.performanceMetrics.cacheHits,
                cacheMisses: type === 'cacheMiss' ? state.performanceMetrics.cacheMisses + 1 : state.performanceMetrics.cacheMisses
              }
            }));
          },

          // Optimized actions
          initializeStore: async () => {
            const state = get();
            if (state.isInitialized) return;

            set({ globalLoading: true, error: null });
            const startTime = performance.now();

            try {
              await initializeDatabase();
              const playlists = await getAllPlaylists();
              
              const playlistMap = {};
              playlists.forEach(playlist => {
                playlistMap[playlist.id] = playlist;
              });

              set({
                playlists: playlistMap,
                isInitialized: true,
                globalLoading: false,
                performanceMetrics: {
                  ...state.performanceMetrics,
                  lastFetchTime: performance.now() - startTime
                }
              });
            } catch (error) {
              set({
                error: error.message || 'Failed to initialize store',
                globalLoading: false
              });
            }
          },

          loadPlaylistData: async (playlistConfig) => {
            const { baseUrl, username, password, name } = playlistConfig;
            const playlistId = `${baseUrl}|${username}`;

            // Check cache first
            const cached = get().getPlaylistData(playlistId);
            if (cached && Date.now() - cached._meta?.loadedAt < 10 * 60 * 1000) {
              return { success: true, data: cached, cached: true };
            }

            set(state => ({
              loadingStates: { ...state.loadingStates, [playlistId]: 'loading' },
              error: null
            }));

            const startTime = performance.now();

            try {
              const proxyData = await fetchPlaylistData({ baseUrl, username, password });

              const enrichedData = {
                ...proxyData,
                _meta: {
                  name: name || '',
                  baseUrl,
                  username,
                  password,
                  loadedAt: Date.now()
                }
              };

              await savePlaylist(playlistId, enrichedData);

              set(state => ({
                playlists: {
                  ...state.playlists,
                  [playlistId]: enrichedData
                },
                loadingStates: { ...state.loadingStates, [playlistId]: 'success' },
                performanceMetrics: {
                  ...state.performanceMetrics,
                  lastFetchTime: performance.now() - startTime
                }
              }));

              // Clear related cache
              globalCache.clear();

              return { success: true, data: enrichedData };
            } catch (error) {
              set(state => ({
                loadingStates: { ...state.loadingStates, [playlistId]: 'error' },
                error: error.message || 'Failed to load playlist'
              }));

              return {
                success: false,
                message: error.message || 'Failed to load playlist',
                error
              };
            }
          },

          searchContent: async (query, filters = {}) => {
            if (!query || query.trim().length < 2) {
              set({ searchResults: [], isSearching: false });
              return [];
            }

            set({ isSearching: true, searchResults: [] });

            try {
              const results = await searchStreams(query, filters);
              
              set({ 
                searchResults: results,
                isSearching: false 
              });

              return results;
            } catch (error) {
              set({ 
                searchResults: [],
                isSearching: false,
                error: error.message || 'Search failed'
              });
              return [];
            }
          },

          // Utility actions
          clearError: () => set(state => ({ ...state, error: null })),
          clearSearchResults: () => set(state => ({ ...state, searchResults: [] })),
          clearCache: () => {
            globalCache.clear();
            set(state => ({
              performanceMetrics: {
                ...state.performanceMetrics,
                cacheHits: 0,
                cacheMisses: 0
              }
            }));
          },
          setDefaultPlaylist: (playlistId) => {
            set(state => ({ ...state, defaultPlaylistId: playlistId }));
          }
        }),
        {
          name: 'optimized-playlist-store',
          partialize: (state) => ({
            defaultPlaylistId: state.defaultPlaylistId,
            failedPlaylistIds: Array.from(state.failedPlaylistIds),
            performanceMetrics: state.performanceMetrics
          })
        }
      ),
      { name: 'optimized-playlist-store' }
    )
  )
);

// Auto-initialize with better error handling
if (typeof window !== 'undefined') {
  // Initialize store when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      useOptimizedStore.getState().initializeStore();
    });
  } else {
    useOptimizedStore.getState().initializeStore();
  }
}