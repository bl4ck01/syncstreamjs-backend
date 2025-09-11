import { CATEGORY_CHUNK_SIZE } from '@/constants';
import { useMetadataStore } from '@/store/useMetadataStore';
import { useUIStore } from '@/store/useUIStore';
import { getCategoriesByType } from '@/duckdb/queries';

export async function loadInitialData(type) {
  const { setLoading, setError } = useUIStore.getState();
  const { categories, setCategories } = useMetadataStore.getState();
  
  if (categories[type].length > 0) return;
  
  setLoading(true);
  
  try {
    const categoryData = await getCategoriesByType(type, 0, CATEGORY_CHUNK_SIZE);
    setCategories(type, categoryData);
  } catch (error) {
    setError('page', error.message);
  } finally {
    setLoading(false);
  }
}