import { getDuckDB, isDuckDBAvailable, quickDuckDBCheck, getInMemoryStreams, addInMemoryStreams, clearInMemoryStreams } from './duckdbManager.js';
import { PAGE_SIZE } from '@/constants';

// Skip DuckDB initialization if it's clearly not available
const duckdbSkipped = !quickDuckDBCheck();

// PREPARED STATEMENTS — no SQL injection, faster execution
const QUERIES = {
  INSERT_STREAM: null,
  GET_STREAMS_BY_CATEGORY: null,
  GET_CATEGORIES_BY_TYPE: null,
  COUNT_STREAMS: null,
};

let isPreparing = false;

export async function prepareQueries() {
  if (isPreparing) return;
  if (QUERIES.INSERT_STREAM) return; // Already prepared
  if (duckdbSkipped) return; // Skip if DuckDB is not available

  isPreparing = true;
  
  try {
    const { conn } = await getDuckDB();
    
    QUERIES.INSERT_STREAM = await conn.prepare(`
      INSERT INTO streams (stream_id, name, type, category_id, category_name, stream_icon, cover, plot, genre, releaseDate, rating, added, num) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    QUERIES.GET_STREAMS_BY_CATEGORY = await conn.prepare(`
      SELECT * FROM streams
      WHERE type = ? AND category_id = ?
      ORDER BY num ASC
      LIMIT ? OFFSET ?
    `);

    QUERIES.GET_CATEGORIES_BY_TYPE = await conn.prepare(`
      SELECT DISTINCT category_id, category_name
      FROM streams
      WHERE type = ?
      ORDER BY category_name ASC
      LIMIT ? OFFSET ?
    `);

    QUERIES.COUNT_STREAMS = await conn.prepare(`
      SELECT COUNT(*) as count FROM streams
      WHERE type = ? AND category_id = ?
    `);
  } catch (error) {
    console.error('Failed to prepare queries:', error);
    throw error;
  } finally {
    isPreparing = false;
  }
}

export async function insertStreams(streams) {
  if (!streams || streams.length === 0) return;
  
  // If DuckDB is skipped, use in-memory fallback immediately
  if (duckdbSkipped) {
    addInMemoryStreams(streams);
    return;
  }
  
  try {
    const dbAvailable = await isDuckDBAvailable();
    if (!dbAvailable) {
      // Use in-memory fallback
      addInMemoryStreams(streams);
      return;
    }

    const { conn } = await getDuckDB();
    await prepareQueries();

    for (const s of streams) {
      await QUERIES.INSERT_STREAM.run(
        s.stream_id, s.name, s.type, s.category_id, s.category_name,
        s.stream_icon || '', s.cover || '', s.plot || '', s.genre || '',
        s.releaseDate || '', s.rating || '', s.added || '', s.num
      );
    }
  } catch (error) {
    console.error('Failed to insert streams:', error);
    // Fallback to in-memory storage
    addInMemoryStreams(streams);
  }
}

export async function getStreamsByCategory(type, categoryId, offset, limit = PAGE_SIZE) {
  // If DuckDB is skipped, use in-memory fallback immediately
  if (duckdbSkipped) {
    return getStreamsByCategoryFallback(type, categoryId, offset, limit);
  }
  
  try {
    const dbAvailable = await isDuckDBAvailable();
    if (!dbAvailable) {
      // Use in-memory fallback
      return getStreamsByCategoryFallback(type, categoryId, offset, limit);
    }

    await prepareQueries();
    const result = await QUERIES.GET_STREAMS_BY_CATEGORY.query(type, categoryId, limit, offset);
    return result.toArray();
  } catch (error) {
    console.error('Failed to get streams by category:', error);
    return getStreamsByCategoryFallback(type, categoryId, offset, limit);
  }
}

export async function getCategoriesByType(type, offset, limit) {
  // If DuckDB is skipped, use in-memory fallback immediately
  if (duckdbSkipped) {
    return getCategoriesByTypeFallback(type, offset, limit);
  }
  
  try {
    const dbAvailable = await isDuckDBAvailable();
    if (!dbAvailable) {
      // Use in-memory fallback
      return getCategoriesByTypeFallback(type, offset, limit);
    }

    await prepareQueries();
    const result = await QUERIES.GET_CATEGORIES_BY_TYPE.query(type, limit, offset);
    return result.toArray();
  } catch (error) {
    console.error('Failed to get categories by type:', error);
    return getCategoriesByTypeFallback(type, offset, limit);
  }
}

export async function countStreams(type, categoryId) {
  // If DuckDB is skipped, use in-memory fallback immediately
  if (duckdbSkipped) {
    return countStreamsFallback(type, categoryId);
  }
  
  try {
    const dbAvailable = await isDuckDBAvailable();
    if (!dbAvailable) {
      // Use in-memory fallback
      return countStreamsFallback(type, categoryId);
    }

    await prepareQueries();
    const result = await QUERIES.COUNT_STREAMS.query(type, categoryId);
    return result.toArray()[0]?.count || 0;
  } catch (error) {
    console.error('Failed to count streams:', error);
    return countStreamsFallback(type, categoryId);
  }
}

// Fallback functions for when DuckDB is not available
export async function getStreamsByCategoryFallback(type, categoryId, offset, limit = PAGE_SIZE) {
  const streams = getInMemoryStreams();
  const filtered = streams
    .filter(s => s.type === type && s.category_id === categoryId)
    .sort((a, b) => a.num - b.num)
    .slice(offset, offset + limit);
  return filtered;
}

export async function getCategoriesByTypeFallback(type, offset, limit) {
  const streams = getInMemoryStreams();
  const categories = [...new Map(
    streams
      .filter(s => s.type === type)
      .map(s => [s.category_id, { category_id: s.category_id, category_name: s.category_name }])
  ).values()]
    .sort((a, b) => a.category_name.localeCompare(b.category_name))
    .slice(offset, offset + limit);
  return categories;
}

export async function countStreamsFallback(type, categoryId) {
  const streams = getInMemoryStreams();
  return streams.filter(s => s.type === type && s.category_id === categoryId).length;
}