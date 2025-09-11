import { create } from 'zustand';
import { subscribeWithSelector, persist } from 'zustand/middleware';
import { duckdbManager } from '@/lib/duckdb-database';

// Movies Store specialized for VOD content
export const useMoviesStore = create(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        // State
        movies: [],
        categories: [],
        loading: false,
        error: null,
        initialized: false,
        currentCategory: null,
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
            console.log('[MoviesStore] 🚀 Initializing movies store...');
            
            await duckdbManager.initialize();
            
            // Load categories
            const categories = await duckdbManager.getCategories('movies');
            const movies = await duckdbManager.getMovies({ limit: 100 });
            
            // Initialize visible categories (first 10)
            const initialVisibleCategories = new Set();
            categories.slice(0, 10).forEach(category => {
              initialVisibleCategories.add(category.name);
            });
            
            set({
              movies,
              categories,
              visibleCategories: initialVisibleCategories,
              hasMoreCategories: categories.length > 10,
              loading: false,
              initialized: true
            });

            console.log(`[MoviesStore] ✅ Initialized with ${movies.length} movies, ${categories.length} categories`);
          } catch (error) {
            console.error('[MoviesStore] ❌ Initialization failed:', error);
            set({ error: error.message, loading: false });
          }
        },

        loadMovies: async (options = {}) => {
          const state = get();
          if (state.loading) return;

          set({ loading: true, error: null });

          try {
            console.log('[MoviesStore] 🎬 Loading movies...');
            
            const movies = await duckdbManager.getMovies(options);
            
            set(prev => ({
              movies: options.offset ? [...prev.movies, ...movies] : movies,
              loading: false
            }));

            console.log(`[MoviesStore] ✅ Loaded ${movies.length} movies`);
          } catch (error) {
            console.error('[MoviesStore] ❌ Failed to load movies:', error);
            set({ error: error.message, loading: false });
          }
        },

        loadByCategory: async (category, options = {}) => {
          const state = get();
          if (state.loading) return;

          set({ loading: true, error: null, currentCategory: category });

          try {
            console.log(`[MoviesStore] 🎭 Loading movies for category: ${category}`);
            
            const movies = await duckdbManager.getMovies({ 
              category, 
              ...options 
            });
            
            set(prev => ({
              movies: options.offset ? [...prev.movies, ...movies] : movies,
              loading: false
            }));

            console.log(`[MoviesStore] ✅ Loaded ${movies.length} movies for category: ${category}`);
          } catch (error) {
            console.error('[MoviesStore] ❌ Failed to load category movies:', error);
            set({ error: error.message, loading: false });
          }
        },

        searchMovies: async (query) => {
          const state = get();
          set({ searchQuery: query, loading: true, error: null });

          try {
            console.log(`[MoviesStore] 🔍 Searching movies: ${query}`);
            
            const movies = await duckdbManager.getMovies({ 
              search: query,
              limit: 100
            });
            
            set({
              movies,
              loading: false
            });

            console.log(`[MoviesStore] ✅ Found ${movies.length} movies matching "${query}"`);
          } catch (error) {
            console.error('[MoviesStore] ❌ Search failed:', error);
            set({ error: error.message, loading: false });
          }
        },

        loadMoreCategories: async () => {
          const state = get();
          if (state.loading || !state.hasMoreCategories) return;

          try {
            console.log('[MoviesStore] 📂 Loading more categories...');
            
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

              console.log(`[MoviesStore] ✅ Loaded ${newCategories.length} more categories`);
            } else {
              set({ hasMoreCategories: false });
            }
          } catch (error) {
            console.error('[MoviesStore] ❌ Failed to load more categories:', error);
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
            movies: [],
            categories: [],
            loading: false,
            error: null,
            currentCategory: null,
            searchQuery: '',
            visibleCategories: new Set(),
            hasMoreCategories: true
          });
        },

        // Selectors
        getMoviesByCategory: (category) => {
          return get().movies.filter(movie => movie.category === category);
        },

        getFeaturedMovies: () => {
          const state = get();
          return state.movies.slice(0, 12);
        },

        getVisibleMovies: () => {
          const state = get();
          return state.movies.filter(movie => 
            state.visibleCategories.has(movie.category)
          );
        },

        getCategoriesWithCount: () => {
          const state = get();
          return state.categories.map(category => ({
            ...category,
            movies: state.movies.filter(m => m.category === category.name),
            isVisible: state.visibleCategories.has(category.name)
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
        name: 'movies-store-storage',
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