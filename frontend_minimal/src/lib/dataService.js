import { getCategoriesByType, countStreams, getCategoriesByTypeFallback, countStreamsFallback } from '../duckdb/queries';
import { isDuckDBAvailable, getInMemoryStreams } from '../duckdb/duckdbManager';
import { fetchPlaylistDataClient, checkProxyAvailability } from './proxyClient';
import { processPlaylistData, extractCategories } from './playlistProcessor';

// Cache state management
const CACHE_KEY = 'duckstream-cache';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// Get cache state from localStorage
function getCacheState() {
  try {
    const cacheData = localStorage.getItem(CACHE_KEY);
    if (!cacheData) return null;
    
    const parsed = JSON.parse(cacheData);
    return parsed;
  } catch (error) {
    console.warn('Error reading cache state from localStorage:', error);
    return null;
  }
}

// Save cache state to localStorage
function saveCacheState(playlistId) {
  try {
    const cacheData = {
      playlistId,
      timestamp: Date.now()
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
  } catch (error) {
    console.warn('Error saving cache state to localStorage:', error);
  }
}

// Clear cache state
export function clearCache() {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch (error) {
    console.warn('Error clearing cache state:', error);
  }
}

// Check if we have valid cached data for this playlist
export async function hasValidCache(playlistId) {
  console.log('🔍 Checking cache validity for playlist:', playlistId);
  
  const cacheState = getCacheState();
  if (!cacheState) {
    console.log('❌ No cache state found');
    return false;
  }
  
  // Check if cached playlist matches current playlist
  if (cacheState.playlistId !== playlistId) {
    console.log('❌ Cached playlist mismatch:', cacheState.playlistId, '!==', playlistId);
    return false;
  }
  
  // Check if cache is expired
  if (cacheState.timestamp && (Date.now() - cacheState.timestamp) > CACHE_DURATION) {
    console.log('❌ Cache expired:', new Date(cacheState.timestamp).toLocaleString());
    return false;
  }
  
  console.log('✅ Cache metadata valid, checking data availability...');
  
  // Check if we have actual streams data in DuckDB or memory
  try {
    const dbAvailable = await isDuckDBAvailable();
    if (dbAvailable) {
      console.log('📊 Checking DuckDB for cached streams...');
      
      // Get categories for all types
      const [liveCategories, movieCategories, seriesCategories] = await Promise.all([
        getCategoriesByType('live', 0, 5),
        getCategoriesByType('movie', 0, 5), 
        getCategoriesByType('series', 0, 5)
      ]);
      
      const totalCategories = liveCategories.length + movieCategories.length + seriesCategories.length;
      console.log('📊 Total categories found:', totalCategories);
      
      if (totalCategories === 0) {
        console.log('❌ No categories found in DuckDB');
        return false;
      }
      
      // Check a few categories to see if they have streams
      let totalStreams = 0;
      const categoriesToCheck = [
        ...liveCategories.slice(0, 2),
        ...movieCategories.slice(0, 2), 
        ...seriesCategories.slice(0, 2)
      ];
      
      for (const category of categoriesToCheck) {
        const type = category.category_id.includes('live') || category.category_name.toLowerCase().includes('live') ? 'live' :
                    category.category_id.includes('movie') || category.category_name.toLowerCase().includes('movie') ? 'movie' :
                    category.category_id.includes('series') || category.category_name.toLowerCase().includes('series') ? 'series' :
                    'live'; // fallback
        
        try {
          const count = await countStreams(type, category.category_id);
          totalStreams += count;
          console.log(`📊 ${type} - ${category.category_name}: ${count} streams`);
        } catch (error) {
          console.warn(`❌ Error counting streams for ${category.category_name}:`, error);
        }
      }
      
      // If we have at least some streams, consider cache valid
      const hasData = totalStreams > 100; // Reasonable minimum threshold
      console.log('📊 Sampled streams count:', totalStreams, '- cache valid:', hasData);
      return hasData;
    } else {
      // Check in-memory fallback
      console.log('💾 Checking in-memory for cached streams...');
      const streams = getInMemoryStreams();
      const hasData = streams.length > 1000; // Reasonable threshold
      console.log('💾 In-memory streams found:', streams.length, '- cache valid:', hasData);
      return hasData;
    }
  } catch (error) {
    console.warn('❌ Error checking cache validity:', error);
    return false;
  }
}

// Load categories from cache (DuckDB or in-memory)
export async function loadCachedCategories() {
  try {
    const dbAvailable = await isDuckDBAvailable();
    
    if (dbAvailable) {
      // Load from DuckDB
      const [liveCategories, movieCategories, seriesCategories] = await Promise.all([
        getCategoriesByType('live', 0, 100),
        getCategoriesByType('movie', 0, 100),
        getCategoriesByType('series', 0, 100)
      ]);
      
      return {
        live: liveCategories,
        movie: movieCategories,
        series: seriesCategories
      };
    } else {
      // Load from in-memory fallback
      const streams = getInMemoryStreams();
      const liveCategories = [...new Map(
        streams
          .filter(s => s.type === 'live')
          .map(s => [s.category_id, { category_id: s.category_id, category_name: s.category_name }])
      ).values()].sort((a, b) => a.category_name.localeCompare(b.category_name));
      
      const movieCategories = [...new Map(
        streams
          .filter(s => s.type === 'movie')
          .map(s => [s.category_id, { category_id: s.category_id, category_name: s.category_name }])
      ).values()].sort((a, b) => a.category_name.localeCompare(b.category_name));
      
      const seriesCategories = [...new Map(
        streams
          .filter(s => s.type === 'series')
          .map(s => [s.category_id, { category_id: s.category_id, category_name: s.category_name }])
      ).values()].sort((a, b) => a.category_name.localeCompare(b.category_name));
      
      return {
        live: liveCategories,
        movie: movieCategories,
        series: seriesCategories
      };
    }
  } catch (error) {
    console.error('Error loading cached categories:', error);
    return { live: [], movie: [], series: [] };
  }
}

// Get stream counts from cache
export async function getCachedStreamCounts() {
  try {
    const dbAvailable = await isDuckDBAvailable();
    
    if (dbAvailable) {
      // Get all categories for each type
      const [liveCategories, movieCategories, seriesCategories] = await Promise.all([
        getCategoriesByType('live', 0, 100),
        getCategoriesByType('movie', 0, 100),
        getCategoriesByType('series', 0, 100)
      ]);
      
      let liveCount = 0;
      let movieCount = 0;
      let seriesCount = 0;
      
      // Count all live streams across all categories
      for (const category of liveCategories) {
        liveCount += await countStreams('live', category.category_id);
      }
      
      // Count all movie streams across all categories
      for (const category of movieCategories) {
        movieCount += await countStreams('movie', category.category_id);
      }
      
      // Count all series streams across all categories
      for (const category of seriesCategories) {
        seriesCount += await countStreams('series', category.category_id);
      }
      
      console.log('📊 Cached stream counts - Live:', liveCount, 'Movies:', movieCount, 'Series:', seriesCount);
      
      return { liveCount, movieCount, seriesCount };
    } else {
      // Count from in-memory fallback
      const streams = getInMemoryStreams();
      return {
        liveCount: streams.filter(s => s.type === 'live').length,
        movieCount: streams.filter(s => s.type === 'movie').length,
        seriesCount: streams.filter(s => s.type === 'series').length
      };
    }
  } catch (error) {
    console.error('Error getting cached stream counts:', error);
    return { liveCount: 0, movieCount: 0, seriesCount: 0 };
  }
}

// Main data loading function with DuckDB-first approach
export async function loadPlaylistData(playlistData, forceRefresh = false) {
  try {
    const { id: playlistId, url, username, password } = playlistData;
    
    // Check if we have valid cached data and no forced refresh
    if (!forceRefresh) {
      const hasCache = await hasValidCache(playlistId);
      if (hasCache) {
        console.log('✅ Using cached data for playlist:', playlistData.name);
        
        // Load categories from cache
        const categories = await loadCachedCategories();
        const counts = await getCachedStreamCounts();
        
        return {
          success: true,
          fromCache: true,
          categories,
          counts: {
            streamsCount: counts.liveCount + counts.movieCount + counts.seriesCount,
            liveCount: counts.liveCount,
            moviesCount: counts.movieCount,
            seriesCount: counts.seriesCount
          }
        };
      }
    }
    
    // No valid cache or forced refresh - fetch from proxy
    console.log('🔄 Fetching fresh data from proxy for playlist:', playlistData.name);
    
    // Check proxy availability
    const proxyAvailable = await checkProxyAvailability();
    if (!proxyAvailable) {
      throw new Error('Proxy server is not available');
    }
    
    // Fetch playlist data from proxy
    const streamsData = await fetchPlaylistDataClient({
      baseUrl: url,
      username,
      password
    });
    
    // Process and insert data into DuckDB
    const processResult = await processPlaylistData(streamsData, playlistId);
    
    if (!processResult.success) {
      throw new Error(processResult.error || 'Failed to process playlist data');
    }
    
    // Update cache state
    saveCacheState(playlistId);
    
    // Extract categories
    const categories = extractCategories(streamsData);
    
    return {
      success: true,
      fromCache: false,
      categories,
      counts: {
        streamsCount: processResult.streamsCount,
        liveCount: processResult.liveCount,
        moviesCount: processResult.moviesCount,
        seriesCount: processResult.seriesCount
      }
    };
  } catch (error) {
    console.error('Failed to load playlist data:', error);
    
    // Try to fall back to cached data even if expired
    const cacheState = getCacheState();
    if (cacheState) {
      console.log('🔄 Attempting to fallback to cached data...');
      try {
        const categories = await loadCachedCategories();
        const counts = await getCachedStreamCounts();
        
        return {
          success: true,
          fromCache: true,
          isFallback: true,
          categories,
          counts: {
            streamsCount: counts.liveCount + counts.movieCount + counts.seriesCount,
            liveCount: counts.liveCount,
            movieCount: counts.movieCount,
            seriesCount: counts.seriesCount
          }
        };
      } catch (fallbackError) {
        console.error('Fallback to cache failed:', fallbackError);
      }
    }
    
    return {
      success: false,
      error: error.message
    };
  }
}

