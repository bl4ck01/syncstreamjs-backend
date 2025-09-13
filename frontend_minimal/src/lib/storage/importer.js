import { db } from './db.js';

export const importFromProxyResponse = (jsonString, onProgress) => {
  return new Promise(async (resolve, reject) => {
    let totalCategories = 0;
    let totalStreams = 0;
    let processedCategories = 0;

    console.log('🚀 Starting import with data length:', jsonString?.length);

    const BULK_SIZE = 1000;
    
    // Bulk insert categories
    const bulkInsertCategories = async (categories, streamType) => {
      const categoryDocs = categories.map(category => ({
        id: `${streamType}_${category.category_id}`,
        category_id: category.category_id,
        category_name: category.category_name,
        stream_type: streamType,
        stream_count: category.stream_count,
      }));
      
      await db.categories.bulkPut(categoryDocs);
      totalCategories += categories.length;
      processedCategories += categories.length;
      
      console.log(`✅ Bulk inserted ${categories.length} categories (${streamType})`);
    };

    // Bulk insert streams - much faster than individual inserts
    const bulkInsertStreams = async (streams, categoryId, streamType) => {
      const streamDocs = streams.map(stream => {
        const streamId = stream.stream_id || stream.series_id;
        if (!streamId) {
          console.warn(`⚠️ Stream missing both stream_id and series_id:`, stream);
          return null;
        }
        
        return {
          id: `${categoryId}_${streamId}`,
          categoryId: `${streamType}_${categoryId}`,
          stream_id: streamId,
          ...stream,
        };
      }).filter(Boolean); // Remove null entries
      
      if (streamDocs.length > 0) {
        await db.streams.bulkPut(streamDocs);
        totalStreams += streamDocs.length;
        
        if (totalStreams % BULK_SIZE === 0) {
          console.log(`✅ Bulk inserted ${streamDocs.length} streams (total: ${totalStreams})`);
        }
      }
    };

    if (!jsonString || typeof jsonString !== 'string') {
      reject(new Error('Invalid JSON data provided'));
      return;
    }

    // Process JSON with bulk inserts for much better performance
    console.log('🔄 Processing JSON with bulk inserts...');
    const jsonData = JSON.parse(jsonString);
    
    const hasCategories = jsonData.data && jsonData.data.categories;
    const hasCategorizedStreams = jsonData.data && jsonData.data.categorizedStreams;
    
    const categoriesData = hasCategorizedStreams ? jsonData.data.categorizedStreams : 
                          hasCategories ? jsonData.data.categories : null;
    
    if (!categoriesData) {
      reject(new Error('No categories data found'));
      return;
    }
    
    console.log('📊 Found categories data with keys:', Object.keys(categoriesData));
    
    try {
      const streamTypes = Object.keys(categoriesData);
      
      for (const streamType of streamTypes) {
        console.log(`🎯 Processing ${streamType} categories...`);
        
        const categories = categoriesData[streamType];
        if (!Array.isArray(categories)) {
          console.warn(`⚠️ ${streamType} categories is not an array:`, typeof categories);
          continue;
        }
        
        console.log(`📂 Found ${categories.length} ${streamType} categories`);
        
        // Bulk insert all categories first
        await bulkInsertCategories(categories, streamType);
        
        if (onProgress) {
          const progress = Math.min((processedCategories / Math.max(1, 100)) * 40, 40);
          onProgress(`Imported ${totalCategories} categories (${streamType})`, progress);
        }
        
        // Process streams for each category in batches
        for (const category of categories) {
          let streams = null;
          
          // Check for streams in category.streams
          if (category.streams && Array.isArray(category.streams)) {
            streams = category.streams;
          }
          // Check for streams in category itself
          else if (Array.isArray(category)) {
            streams = category;
          }
          // Check for streams in other possible properties
          else if (category.items && Array.isArray(category.items)) {
            streams = category.items;
          }

          if (streams && streams.length > 0) {
            console.log(`💾 Processing ${streams.length} streams for: ${category.category_name}`);
            
            // Process streams in chunks for better performance
            for (let i = 0; i < streams.length; i += BULK_SIZE) {
              const chunk = streams.slice(i, i + BULK_SIZE);
              await bulkInsertStreams(chunk, category.category_id, streamType);
              
              if (onProgress) {
                const progress = Math.min(40 + (totalStreams / Math.max(1, 10000)) * 60, 100);
                onProgress(`Imported ${totalStreams} streams`, progress);
              }
            }
          }
        }
      }
      
      console.log('✅ Bulk import completed!');
      console.log('📊 Final stats:', { totalCategories, totalStreams });
      
      resolve({ categories: totalCategories, streams: totalStreams });
      
    } catch (err) {
      console.error('❌ Processing failed:', err);
      reject(err);
    }
  });
};