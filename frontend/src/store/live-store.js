import { create } from 'zustand';
import { subscribeWithSelector, persist } from 'zustand/middleware';
import { duckdbManager } from '@/lib/duckdb-database';

// Live Store specialized for live channels
export const useLiveStore = create(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        // State
        channels: [],
        categories: [],
        loading: false,
        error: null,
        initialized: false,
        currentCategory: null,
        searchQuery: '',
        performanceMode: false,

        // Actions
        initialize: async () => {
          const state = get();
          if (state.initialized || state.loading) return;

          set({ loading: true, error: null });

          try {
            console.log('[LiveStore] 🚀 Initializing live store...');
            
            await duckdbManager.initialize();
            
            // Load categories
            const categories = await duckdbManager.getCategories('live');
            const channels = await duckdbManager.getLiveChannels({ limit: 50 });
            
            set({
              channels,
              categories,
              loading: false,
              initialized: true
            });

            console.log(`[LiveStore] ✅ Initialized with ${channels.length} channels, ${categories.length} categories`);
          } catch (error) {
            console.error('[LiveStore] ❌ Initialization failed:', error);
            set({ error: error.message, loading: false });
          }
        },

        loadChannels: async (options = {}) => {
          const state = get();
          if (state.loading) return;

          set({ loading: true, error: null });

          try {
            console.log('[LiveStore] 📡 Loading channels...');
            
            const channels = await duckdbManager.getLiveChannels(options);
            
            set(prev => ({
              channels: options.offset ? [...prev.channels, ...channels] : channels,
              loading: false
            }));

            console.log(`[LiveStore] ✅ Loaded ${channels.length} channels`);
          } catch (error) {
            console.error('[LiveStore] ❌ Failed to load channels:', error);
            set({ error: error.message, loading: false });
          }
        },

        loadByCategory: async (category, options = {}) => {
          const state = get();
          if (state.loading) return;

          set({ loading: true, error: null, currentCategory: category });

          try {
            console.log(`[LiveStore] 📺 Loading channels for category: ${category}`);
            
            const channels = await duckdbManager.getLiveChannels({ 
              category, 
              ...options 
            });
            
            set(prev => ({
              channels: options.offset ? [...prev.channels, ...channels] : channels,
              loading: false
            }));

            console.log(`[LiveStore] ✅ Loaded ${channels.length} channels for category: ${category}`);
          } catch (error) {
            console.error('[LiveStore] ❌ Failed to load category channels:', error);
            set({ error: error.message, loading: false });
          }
        },

        searchChannels: async (query) => {
          const state = get();
          set({ searchQuery: query, loading: true, error: null });

          try {
            console.log(`[LiveStore] 🔍 Searching channels: ${query}`);
            
            const channels = await duckdbManager.getLiveChannels({ 
              search: query,
              limit: 100
            });
            
            set({
              channels,
              loading: false
            });

            console.log(`[LiveStore] ✅ Found ${channels.length} channels matching "${query}"`);
          } catch (error) {
            console.error('[LiveStore] ❌ Search failed:', error);
            set({ error: error.message, loading: false });
          }
        },

        setSearchQuery: (query) => {
          set({ searchQuery: query });
        },

        setPerformanceMode: (enabled) => {
          set({ performanceMode: enabled });
        },

        clearError: () => {
          set({ error: null });
        },

        reset: () => {
          set({
            channels: [],
            categories: [],
            loading: false,
            error: null,
            currentCategory: null,
            searchQuery: ''
          });
        },

        // Selectors
        getChannelsByCategory: (category) => {
          return get().channels.filter(channel => channel.category === category);
        },

        getFeaturedChannels: () => {
          const state = get();
          return state.channels.slice(0, 12);
        },

        getCategoriesWithCount: () => {
          const state = get();
          return state.categories.map(category => ({
            ...category,
            channels: state.channels.filter(c => c.category === category.name)
          }));
        },

        hasError: () => {
          return !!get().error;
        },

        isLoading: () => {
          return get().loading;
        }
      }),
      {
        name: 'live-store-storage',
        partialize: (state) => ({
          initialized: state.initialized,
          performanceMode: state.performanceMode,
          searchQuery: state.searchQuery
        })
      }
    )
  )
);