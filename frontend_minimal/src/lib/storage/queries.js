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
  const offset = (page - 1) * limit;
  
  const streams = await db.streams
    .where('categoryId')
    .equals(categoryId)
    .offset(offset)
    .limit(limit)
    .toArray();

  const totalCount = await db.streams.where('categoryId').equals(categoryId).count();

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

// Simplified batch operations for better performance
export const getCategoryStreamsBatch = async (categoryIds, limit = 20) => {
  const results = {};
  
  for (const categoryId of categoryIds) {
    const result = await getStreamsPageByCategory(categoryId, 1, limit);
    results[categoryId] = result;
  }
  
  return results;
};

// Optimized search queries
export const searchStreams = async (query, streamType = null, limit = 50) => {
  const searchLower = query.toLowerCase();
  
  let dbQuery = db.streams;
  if (streamType) {
    // Use compound index for stream_type filtering
    const categoryIds = await db.categories
      .where('stream_type')
      .equals(streamType)
      .primaryKeys();
    
    dbQuery = dbQuery.where('categoryId').anyOf(categoryIds);
  }
  
  const streams = await dbQuery
    .filter(stream => 
      stream.name && stream.name.toLowerCase().includes(searchLower)
    )
    .limit(limit)
    .toArray();
  
  return streams;
};

// Get statistics for a stream type
export const getStreamTypeStats = async (streamType) => {
  const categoryIds = await db.categories
    .where('stream_type')
    .equals(streamType)
    .primaryKeys();
  
  const totalStreams = await db.streams
    .where('categoryId')
    .anyOf(categoryIds)
    .count();
  
  const totalCategories = categoryIds.length;
  
  return {
    streamType,
    totalCategories,
    totalStreams,
    averageStreamsPerCategory: totalStreams / Math.max(1, totalCategories),
  };
};