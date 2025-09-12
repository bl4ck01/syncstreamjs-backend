import { getConnection } from '../lib/duckdb-manager.js';

export async function getLiveCategories() {
  const conn = await getConnection();
  try {
    const result = await conn.query(`
      SELECT category_id, category_name 
      FROM live_categories 
      ORDER BY category_name
    `);
    return result.toArray().map(row => row.toJSON());
  } catch (error) {
    console.error('Error getting live categories:', error);
    return [];
  } finally {
    await conn.close();
  }
}

export async function getVodCategories() {
  const conn = await getConnection();
  try {
    const result = await conn.query(`
      SELECT category_id, category_name 
      FROM vod_categories 
      ORDER BY category_name
    `);
    return result.toArray().map(row => row.toJSON());
  } catch (error) {
    console.error('Error getting VOD categories:', error);
    return [];
  } finally {
    await conn.close();
  }
}

export async function getSeriesCategories() {
  const conn = await getConnection();
  try {
    const result = await conn.query(`
      SELECT category_id, category_name 
      FROM series_categories 
      ORDER BY category_name
    `);
    return result.toArray().map(row => row.toJSON());
  } catch (error) {
    console.error('Error getting series categories:', error);
    return [];
  } finally {
    await conn.close();
  }
}

export async function getLiveStreamsByCategory(categoryId, limit = 50) {
  const conn = await getConnection();
  try {
    const stmt = await conn.prepare(`
      SELECT * FROM live_streams 
      WHERE category_id = ?
      ORDER BY num
      LIMIT ?
    `);
    const result = await stmt.query(categoryId, limit);
    return result.toArray().map(row => row.toJSON());
  } catch (error) {
    console.error('Error getting live streams:', error);
    return [];
  } finally {
    await conn.close();
  }
}

export async function getVodStreamsByCategory(categoryId, limit = 50) {
  const conn = await getConnection();
  try {
    const stmt = await conn.prepare(`
      SELECT * FROM vod_streams 
      WHERE category_id = ?
      ORDER BY num
      LIMIT ?
    `);
    const result = await stmt.query(categoryId, limit);
    return result.toArray().map(row => row.toJSON());
  } catch (error) {
    console.error('Error getting VOD streams:', error);
    return [];
  } finally {
    await conn.close();
  }
}

export async function getSeriesStreamsByCategory(categoryId, limit = 50) {
  const conn = await getConnection();
  try {
    const stmt = await conn.prepare(`
      SELECT * FROM series_streams 
      WHERE category_id = ?
      ORDER BY num
      LIMIT ?
    `);
    const result = await stmt.query(categoryId, limit);
    return result.toArray().map(row => row.toJSON());
  } catch (error) {
    console.error('Error getting series streams:', error);
    return [];
  } finally {
    await conn.close();
  }
}

export async function getStatistics() {
  const conn = await getConnection();
  try {
    const result = await conn.query(`SELECT * FROM statistics LIMIT 1`);
    const rows = result.toArray().map(row => row.toJSON());
    return rows[0] || null;
  } catch (error) {
    console.error('Error getting statistics:', error);
    return null;
  } finally {
    await conn.close();
  }
}

export async function searchStreamsByName(query) {
  const conn = await getConnection();
  try {
    const stmt = await conn.prepare(`
      SELECT *, 'live' as type FROM live_streams WHERE name ILIKE '%' || ? || '%'
      UNION ALL
      SELECT *, 'vod' as type FROM vod_streams WHERE name ILIKE '%' || ? || '%'
      UNION ALL
      SELECT *, 'series' as type FROM series_streams WHERE name ILIKE '%' || ? || '%'
      LIMIT 100
    `);
    const result = await stmt.query(query, query, query);
    return result.toArray().map(row => row.toJSON());
  } catch (error) {
    console.error('Error searching streams:', error);
    return [];
  } finally {
    await conn.close();
  }
}

export async function getStreamCountByCategory(categoryId, type) {
  const conn = await getConnection();
  try {
    let tableName;
    switch (type) {
      case 'live': tableName = 'live_streams'; break;
      case 'vod': tableName = 'vod_streams'; break;
      case 'series': tableName = 'series_streams'; break;
      default: return 0;
    }

    const stmt = await conn.prepare(`
      SELECT COUNT(*) as count FROM ${tableName} 
      WHERE category_id = ?
    `);
    const result = await stmt.query(categoryId);
    return result.toArray()[0]?.count || 0;
  } catch (error) {
    console.error('Error getting stream count:', error);
    return 0;
  } finally {
    await conn.close();
  }
}