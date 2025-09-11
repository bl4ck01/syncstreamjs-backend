import { create } from 'zustand';
import { subscribeWithSelector, persist } from 'zustand/middleware';
import { duckdbManager } from '@/lib/duckdb-database';

// Series Store specialized for series content
export const useSeriesStore = create(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        // State
        series: [],
        categories: [],
        episodes: [],
        loading: false,
        error: null,
        initialized: false,
        currentCategory: null,
        currentSeries: null,
        searchQuery: '',
        performanceMode: false,
        visibleCategories: new Set(),
        hasMoreCategories: true,

        // Actions
        initialize: async () => {
          const state = get();
          if (state.initialized || state.loading) return;

          set({ loading: true, error: null });

          try {
            console.log('[SeriesStore] 🚀 Initializing series store...');
            
            await duckdbManager.initialize();
            
            // Load categories
            const categories = await duckdbManager.getCategories('series');
            const series = await duckdbManager.getSeries({ limit: 100 });
            
            // Initialize visible categories (first 10)
            const initialVisibleCategories = new Set();
            categories.slice(0, 10).forEach(category => {
              initialVisibleCategories.add(category.name);
            });
            
            set({
              series,
              categories,
              visibleCategories: initialVisibleCategories,
              hasMoreCategories: categories.length > 10,
              loading: false,
              initialized: true
            });

            console.log(`[SeriesStore] ✅ Initialized with ${series.length} series, ${categories.length} categories`);
          } catch (error) {
            console.error('[SeriesStore] ❌ Initialization failed:', error);
            set({ error: error.message, loading: false });
          }
        },

        loadSeries: async (options = {}) => {
          const state = get();
          if (state.loading) return;

          set({ loading: true, error: null });

          try {
            console.log('[SeriesStore] 📺 Loading series...');
            
            const series = await duckdbManager.getSeries(options);
            
            set(prev => ({
              series: options.offset ? [...prev.series, ...series] : series,
              loading: false
            }));

            console.log(`[SeriesStore] ✅ Loaded ${series.length} series`);
          } catch (error) {
            console.error('[SeriesStore] ❌ Failed to load series:', error);
            set({ error: error.message, loading: false });
          }
        },

        loadByCategory: async (category, options = {}) => {
          const state = get();
          if (state.loading) return;

          set({ loading: true, error: null, currentCategory: category });

          try {
            console.log(`[SeriesStore] 🎭 Loading series for category: ${category}`);
            
            const series = await duckdbManager.getSeries({ 
              category, 
              ...options 
            });
            
            set(prev => ({
              series: options.offset ? [...prev.series, ...series] : series,
              loading: false
            }));

            console.log(`[SeriesStore] ✅ Loaded ${series.length} series for category: ${category}`);
          } catch (error) {
            console.error('[SeriesStore] ❌ Failed to load category series:', error);
            set({ error: error.message, loading: false });
          }
        },

        loadEpisodes: async (seriesId, options = {}) => {
          const state = get();
          if (state.loading) return;

          set({ loading: true, error: null, currentSeries: seriesId });

          try {
            console.log(`[SeriesStore] 🎬 Loading episodes for series: ${seriesId}`);
            
            // This would need to be implemented in the SQL database
            // For now, we'll filter the series data
            const episodes = state.series.filter(s => 
              s.seriesId === seriesId || s.name?.includes(seriesId)
            );
            
            set({
              episodes,
              loading: false
            });

            console.log(`[SeriesStore] ✅ Loaded ${episodes.length} episodes`);
          } catch (error) {
            console.error('[SeriesStore] ❌ Failed to load episodes:', error);
            set({ error: error.message, loading: false });
          }
        },

        searchSeries: async (query) => {
          const state = get();
          set({ searchQuery: query, loading: true, error: null });

          try {
            console.log(`[SeriesStore] 🔍 Searching series: ${query}`);
            
            const series = await duckdbManager.getSeries({ 
              search: query,
              limit: 100
            });
            
            set({
              series,
              loading: false
            });

            console.log(`[SeriesStore] ✅ Found ${series.length} series matching "${query}"`);
          } catch (error) {
            console.error('[SeriesStore] ❌ Search failed:', error);
            set({ error: error.message, loading: false });
          }
        },

        loadMoreCategories: async () => {
          const state = get();
          if (state.loading || !state.hasMoreCategories) return;

          try {
            console.log('[SeriesStore] 📂 Loading more categories...');
            
            const currentVisibleCount = state.visibleCategories.size;
            const categoriesToLoad = 5; // Load 5 more categories
            const newCategories = state.categories.slice(
              currentVisibleCount, 
              currentVisibleCount + categoriesToLoad
            );

            if (newCategories.length > 0) {
              const newVisibleCategories = new Set(state.visibleCategories);
              newCategories.forEach(category => {
                newVisibleCategories.add(category.name);
              });

              set(prev => ({
                visibleCategories: newVisibleCategories,
                hasMoreCategories: currentVisibleCount + categoriesToLoad < prev.categories.length
              }));

              console.log(`[SeriesStore] ✅ Loaded ${newCategories.length} more categories`);
            } else {
              set({ hasMoreCategories: false });
            }
          } catch (error) {
            console.error('[SeriesStore] ❌ Failed to load more categories:', error);
            set({ error: error.message });
          }
        },

        setVisibleCategories: (categories) => {
          set({ visibleCategories: new Set(categories) });
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
            series: [],
            categories: [],
            episodes: [],
            loading: false,
            error: null,
            currentCategory: null,
            currentSeries: null,
            searchQuery: '',
            visibleCategories: new Set(),
            hasMoreCategories: true
          });
        },

        // Selectors
        getSeriesByCategory: (category) => {
          return get().series.filter(serie => serie.category === category);
        },

        getFeaturedSeries: () => {
          const state = get();
          return state.series.slice(0, 12);
        },

        getVisibleSeries: () => {
          const state = get();
          return state.series.filter(serie => 
            state.visibleCategories.has(serie.category)
          );
        },

        getCategoriesWithCount: () => {
          const state = get();
          return state.categories.map(category => ({
            ...category,
            series: state.series.filter(s => s.category === category.name),
            isVisible: state.visibleCategories.has(category.name)
          }));
        },

        getSeriesById: (id) => {
          return get().series.find(serie => serie.id === id);
        },

        getEpisodesBySeries: (seriesId) => {
          return get().episodes.filter(episode => episode.seriesId === seriesId);
        },

        hasError: () => {
          return !!get().error;
        },

        isLoading: () => {
          return get().loading;
        }
      }),
      {
        name: 'series-store-storage',
        partialize: (state) => ({
          initialized: state.initialized,
          performanceMode: state.performanceMode,
          searchQuery: state.searchQuery,
          visibleCategories: Array.from(state.visibleCategories)
        })
      }
    )
  )
);