import { insertStreams } from '../duckdb/queries';
import { getDuckDB, isDuckDBAvailable, clearInMemoryStreams } from '../duckdb/duckdbManager';

// Process M3U playlist data and normalize it for DuckDB
export async function processPlaylistData(playlistData, playlistId) {
  try {
    // Clear existing data (both DuckDB and in-memory) before inserting fresh data
    clearInMemoryStreams();
    
    // Check if DuckDB is available first
    const dbAvailable = await isDuckDBAvailable();
    if (dbAvailable) {
      const { conn } = await getDuckDB();
      try {
        await conn.query(`DELETE FROM streams WHERE 1=1`);
      } catch (clearError) {
        console.warn('Failed to clear existing data:', clearError);
      }
    }
    
    const streams = [];
    let liveCount = 0;
    let moviesCount = 0;
    let seriesCount = 0;
    
    // Process live streams from categorizedStreams.live
    if (playlistData.categorizedStreams?.live) {
      for (const category of playlistData.categorizedStreams.live) {
        for (const stream of category.streams) {
          streams.push({
            stream_id: parseInt(stream.stream_id) || Date.now() + Math.random(),
            name: stream.name || 'Unknown Stream',
            type: 'live',
            category_id: stream.category_id || category.category_id || 'uncategorized',
            category_name: stream.category_name || category.category_name || 'Uncategorized',
            stream_icon: stream.stream_icon || '',
            cover: stream.cover || '',
            plot: stream.plot || '',
            genre: stream.genre || '',
            releaseDate: stream.releaseDate || '',
            rating: stream.rating || '',
            added: stream.added || '',
            num: parseInt(stream.num) || 0
          });
          liveCount++;
        }
      }
    }
    
    // Process movies from categorizedStreams.vod
    if (playlistData.categorizedStreams?.vod) {
      for (const category of playlistData.categorizedStreams.vod) {
        for (const stream of category.streams) {
          streams.push({
            stream_id: parseInt(stream.stream_id) || Date.now() + Math.random(),
            name: stream.name || 'Unknown Movie',
            type: 'movie',
            category_id: stream.category_id || category.category_id || 'uncategorized',
            category_name: stream.category_name || category.category_name || 'Uncategorized',
            stream_icon: stream.stream_icon || stream.cover || '',
            cover: stream.cover || stream.stream_icon || '',
            plot: stream.plot || stream.description || '',
            genre: stream.genre || '',
            releaseDate: stream.releaseDate || stream.year || '',
            rating: stream.rating || '',
            added: stream.added || '',
            num: parseInt(stream.num) || 0
          });
          moviesCount++;
        }
      }
    }
    
    // Process series from categorizedStreams.series
    if (playlistData.categorizedStreams?.series) {
      for (const category of playlistData.categorizedStreams.series) {
        for (const stream of category.streams) {
          streams.push({
            stream_id: parseInt(stream.stream_id) || Date.now() + Math.random(),
            name: stream.name || 'Unknown Series',
            type: 'series',
            category_id: stream.category_id || category.category_id || 'uncategorized',
            category_name: stream.category_name || category.category_name || 'Uncategorized',
            stream_icon: stream.stream_icon || stream.cover || '',
            cover: stream.cover || stream.stream_icon || '',
            plot: stream.plot || stream.description || '',
            genre: stream.genre || '',
            releaseDate: stream.releaseDate || stream.year || '',
            rating: stream.rating || '',
            added: stream.added || '',
            num: parseInt(stream.num) || 0
          });
          seriesCount++;
        }
      }
    }
    
    // Insert all streams into DuckDB
    if (streams.length > 0) {
      await insertStreams(streams);
    }
    
    return {
      success: true,
      streamsCount: streams.length,
      liveCount,
      moviesCount,
      seriesCount
    };
  } catch (error) {
    console.error('Failed to process playlist data:', error);
    return {
      success: false,
      error: error.message,
      streamsCount: 0,
      liveCount: 0,
      moviesCount: 0,
      seriesCount: 0
    };
  }
}

// Extract categories from playlist data
export function extractCategories(playlistData) {
  const categories = {
    live: [],
    movie: [],
    series: []
  };
  
  // Process live categories from the correct structure
  if (playlistData.categories?.live) {
    categories.live = playlistData.categories.live.map(cat => ({
      category_id: cat.category_id || cat.id || 'unknown',
      category_name: cat.category_name || cat.name || 'Unknown'
    }));
  }
  
  // Process movie categories from the correct structure (vod = movies)
  if (playlistData.categories?.vod) {
    categories.movie = playlistData.categories.vod.map(cat => ({
      category_id: cat.category_id || cat.id || 'unknown',
      category_name: cat.category_name || cat.name || 'Unknown'
    }));
  }
  
  // Process series categories from the correct structure
  if (playlistData.categories?.series) {
    categories.series = playlistData.categories.series.map(cat => ({
      category_id: cat.category_id || cat.id || 'unknown',
      category_name: cat.category_name || cat.name || 'Unknown'
    }));
  }
  
  return categories;
}