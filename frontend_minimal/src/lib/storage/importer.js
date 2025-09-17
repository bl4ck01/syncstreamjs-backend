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
      const categoryDocs = categories.map(category => {
        const streamCount = category.stream_count || (category.streams ? category.streams.length : 0);
        console.log(`📂 Creating category: ${category.category_name} with ${streamCount} streams`);
        
        return {
          id: `${streamType}_${category.category_id}`,
          category_id: category.category_id,
          category_name: category.category_name,
          stream_type: streamType,
          stream_count: streamCount,
        };
      });
      
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
      } else {
        console.warn(`⚠️ No valid stream docs found in chunk of ${streams.length} streams for category ${categoryId}`);
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
    
    console.log('🔍 Data structure analysis:');
    console.log('  - hasCategories:', hasCategories);
    console.log('  - hasCategorizedStreams:', hasCategorizedStreams);
    
    if (hasCategorizedStreams) {
      console.log('  - categorizedStreams keys:', Object.keys(jsonData.data.categorizedStreams));
      console.log('  - categorizedStreams series count:', jsonData.data.categorizedStreams.series ? jsonData.data.categorizedStreams.series.length : 0);
    }
    
    if (hasCategories) {
      console.log('  - categories keys:', Object.keys(jsonData.data.categories));
      console.log('  - categories series count:', jsonData.data.categories.series ? jsonData.data.categories.series.length : 0);
    }
    
    // Use categorizedStreams for streaming data, fall back to categories for metadata
    const categoriesData = hasCategorizedStreams ? jsonData.data.categorizedStreams : 
                          hasCategories ? jsonData.data.categories : null;
    
    // Also get the basic categories for metadata if categorizedStreams doesn't have complete data
    const basicCategoriesData = hasCategories ? jsonData.data.categories : null;
    
    if (!categoriesData) {
      reject(new Error('No categories data found'));
      return;
    }
    
    console.log('📊 Found categories data with keys:', Object.keys(categoriesData));
    
    try {
      const streamTypes = Object.keys(categoriesData);
      
      for (const streamType of streamTypes) {
        console.log(`🎯 Processing ${streamType} categories...`);
        
        // Get categories from categorizedStreams (with streams) or fall back to basic categories
        let categories = categoriesData[streamType];
        
        // If categorizedStreams doesn't have this streamType but basicCategories does, use basic categories
        if ((!categories || categories.length === 0) && basicCategoriesData && basicCategoriesData[streamType]) {
          categories = basicCategoriesData[streamType];
          console.log(`🔄 Using basic categories for ${streamType}:`, categories.length);
        }
        
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
          
          // Check for streams in category.streams (this is what the proxy provides in categorizedStreams)
          if (category.streams && Array.isArray(category.streams)) {
            streams = category.streams;
            console.log(`📺 Found ${streams.length} streams in category.streams for: ${category.category_name}`);
          }
          // Check for streams in category itself (fallback for other data structures)
          else if (Array.isArray(category)) {
            streams = category;
            console.log(`📺 Found ${streams.length} streams in category array for: ${category.category_name || 'Unknown'}`);
          }
          // Check for streams in other possible properties
          else if (category.items && Array.isArray(category.items)) {
            streams = category.items;
            console.log(`📺 Found ${streams.length} streams in category.items for: ${category.category_name || 'Unknown'}`);
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
          } else {
            console.log(`⚠️ No streams found for category: ${category.category_name} (ID: ${category.category_id})`);
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