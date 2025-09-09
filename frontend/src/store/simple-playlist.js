import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
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

// Simplified playlist store without complex dependencies
export const useSimplePlaylistStore = create(
  subscribeWithSelector((set, get) => ({
    // State
    playlists: {},
    defaultPlaylistId: null,
    isInitialized: false,
    loadingStates: {},
    error: null,
    globalLoading: false,
    failedPlaylistIds: new Set(),
    searchResults: [],
    isSearching: false,
    
    // Selectors
    hasPlaylistData: (playlistId) => {
      const playlist = get().playlists[playlistId];
      return !!(
        playlist?.categorizedStreams?.live?.length || 
        playlist?.categorizedStreams?.vod?.length || 
        playlist?.categorizedStreams?.series?.length ||
        playlist?.streams?.live || 
        playlist?.streams?.vod || 
        playlist?.streams?.series
      );
    },

    getPlaylistData: (playlistId) => {
      return get().playlists[playlistId] || null;
    },

    getCategorizedStreams: (playlistId, type = 'live') => {
      const playlist = get().playlists[playlistId];
      if (!playlist) return [];

      console.log('[SimplePlaylistStore] 📂 Getting categorized streams:', {
        playlistId,
        type,
        hasCategorizedStreams: !!playlist.categorizedStreams,
        categorizedStreamsKeys: playlist.categorizedStreams ? Object.keys(playlist.categorizedStreams) : [],
        hasStreams: !!playlist.streams,
        hasCategories: !!playlist.categories
      });

      // Use new categorized structure if available
      if (playlist.categorizedStreams) {
        let result;
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
        
        console.log('[SimplePlaylistStore] 📋 Found categorized streams:', {
          type,
          resultLength: result.length,
          firstResult: result[0]
        });
        
        return result;
      }

      // Fallback to old structure
      if (playlist.streams && playlist.categories) {
        const streams = playlist.streams[type === 'movies' ? 'vod' : type] || [];
        const categories = playlist.categories[type === 'movies' ? 'vod' : type] || [];
        
        console.log('[SimplePlaylistStore] 🔄 Using fallback structure:', {
          type,
          streamsCount: streams.length,
          categoriesCount: categories.length
        });
        
        // Group streams by category
        const categoryMap = {};
        categories.forEach(cat => {
          categoryMap[cat.category_id] = {
            categoryId: cat.category_id,
            categoryName: cat.category_name,
            streams: [],
            streamCount: 0
          };
        });

        categoryMap['uncategorized'] = {
          categoryId: 'uncategorized',
          categoryName: 'Uncategorized',
          streams: [],
          streamCount: 0
        };

        streams.forEach(stream => {
          const categoryId = stream.category_id || 'uncategorized';
          if (categoryMap[categoryId]) {
            categoryMap[categoryId].streams.push(stream);
            categoryMap[categoryId].streamCount++;
          } else {
            categoryMap['uncategorized'].streams.push(stream);
            categoryMap['uncategorized'].streamCount++;
          }
        });

        return Object.values(categoryMap).filter(cat => cat.streamCount > 0);
      }

      return [];
    },

    getPlaylistCounts: (playlistId) => {
      const playlist = get().playlists[playlistId];
      if (!playlist) return null;

      const stats = playlist.statistics;
      if (stats) {
        return {
          totalLive: stats.totalLive || 0,
          totalVod: stats.totalVod || 0,
          totalSeries: stats.totalSeries || 0,
          totalChannels: stats.totalItems || 0,
          liveCategories: playlist.categories?.live || [],
          vodCategories: playlist.categories?.vod || [],
          seriesCategories: playlist.categories?.series || [],
          lastUpdated: playlist.fetchedAt || Date.now()
        };
      }

      return null;
    },

    isPlaylistLoading: (playlistId) => {
      return get().loadingStates[playlistId] === 'loading';
    },

    getAllPlaylistsCounts: () => {
      const playlists = get().playlists;
      let totalLive = 0, totalVod = 0, totalSeries = 0;
      const allLiveCategories = new Set();
      const allVodCategories = new Set();
      const allSeriesCategories = new Set();

      Object.values(playlists).forEach(playlist => {
        if (playlist.statistics) {
          totalLive += playlist.statistics.totalLive || 0;
          totalVod += playlist.statistics.totalVod || 0;
          totalSeries += playlist.statistics.totalSeries || 0;
        }

        playlist.categories?.live?.forEach(cat => allLiveCategories.add(cat.category_name));
        playlist.categories?.vod?.forEach(cat => allVodCategories.add(cat.category_name));
        playlist.categories?.series?.forEach(cat => allSeriesCategories.add(cat.category_name));
      });

      return {
        totalLive,
        totalVod,
        totalSeries,
        totalChannels: totalLive + totalVod + totalSeries,
        playlistCount: Object.keys(playlists).length,
        allCategories: {
          live: Array.from(allLiveCategories),
          vod: Array.from(allVodCategories),
          series: Array.from(allSeriesCategories)
        }
      };
    },

    // Actions
    initializeStore: async () => {
      console.log('[SimplePlaylistStore] 🎯 initializeStore called');
      const state = get();
      console.log('[SimplePlaylistStore] 📊 Current state:', {
        isInitialized: state.isInitialized,
        globalLoading: state.globalLoading,
        playlistCount: Object.keys(state.playlists).length
      });
      
      if (state.isInitialized) {
        console.log('[SimplePlaylistStore] ⏭️ Store already initialized, skipping');
        return;
      }

      console.log('[SimplePlaylistStore] 🚀 Starting initialization...');
      set({ globalLoading: true, error: null });

      try {
        console.log('[SimplePlaylistStore] 🗄️ Initializing database...');
        await initializeDatabase();
        console.log('[SimplePlaylistStore] ✅ Database initialized');
        
        console.log('[SimplePlaylistStore] 📂 Loading playlists from database...');
        const playlists = await getAllPlaylists();
        console.log(`[SimplePlaylistStore] 📋 Found ${playlists.length} playlists in database`);
        
        const playlistMap = {};
        
        for (const playlist of playlists) {
          console.log(`[SimplePlaylistStore] 📺 Loading playlist: ${playlist.id}`);
          playlistMap[playlist.id] = playlist;
        }

        console.log('[SimplePlaylistStore] 💾 Updating store state...');
        set({
          playlists: playlistMap,
          isInitialized: true,
          globalLoading: false
        });

        console.log(`[SimplePlaylistStore] ✅ Store initialized with ${Object.keys(playlistMap).length} playlists`);
      } catch (error) {
        console.error('[SimplePlaylistStore] ❌ Failed to initialize:', error);
        set({
          error: error.message || 'Failed to initialize store',
          globalLoading: false
        });
      }
    },

    loadPlaylistData: async (playlistConfig) => {
      const { baseUrl, username, password, name } = playlistConfig;

      if (!baseUrl || !username || !password) {
        const error = 'Missing required playlist configuration';
        set({ error });
        return { success: false, message: error };
      }

      const playlistId = `${baseUrl}|${username}`;

      // Set loading state
      set(state => ({
        loadingStates: { ...state.loadingStates, [playlistId]: 'loading' },
        error: null
      }));

      try {
        console.log(`[SimplePlaylistStore] Loading: ${name || playlistId}`);

        // Fetch data from proxy
        const proxyData = await fetchPlaylistData({ baseUrl, username, password });

        if (!proxyData) {
          throw new Error('No data received from proxy');
        }

        // Enrich data with metadata
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

        // Save to database
        await savePlaylist(playlistId, enrichedData);

        // Update store
        set(state => ({
          playlists: {
            ...state.playlists,
            [playlistId]: enrichedData
          },
          loadingStates: { ...state.loadingStates, [playlistId]: 'success' }
        }));

        const counts = proxyData.statistics ? {
          totalLive: proxyData.statistics.totalLive || 0,
          totalVod: proxyData.statistics.totalVod || 0,
          totalSeries: proxyData.statistics.totalSeries || 0,
          totalItems: proxyData.statistics.totalItems || 0
        } : {
          totalLive: proxyData.streams?.live?.length || 0,
          totalVod: proxyData.streams?.vod?.length || 0,
          totalSeries: proxyData.streams?.series?.length || 0,
          totalItems: (proxyData.streams?.live?.length || 0) + 
                     (proxyData.streams?.vod?.length || 0) + 
                     (proxyData.streams?.series?.length || 0)
        };

        console.log(`[SimplePlaylistStore] Success: Live: ${counts.totalLive}, VOD: ${counts.totalVod}, Series: ${counts.totalSeries}`);

        return { success: true, data: enrichedData, counts };
      } catch (error) {
        console.error('[SimplePlaylistStore] Error:', error);

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

    loadDefaultPlaylist: async () => {
      console.log('[SimplePlaylistStore] 🎯 loadDefaultPlaylist called');
      set({ globalLoading: true, error: null });

      try {
        const { getCurrentProfileWithPlaylist } = await import('@/server/playlist-actions');
        const profileResult = await getCurrentProfileWithPlaylist();

        if (!profileResult.success || !profileResult.data) {
          throw new Error('Unable to load current profile');
        }

        const profile = profileResult.data;
        const defaultPlaylistId = profile.default_playlist_id;

        set(state => ({ ...state, defaultPlaylistId }));

        if (!defaultPlaylistId) {
          set({ globalLoading: false });
          return { success: true, message: 'No default playlist set' };
        }

        // Check if already failed
        if (get().failedPlaylistIds.has(defaultPlaylistId)) {
          set({ globalLoading: false });
          return { 
            success: true, 
            message: 'Default playlist is not accessible. Please select a playlist manually.',
            noPlaylist: true
          };
        }

        // Get playlist details
        console.log('[SimplePlaylistStore] Fetching playlist details for ID:', defaultPlaylistId);
        const { getPlaylistAction } = await import('@/server/playlist-actions');
        const playlistResult = await getPlaylistAction(defaultPlaylistId);

        if (!playlistResult.success || !playlistResult.data) {
          // Add to failed playlist IDs
          set(state => {
            const newFailedIds = new Set(state.failedPlaylistIds);
            newFailedIds.add(defaultPlaylistId);
            return { 
              ...state,
              globalLoading: false,
              failedPlaylistIds: newFailedIds,
              defaultPlaylistId: null
            };
          });

          return { 
            success: true, 
            message: `Default playlist is not accessible: ${playlistResult.message || 'Unknown error'}`,
            noPlaylist: true
          };
        }

        const playlist = playlistResult.data;
        
        // Validate playlist data structure
        if (!playlist || !playlist.url || !playlist.username) {
          console.error('[SimplePlaylistStore] ❌ Invalid playlist data structure:', playlist);
          set({ globalLoading: false });
          return { 
            success: true, 
            message: 'Invalid playlist data. Please check your playlist configuration.',
            noPlaylist: true
          };
        }

        const playlistStoreId = `${playlist.url}|${playlist.username}`;

        // Check if already cached
        const existingPlaylist = get().playlists[playlistStoreId];
        if (existingPlaylist) {
          set({ globalLoading: false });
          return {
            success: true,
            data: existingPlaylist,
            cached: true
          };
        }

        // Load fresh data
        console.log('[SimplePlaylistStore] Loading fresh data');
        const result = await get().loadPlaylistData({
          baseUrl: playlist.url,
          username: playlist.username,
          password: playlist.password,
          name: playlist.name
        });

        set({ globalLoading: false });
        return result;

      } catch (error) {
        console.error('[SimplePlaylistStore] Error loading default:', error);
        set({
          globalLoading: false,
          error: error.message || 'Failed to load default playlist'
        });

        return {
          success: false,
          message: error.message || 'Failed to load default playlist'
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

        console.log(`[SimplePlaylistStore] 🔍 Search completed: ${results.length} results for "${query}"`);
        return results;
      } catch (error) {
        console.error('[SimplePlaylistStore] Search error:', error);
        set({ 
          searchResults: [],
          isSearching: false,
          error: error.message || 'Search failed'
        });
        return [];
      }
    },

    refreshPlaylistData: async (playlistId) => {
      const playlist = get().playlists[playlistId];
      if (!playlist?._meta) {
        return { success: false, message: 'Playlist not found' };
      }

      console.log(`[SimplePlaylistStore] Refreshing: ${playlist._meta.name}`);
      return get().loadPlaylistData(playlist._meta);
    },

    removePlaylist: async (playlistId) => {
      console.log(`[SimplePlaylistStore] Removing: ${playlistId}`);

      try {
        // Remove from database
        await deletePlaylist(playlistId);
        
        // Update store
        set(state => {
          const { [playlistId]: removed, ...remainingPlaylists } = state.playlists;
          const { [playlistId]: removedLoading, ...remainingLoading } = state.loadingStates;

          return {
            ...state,
            playlists: remainingPlaylists,
            loadingStates: remainingLoading,
            defaultPlaylistId: state.defaultPlaylistId === playlistId ? null : state.defaultPlaylistId
          };
        });

        return true;
      } catch (error) {
        console.error('[SimplePlaylistStore] Error removing playlist:', error);
        return false;
      }
    },

    setDefaultPlaylist: (playlistId) => {
      set(state => ({ ...state, defaultPlaylistId: playlistId }));
    },

    clearAllData: async () => {
      try {
        await clearAllData();
        set({
          playlists: {},
          loadingStates: {},
          defaultPlaylistId: null,
          error: null,
          globalLoading: false,
          failedPlaylistIds: new Set(),
          searchResults: []
        });
        return true;
      } catch (error) {
        console.error('[SimplePlaylistStore] Error clearing data:', error);
        return false;
      }
    },

    clearError: () => set(state => ({ ...state, error: null })),
    clearSearchResults: () => set(state => ({ ...state, searchResults: [] })),
    clearFailedPlaylistCache: () => {
      set(state => ({ ...state, failedPlaylistIds: new Set() }));
    }
  }))
);

// Auto-initialize store
if (typeof window !== 'undefined') {
  console.log('[SimplePlaylistStore] 🚀 Auto-initializing store on window load');
  useSimplePlaylistStore.getState().initializeStore();
}