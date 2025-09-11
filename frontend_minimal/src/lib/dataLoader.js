import { CATEGORY_CHUNK_SIZE } from '@/constants';
import { useMetadataStore } from '@/store/useMetadataStore';
import { useUIStore } from '@/store/useUIStore';
import { getCategoriesByType, getCategoriesByTypeFallback } from '@/duckdb/queries';

export async function loadInitialData(type) {
  const { setLoading, setError, clearError } = useUIStore.getState();
  const { categories, setCategories } = useMetadataStore.getState();
  
  console.log(`🔍 loadInitialData called for ${type}. Current categories: ${categories[type].length}`);
  
  if (categories[type].length > 0) {
    console.log(`✅ ${type} categories already loaded: ${categories[type].length}`);
    return;
  }
  
  setLoading(true);
  clearError('page');
  
  try {
    console.log(`📊 Loading ${type} categories from DuckDB...`);
    let categoryData;
    try {
      categoryData = await getCategoriesByType(type, 0, CATEGORY_CHUNK_SIZE);
      console.log(`✅ DuckDB returned ${categoryData.length} ${type} categories`);
    } catch (dbError) {
      console.warn('DuckDB categories query failed, using fallback:', dbError);
      categoryData = await getCategoriesByTypeFallback(type, 0, CATEGORY_CHUNK_SIZE);
      console.log(`✅ Fallback returned ${categoryData.length} ${type} categories`);
    }
    
    if (categoryData.length > 0) {
      setCategories(type, categoryData);
      console.log(`✅ Loaded ${categoryData.length} ${type} categories into store`);
    } else {
      console.warn(`⚠️ No ${type} categories found`);
    }
  } catch (error) {
    console.error(`Failed to load ${type} categories:`, error);
    setError('page', error.message);
  } finally {
    setLoading(false);
  }
}