'use client';

import { useCallback, useEffect, useState, useMemo } from 'react';
import { Virtuoso } from 'react-virtuoso';
import HorizontalCarousel from '@/components/HorizontalCarousel/HorizontalCarousel';
import { useUIStore } from '@/store/useUIStore';
import { useMetadataStore } from '@/store/useMetadataStore';
import { getCategoriesByType, getStreamsByCategory, countStreams, getCategoriesByTypeFallback, getStreamsByCategoryFallback, countStreamsFallback } from '@/duckdb/queries';
import { UILoading } from '@/components/UI';
import Link from 'next/link';
import { Home, Film, Tv, Radio } from 'lucide-react';

export default function VirtualizedContent({ type, title }) {
  const { categories, playlist, setCategories, categoryCounts } = useMetadataStore();
  const { loadedStreams, addLoadedStreams, setError, isLoading } = useUIStore();
  const [loadedCategories, setLoadedCategories] = useState(new Set());
  const [loadingCategories, setLoadingCategories] = useState(new Set());
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [totalStreams, setTotalStreams] = useState(0);

  const categoryData = useMemo(() => {
    return categories[type] || [];
  }, [categories, type]);

  // Calculate total streams for this type
  useEffect(() => {
    if (categoryData.length > 0) {
      const total = categoryData.reduce((sum, category) => {
        const count = categoryCounts[`${type}_${category.category_id}`] || 0;
        return sum + count;
      }, 0);
      setTotalStreams(total);
    }
  }, [categoryData, categoryCounts, type]);

  // Load categories if they don't exist
  useEffect(() => {
    const loadCategories = async () => {
      if (!playlist || categoryData.length > 0 || categoriesLoading) return;
      
      setCategoriesLoading(true);
      try {
        console.log(`🔍 Loading ${type} categories...`);
        let categoryData;
        try {
          categoryData = await getCategoriesByType(type, 0, 100); // Load more categories
        } catch (dbError) {
          console.warn('DuckDB categories query failed, using fallback:', dbError);
          categoryData = await getCategoriesByTypeFallback(type, 0, 100);
        }
        
        if (categoryData.length > 0) {
          setCategories(type, categoryData);
          console.log(`✅ Loaded ${categoryData.length} ${type} categories`);
        }
      } catch (error) {
        console.error(`Failed to load ${type} categories:`, error);
        setError('page', `Failed to load ${type} categories`);
      } finally {
        setCategoriesLoading(false);
      }
    };

    loadCategories();
  }, [playlist, categoryData.length, type, setCategories, categoriesLoading, setError]);

  const loadCategoryStreams = useCallback(async (category) => {
    const categoryKey = `${type}_${category.category_id}`;
    
    if (loadedCategories.has(categoryKey) || loadingCategories.has(categoryKey)) {
      return;
    }

    setLoadingCategories(prev => new Set(prev).add(categoryKey));

    try {
      // Load initial batch of streams directly (skip count check for speed)
      let streams;
      try {
        streams = await getStreamsByCategory(type, category.category_id, 0, 50);
      } catch (dbError) {
        console.warn('DuckDB query failed, using fallback:', dbError);
        streams = await getStreamsByCategoryFallback(type, category.category_id, 0, 50);
      }

      if (streams.length === 0) {
        setLoadedCategories(prev => new Set(prev).add(categoryKey));
        setLoadingCategories(prev => {
          const next = new Set(prev);
          next.delete(categoryKey);
          return next;
        });
        return;
      }

      addLoadedStreams(categoryKey, streams);
      setLoadedCategories(prev => new Set(prev).add(categoryKey));
    } catch (err) {
      console.error('Failed to load category streams:', err);
      setError(categoryKey, err.message);
    } finally {
      setLoadingCategories(prev => {
        const next = new Set(prev);
        next.delete(categoryKey);
        return next;
      });
    }
  }, [type, addLoadedStreams, setError, loadedCategories, loadingCategories]);

  const handleStreamClick = useCallback((stream) => {
    // Handle stream click - could open player, navigate to detail page, etc.
    console.log('Stream clicked:', stream);
    // TODO: Implement stream player or navigation
  }, []);

  const itemContent = useCallback((index, category) => {
    const categoryKey = `${type}_${category.category_id}`;
    const streams = loadedStreams[categoryKey] || [];
    const isLoading = loadingCategories.has(categoryKey);

    return (
      <HorizontalCarousel
        category={category}
        streams={streams}
        onStreamClick={handleStreamClick}
        loading={isLoading}
      />
    );
  }, [type, loadedStreams, loadingCategories, handleStreamClick]);

  const endReached = useCallback(() => {
    // Load more categories when reaching the end
    // This could be implemented if you have pagination for categories
    console.log('End of categories reached');
  }, []);

  const rangeChanged = useCallback(({ startIndex, endIndex }) => {
    // Pre-load categories that are about to come into view
    for (let i = startIndex; i <= endIndex && i < categoryData.length; i++) {
      const category = categoryData[i];
      loadCategoryStreams(category);
    }
  }, [categoryData, loadCategoryStreams]);

  if (!playlist) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-center">
          <p className="text-xl mb-4">No playlist loaded</p>
          <Link href="/" className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700">
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  if (categoryData.length === 0 && (isLoading || categoriesLoading)) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <UILoading />
          <p className="text-gray-400 mt-4">Loading {title}...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-black/95 backdrop-blur-sm border-b border-gray-800 px-4 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-8">
            <Link href="/" className="flex items-center space-x-2 text-red-600 hover:text-red-500 transition-colors">
              <Home className="w-6 h-6" />
              <span className="font-bold text-xl">DuckStream</span>
            </Link>
            <div className="hidden md:flex items-center space-x-8">
              <Link 
                href="/live" 
                className={`flex items-center space-x-2 transition-colors ${type === 'live' ? 'text-white font-bold text-lg' : 'text-gray-300 hover:text-white'}`}
              >
                <Radio className="w-5 h-5" />
                <span>Live</span>
              </Link>
              <Link 
                href="/movies" 
                className={`flex items-center space-x-2 transition-colors ${type === 'movie' ? 'text-white font-bold text-lg' : 'text-gray-300 hover:text-white'}`}
              >
                <Film className="w-5 h-5" />
                <span>Movies</span>
              </Link>
              <Link 
                href="/series" 
                className={`flex items-center space-x-2 transition-colors ${type === 'series' ? 'text-white font-bold text-lg' : 'text-gray-300 hover:text-white'}`}
              >
                <Tv className="w-5 h-5" />
                <span>Series</span>
              </Link>
            </div>
          </div>
          <div className="text-gray-300 text-sm font-medium">
            {totalStreams > 0 ? `${totalStreams.toLocaleString()} ${type === 'live' ? 'channels' : type === 'movie' ? 'movies' : 'series'}` : `${categoryData.length} ${categoryData.length === 1 ? 'category' : 'categories'}`}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">
              {title}
            </h1>
            <p className="text-xl text-gray-300 mb-8">
              {totalStreams > 0 ? 
                `Browse through our collection of ${totalStreams.toLocaleString()} ${type === 'live' ? 'live channels' : type === 'movie' ? 'movies' : 'TV series'}` :
                `Loading ${type.toLowerCase()} content...`
              }
            </p>
            {totalStreams > 0 && (
              <div className="inline-flex items-center px-6 py-3 bg-red-600 text-white rounded-full font-semibold">
                {type === 'live' && <Radio className="w-5 h-5 mr-2" />}
                {type === 'movie' && <Film className="w-5 h-5 mr-2" />}
                {type === 'series' && <Tv className="w-5 h-5 mr-2" />}
                {totalStreams.toLocaleString()} {type === 'live' ? 'Channels' : type === 'movie' ? 'Movies' : 'Series'}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 sm:px-6 lg:px-8 pb-8">
        <div className="max-w-7xl mx-auto">
          {categoryData.length === 0 ? (
            <div className="text-center text-gray-400 py-12">
              <p className="text-xl">No {type} content available</p>
              <p className="text-gray-500 mt-2">Please check your playlist or try again later</p>
            </div>
          ) : (
            <Virtuoso
              data={categoryData}
              itemContent={itemContent}
              endReached={endReached}
              rangeChanged={rangeChanged}
              increaseViewportBy={{ top: 200, bottom: 400 }}
              overscan={200}
              className="virtual-scroller"
              components={{
                Footer: () => (
                  <div className="py-8 flex justify-center">
                    <UILoading />
                  </div>
                )
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}