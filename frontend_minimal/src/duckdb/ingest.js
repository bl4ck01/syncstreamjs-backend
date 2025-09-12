import { getConnection } from '../lib/duckdb-manager.js';
import { tableFromArrays } from 'apache-arrow';
import {
  streamsToArrowTable,
  categoriesToArrowTable,
  userInfoToArrowTable,
  statisticsToArrowTable
} from '../utils/arrowUtils.js';

// Define table names
const TABLES = {
  USER_INFO: 'user_info',
  LIVE_CATEGORIES: 'live_categories',
  VOD_CATEGORIES: 'vod_categories',
  SERIES_CATEGORIES: 'series_categories',
  LIVE_STREAMS: 'live_streams',
  VOD_STREAMS: 'vod_streams',
  SERIES_STREAMS: 'series_streams',
  STATISTICS: 'statistics'
};

export async function ingestPlaylistData(apiData) {
  const conn = await getConnection();
  try {
    const { userInfo, categories, categorizedStreams, statistics } = apiData;

    console.log('🔄 Starting data ingestion...');

    // 1. Drop existing tables to start fresh
    try {
      await conn.query(`DROP TABLE IF EXISTS ${TABLES.USER_INFO}`);
      await conn.query(`DROP TABLE IF EXISTS ${TABLES.LIVE_CATEGORIES}`);
      await conn.query(`DROP TABLE IF EXISTS ${TABLES.VOD_CATEGORIES}`);
      await conn.query(`DROP TABLE IF EXISTS ${TABLES.SERIES_CATEGORIES}`);
      await conn.query(`DROP TABLE IF EXISTS ${TABLES.LIVE_STREAMS}`);
      await conn.query(`DROP TABLE IF EXISTS ${TABLES.VOD_STREAMS}`);
      await conn.query(`DROP TABLE IF EXISTS ${TABLES.SERIES_STREAMS}`);
      await conn.query(`DROP TABLE IF EXISTS ${TABLES.STATISTICS}`);
      console.log('🗑️ Dropped existing tables');
    } catch (dropError) {
      console.log('⚠️ No existing tables to drop');
    }

    // 1. Ingest User Info
    if (userInfo) {
      const userTable = userInfoToArrowTable(userInfo);
      await conn.insertArrowTable(userTable, { name: TABLES.USER_INFO });
      console.log('✅ User info ingested');
    }

    // 2. Ingest Categories
    if (categories.live?.length) {
      const liveCatTable = categoriesToArrowTable(categories.live);
      await conn.insertArrowTable(liveCatTable, { name: TABLES.LIVE_CATEGORIES });
      console.log(`✅ ${categories.live.length} live categories ingested`);
    }

    if (categories.vod?.length) {
      const vodCatTable = categoriesToArrowTable(categories.vod);
      await conn.insertArrowTable(vodCatTable, { name: TABLES.VOD_CATEGORIES });
      console.log(`✅ ${categories.vod.length} VOD categories ingested`);
    }

    if (categories.series?.length) {
      const seriesCatTable = categoriesToArrowTable(categories.series);
      await conn.insertArrowTable(seriesCatTable, { name: TABLES.SERIES_CATEGORIES });
      console.log(`✅ ${categories.series.length} series categories ingested`);
    }

    // 3. Ingest Streams (Flatten categorizedStreams)
    if (categorizedStreams.live?.length) {
      const allLiveStreams = categorizedStreams.live.flatMap(cat => cat.streams);
      const liveStreamTable = streamsToArrowTable(allLiveStreams);
      await conn.insertArrowTable(liveStreamTable, { name: TABLES.LIVE_STREAMS });
      console.log(`✅ ${allLiveStreams.length} live streams ingested`);
    }

    if (categorizedStreams.vod?.length) {
      const allVodStreams = categorizedStreams.vod.flatMap(cat => cat.streams);
      const vodStreamTable = streamsToArrowTable(allVodStreams);
      await conn.insertArrowTable(vodStreamTable, { name: TABLES.VOD_STREAMS });
      console.log(`✅ ${allVodStreams.length} VOD streams ingested`);
    }

    if (categorizedStreams.series?.length) {
      const allSeriesStreams = categorizedStreams.series.flatMap(cat => cat.streams);
      const seriesStreamTable = streamsToArrowTable(allSeriesStreams);
      await conn.insertArrowTable(seriesStreamTable, { name: TABLES.SERIES_STREAMS });
      console.log(`✅ ${allSeriesStreams.length} series streams ingested`);
    }

    // 4. Ingest Statistics (single row)
    if (statistics) {
      const statsTable = statisticsToArrowTable(statistics);
      await conn.insertArrowTable(statsTable, { name: TABLES.STATISTICS });
      console.log('✅ Statistics ingested');
    }

    console.log('🎉 All data ingested into DuckDB successfully');

  } catch (error) {
    console.error('❌ Error ingesting data:', error);
    throw error;
  } finally {
    await conn.close();
  }
}