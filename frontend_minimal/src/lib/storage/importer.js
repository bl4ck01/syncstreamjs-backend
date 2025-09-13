import oboe from 'oboe';
import { db } from './db.js';

export const importFromProxyResponse = (jsonString, onProgress) => {
  return new Promise((resolve, reject) => {
    let totalCategories = 0;
    let totalStreams = 0;
    let currentStreamType = null;
    let isActive = true;
    let processedCategories = 0;

    console.log('🚀 Starting import with data length:', jsonString?.length);

    const saveCategory = async (category, streamType) => {
      try {
        if (!isActive || !category) return;
        
        console.log('💾 Saving category:', category.category_name, 'type:', streamType);
        
        await db.categories.put({
          id: `${streamType}_${category.category_id}`,
          category_id: category.category_id,
          category_name: category.category_name,
          stream_type: streamType,
          stream_count: category.stream_count,
        });
        totalCategories++;
        processedCategories++;
        console.log(`✅ Category saved: ${category.category_name} (${totalCategories} total)`);
        
        if (onProgress && isActive) {
          const progress = Math.min((processedCategories / Math.max(1, 100)) * 40, 40);
          onProgress(`Imported ${totalCategories} categories (${streamType})`, progress);
        }
      } catch (err) {
        console.error('❌ Error saving category:', err, category);
      }
    };

    const saveStream = async (stream, categoryId, streamType) => {
      try {
        if (!isActive || !stream) return;
        
        // Series streams use series_id instead of stream_id
        const streamId = stream.stream_id || stream.series_id;
        if (!streamId) {
          console.warn(`⚠️ Stream missing both stream_id and series_id:`, stream);
          return;
        }
        
        await db.streams.put({
          id: `${categoryId}_${streamId}`,
          categoryId: `${streamType}_${categoryId}`,
          stream_id: streamId, // Normalize to stream_id for consistency
          ...stream,
        });
        totalStreams++;
        
        if (onProgress && isActive && totalStreams % 50 === 0) {
          const progress = Math.min(40 + (totalStreams / Math.max(1, 10000)) * 60, 100);
          onProgress(`Imported ${totalStreams} streams`, progress);
        }
      } catch (err) {
        console.error('❌ Error saving stream:', err, stream);
      }
    };

    if (!jsonString || typeof jsonString !== 'string') {
      console.error('❌ Invalid JSON data:', typeof jsonString, jsonString);
      reject(new Error('Invalid JSON data provided'));
      return;
    }

    try {
      // First try to parse the JSON to see if it's valid
      const parsed = JSON.parse(jsonString);
      console.log('✅ JSON is valid, structure:', Object.keys(parsed || {}));
      
      if (!parsed.data || (!parsed.data.categorizedStreams && !parsed.data.categories)) {
        console.error('❌ Invalid data structure - missing data.categorizedStreams or data.categories');
        console.log('🔍 Available data keys:', Object.keys(parsed.data || {}));
        reject(new Error('Invalid data structure: missing categorizedStreams or categories'));
        return;
      }

      // Check if we have categorizedStreams or categories structure
      const hasCategorizedStreams = parsed.data.categorizedStreams;
      const hasCategories = parsed.data.categories;
      
      console.log('📊 Data structure analysis:', {
        hasCategorizedStreams: !!hasCategorizedStreams,
        hasCategories: !!hasCategories,
        categorizedStreamsKeys: hasCategorizedStreams ? Object.keys(parsed.data.categorizedStreams) : [],
        categoriesKeys: hasCategories ? Object.keys(parsed.data.categories) : [],
        rawDataKeys: Object.keys(parsed.data || {}),
        fullDataStructure: parsed.data
      });

      // Use categorizedStreams as it likely contains the actual streams
      // categories might just be metadata
      const basePath = hasCategorizedStreams ? 'data.categorizedStreams' : 'data.categories';
      console.log('📍 Using base path:', basePath);

      const streamTypes = hasCategorizedStreams ? Object.keys(parsed.data.categorizedStreams) : 
                         hasCategories ? Object.keys(parsed.data.categories) : [];
      console.log('📺 Found stream types:', streamTypes);
    } catch (parseErr) {
      console.error('❌ JSON parse error:', parseErr);
      reject(new Error(`Invalid JSON format: ${parseErr.message}`));
      return;
    }

    // Process JSON synchronously instead of using Oboe streaming
    console.log('🔄 Processing JSON synchronously...');
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
    
    // Process each stream type using async IIFE
    (async () => {
      try {
        const streamTypes = Object.keys(categoriesData);
        
        for (const streamType of streamTypes) {
          if (!isActive) break;
          console.log(`🎯 Processing ${streamType} categories...`);
          
          // Log series processing
          if (streamType === 'series') {
            console.log(`🎬 Processing series with ${categoriesData[streamType]?.length || 0} categories`);
          }
          
          currentStreamType = streamType;
          
          const categories = categoriesData[streamType];
          if (!Array.isArray(categories)) {
            console.warn(`⚠️ ${streamType} categories is not an array:`, typeof categories);
            continue;
          }
          
          console.log(`📂 Found ${categories.length} ${streamType} categories`);
          
          for (const category of categories) {
            if (!isActive) break;
            
            console.log(`📂 Processing ${streamType} category:`, category.category_name, 'with', category.streams?.length || 0, 'streams');
            
            await saveCategory(category, streamType);
            
            // Try multiple possible stream locations
            let streams = null;
            let streamsFound = false;
            
            // Check for streams in category.streams
            if (category.streams && Array.isArray(category.streams)) {
              streams = category.streams;
              streamsFound = true;
            }
            // Check for streams in category itself (if category is actually a stream container)
            else if (Array.isArray(category)) {
              streams = category;
              streamsFound = true;
              console.log(`📦 Category "${category.category_name || 'unknown'}" is an array of streams`);
            }
            // Check for streams in other possible properties
            else if (category.items && Array.isArray(category.items)) {
              streams = category.items;
              streamsFound = true;
              console.log(`📦 Found streams in category.items for "${category.category_name}"`);
            }

            if (streamsFound && streams) {
              console.log(`💾 Processing ${streams.length} streams for category:`, category.category_name);
              console.log(`🔍 Sample stream data:`, streams.slice(0, 2));
              
              // Log series stream processing
              if (streamType === 'series' && streams.length > 0) {
                console.log(`🎬 Found ${streams.length} series streams for "${category.category_name}"`);
              }
              
              for (const stream of streams) {
                if (!isActive) break;
                // Series streams use series_id instead of stream_id
                const streamId = stream.stream_id || stream.series_id || stream.id;
                if (stream && streamId) {
                  await saveStream(stream, category.category_id, streamType);
                } else {
                  console.warn(`⚠️ Invalid stream data (missing stream_id/series_id):`, stream);
                }
              }
            } else {
              console.log(`⚠️ Category "${category.category_name}" has no streams array:`, { 
                hasStreams: !!category.streams, 
                isArray: Array.isArray(category.streams), 
                type: typeof category.streams,
                keys: category.streams ? Object.keys(category.streams) : 'null',
                categoryKeys: Object.keys(category)
              });
            }
          }
        }
        
        console.log('✅ Synchronous import completed!');
        console.log('📊 Final stats:', { totalCategories, totalStreams });
        
        if (isActive) {
          resolve({ categories: totalCategories, streams: totalStreams });
        } else {
          reject(new Error('Import was cancelled'));
        }
      } catch (err) {
        console.error('❌ Processing failed:', err);
        reject(err);
      }
    })();
  });
};