import { create } from 'zustand';
import { ingestPlaylistData } from '../duckdb/ingest.js';
import { 
  getStatistics, 
  getLiveCategories, 
  getVodCategories, 
  getSeriesCategories 
} from '../duckdb/queries.js';

const usePlaylistStore = create((set, get) => ({
  // Credentials
  baseUrl: '',
  username: '',
  password: '',

  // State
  isLoading: false,
  error: null,
  lastFetchedAt: null,
  statistics: null,
  categories: {
    live: [],
    vod: [],
    series: []
  },

  // Actions
  setCredentials: (baseUrl, username, password) => {
    set({ baseUrl, username, password });
  },

  fetchAndIngestData: async () => {
    const { baseUrl, username, password } = get();
    set({ isLoading: true, error: null });

    try {
      console.log('🌐 Fetching playlist data...');
      
      // 1. Fetch from your server
      const url = `http://localhost:8081/get?base_url=${encodeURIComponent(baseUrl)}&username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;
      const response = await fetch(url);
      const result = await response.json();

      if (!result.success) {
        throw new Error('API fetch failed');
      }

      console.log('📦 API response received, processing...');

      // 2. Ingest into DuckDB
      await ingestPlaylistData(result.data);

      console.log('🔍 Querying summary data...');

      // 3. Query summary data to update UI state
      const [stats, liveCats, vodCats, seriesCats] = await Promise.all([
        getStatistics(),
        getLiveCategories(),
        getVodCategories(),
        getSeriesCategories()
      ]);

      set({
        isLoading: false,
        lastFetchedAt: Date.now(),
        statistics: stats,
        categories: {
          live: liveCats,
          vod: vodCats,
          series: seriesCats
        }
      });

      console.log('✅ Data loading complete!');

    } catch (err) {
      console.error('❌ Fetch & Ingest Error:', err);
      set({ 
        isLoading: false, 
        error: err.message || 'Failed to load playlist data' 
      });
    }
  },

  clearError: () => {
    set({ error: null });
  },

  reset: () => {
    set({
      baseUrl: '',
      username: '',
      password: '',
      isLoading: false,
      error: null,
      lastFetchedAt: null,
      statistics: null,
      categories: {
        live: [],
        vod: [],
        series: []
      }
    });
  }
}));

export default usePlaylistStore;