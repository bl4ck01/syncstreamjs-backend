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