import { db } from './db.js';

export const getCategoriesPage = async (streamType, page = 1, limit = 20) => {
  const offset = (page - 1) * limit;
  const categories = await db.categories
    .where('stream_type')
    .equals(streamType)
    .offset(offset)
    .limit(limit)
    .toArray();

  const totalCount = await db.categories.where('stream_type').equals(streamType).count();

  return {
    categories,
    pagination: {
      page,
      limit,
      total: totalCount,
      totalPages: Math.ceil(totalCount / limit),
    },
  };
};

export const getStreamsPageByCategory = async (categoryId, page = 1, limit = 20) => {
  console.log(`🔍 Querying streams for categoryId: "${categoryId}"`);
  
  const offset = (page - 1) * limit;
  
  // Check total streams in database
  const totalStreamsInDb = await db.streams.count();
  console.log(`📊 Total streams in database: ${totalStreamsInDb}`);
  
  if (totalStreamsInDb === 0) {
    console.log(`❌ No streams found in database - import may have failed`);
    return {
      streams: [],
      pagination: { page, limit, total: 0, totalPages: 0 }
    };
  }
  
  // Sample a few streams to see their structure
  const allStreams = await db.streams.limit(5).toArray();
  console.log(`📊 Sample stream data:`, allStreams.map(s => ({ id: s.id, categoryId: s.categoryId, stream_type: s.stream_type, name: s.name })));
  
  // Lightweight check for debugging if needed
  if (totalStreamsInDb < 100) {
    const streamsByType = {};
    const allStreamTypes = await db.streams.toArray();
    allStreamTypes.forEach(stream => {
      streamsByType[stream.stream_type] = (streamsByType[stream.stream_type] || 0) + 1;
    });
    console.log(`📊 Streams by type:`, streamsByType);
  }
  
  const streams = await db.streams
    .where('categoryId')
    .equals(categoryId)
    .offset(offset)
    .limit(limit)
    .toArray();

  const totalCount = await db.streams.where('categoryId').equals(categoryId).count();
  
  console.log(`📈 Query result: Found ${totalCount} total streams, returning ${streams.length} streams for categoryId "${categoryId}"`);

  return {
    streams,
    pagination: {
      page,
      limit,
      total: totalCount,
      totalPages: Math.ceil(totalCount / limit),
    },
  };
};