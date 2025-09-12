import { tableFromArrays } from 'apache-arrow';

/**
 * Converts array of stream objects into Arrow Table.
 * Assumes all objects have same keys.
 */
export function streamsToArrowTable(streams) {
  if (!streams || streams.length === 0) return null;

  // Get all keys from first object
  const keys = Object.keys(streams[0]);
  
  // Create columnar data: { key1: [val1, val2, ...], key2: [...] }
  const columns = {};
  keys.forEach(key => {
    columns[key] = streams.map(item => item[key]);
  });

  return tableFromArrays(columns);
}

/**
 * Converts categories array to Arrow Table
 */
export function categoriesToArrowTable(categories) {
  if (!categories || categories.length === 0) return null;

  const category_id = categories.map(cat => cat.category_id);
  const category_name = categories.map(cat => cat.category_name);

  return tableFromArrays({
    category_id,
    category_name
  });
}

/**
 * Converts userInfo object to Arrow Table (single row)
 */
export function userInfoToArrowTable(userInfo) {
  return tableFromArrays({
    auth: [userInfo.auth],
    status: [userInfo.status],
    exp_date: [userInfo.exp_date],
    max_connections: [userInfo.max_connections]
  });
}

export function statisticsToArrowTable(statistics) {
  return tableFromArrays({
    total_live: [statistics.totalLive || 0],
    total_vod: [statistics.totalVod || 0],
    total_series: [statistics.totalSeries || 0],
    total_items: [statistics.totalItems || 0],
    fetchedAt: [statistics.fetchedAt || Date.now()]
  });
}