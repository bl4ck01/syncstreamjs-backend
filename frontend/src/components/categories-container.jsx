'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import VirtualizedRow from './virtualized-row';
import { optimizedDataService } from '@/services/optimized-data-service';
import { Wifi, WifiOff, Database } from 'lucide-react';

const CategoriesContainer = ({ 
  contentType, 
  activeTab, 
  performanceMode = false,
  initialData = null 
}) => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [visibleCategories, setVisibleCategories] = useState(new Set());
  
  const loaderRef = useRef(null);
  const INITIAL_CATEGORIES = 8;
  const LOAD_MORE_CATEGORIES = 4;

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load initial categories
  useEffect(() => {
    if (initialData && initialData.categories) {
      setCategories(initialData.categories);
      setHasMore(initialData.totalCategories > INITIAL_CATEGORIES);
      
      // Set initial visible categories
      const initialVisible = new Set();
      initialData.categories.slice(0, INITIAL_CATEGORIES).forEach(cat => {
        initialVisible.add(cat.categoryId);
      });
      setVisibleCategories(initialVisible);
    } else {
      loadInitialCategories();
    }
  }, [contentType, initialData]);

  // Intersection observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first.isIntersecting && hasMore && !loadingMore && isOnline) {
          loadMoreCategories();
        }
      },
      { threshold: 0.1 }
    );

    if (loaderRef.current) {
      observer.observe(loaderRef.current);
    }

    return () => {
      if (loaderRef.current) {
        observer.unobserve(loaderRef.current);
      }
    };
  }, [hasMore, loadingMore, isOnline]);

  const loadInitialCategories = useCallback(async () => {
    if (loading) return;
    
    setLoading(true);
    setError(null);

    try {
      console.log(`[CategoriesContainer] 🚀 Loading initial ${contentType} categories...`);
      
      let data;
      switch (contentType) {
        case 'live':
          data = await optimizedDataService.getLivePageData({ limit: 20 });
          break;
        case 'movies':
          data = await optimizedDataService.getMoviesPageData({ limit: 20 });
          break;
        case 'series':
          data = await optimizedDataService.getSeriesPageData({ limit: 20 });
          break;
        default:
          throw new Error(`Unknown content type: ${contentType}`);
      }

      setCategories(data.categories);
      setHasMore(data.totalCategories > INITIAL_CATEGORIES);
      
      // Set initial visible categories
      const initialVisible = new Set();
      data.categories.slice(0, INITIAL_CATEGORIES).forEach(cat => {
        initialVisible.add(cat.categoryId);
      });
      setVisibleCategories(initialVisible);

      console.log(`[CategoriesContainer] ✅ Loaded ${data.categories.length} ${contentType} categories`);
    } catch (err) {
      console.error(`[CategoriesContainer] ❌ Failed to load ${contentType} categories:`, err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [contentType, loading]);

  const loadMoreCategories = useCallback(async () => {
    if (loadingMore || !hasMore || !isOnline) return;
    
    setLoadingMore(true);
    setError(null);

    try {
      console.log(`[CategoriesContainer] 📂 Loading more ${contentType} categories...`);
      
      const currentCount = categories.length;
      const result = await optimizedDataService.loadMoreCategories(
        contentType,
        currentCount,
        LOAD_MORE_CATEGORIES
      );

      if (result.categories.length > 0) {
        setCategories(prev => [...prev, ...result.categories]);
        
        // Add new categories to visible set
        const newVisible = new Set(visibleCategories);
        result.categories.forEach(cat => {
          newVisible.add(cat.categoryId);
        });
        setVisibleCategories(newVisible);
      }

      setHasMore(result.hasMore);
      
      console.log(`[CategoriesContainer] ✅ Loaded ${result.categories.length} more ${contentType} categories`);
    } catch (err) {
      console.error(`[CategoriesContainer] ❌ Failed to load more ${contentType} categories:`, err);
      setError(err.message);
    } finally {
      setLoadingMore(false);
    }
  }, [contentType, categories.length, hasMore, loadingMore, isOnline, visibleCategories]);

  const handleLoadMoreItems = useCallback(async (categoryName, offset, limit) => {
    try {
      console.log(`[CategoriesContainer] 📥 Loading more ${contentType} items for ${categoryName}...`);
      
      const newItems = await optimizedDataService.loadMoreItems(
        contentType,
        categoryName,
        offset,
        limit
      );

      // Update the category with new items
      setCategories(prev => prev.map(cat => {
        if (cat.name === categoryName) {
          return {
            ...cat,
            items: [...cat.items, ...newItems]
          };
        }
        return cat;
      }));

      console.log(`[CategoriesContainer] ✅ Loaded ${newItems.length} more ${contentType} items for ${categoryName}`);
      return newItems;
    } catch (error) {
      console.error(`[CategoriesContainer] ❌ Failed to load more ${contentType} items:`, error);
      return [];
    }
  }, [contentType]);

  const handleRetry = useCallback(() => {
    setError(null);
    loadInitialCategories();
  }, [loadInitialCategories]);

  // Show loading state
  if (loading && categories.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading {contentType}...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error && categories.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-900/20 flex items-center justify-center">
            <WifiOff className="w-8 h-8 text-red-500" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">Failed to load {contentType}</h3>
          <p className="text-gray-400 text-sm mb-4">{error}</p>
          <button
            onClick={handleRetry}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Show empty state
  if (categories.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-800 flex items-center justify-center">
            <Database className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">No {contentType} found</h3>
          <p className="text-gray-400">Check your playlist configuration or try again later.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Status indicators */}
      <div className="fixed bottom-4 right-4 flex items-center gap-4 text-xs text-gray-500">
        <div className="flex items-center gap-2">
          <Database className="w-3 h-3 text-green-500" />
          <span>{categories.length} categories loaded</span>
        </div>
        {isOnline ? (
          <Wifi className="w-3 h-3 text-green-500" />
        ) : (
          <WifiOff className="w-3 h-3 text-red-500" />
        )}
        {performanceMode && (
          <div className="flex items-center gap-1 text-amber-500">
            <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span>Performance Mode</span>
          </div>
        )}
      </div>

      {/* Categories */}
      {categories.map((category) => (
        <VirtualizedRow
          key={category.categoryId}
          category={category}
          activeTab={activeTab}
          isSearchResults={false}
          performanceMode={performanceMode}
          onLoadMore={handleLoadMoreItems}
        />
      ))}

      {/* Load More Categories Trigger */}
      {hasMore && (
        <div ref={loaderRef} className="flex justify-center py-8">
          <div className="text-center">
            {loadingMore ? (
              <div className="space-y-2">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-sm text-gray-400">Loading more categories...</p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="w-8 h-8 border-2 border-gray-600 border-dashed rounded-full mx-auto"></div>
                <p className="text-sm text-gray-500">Scroll to load more categories</p>
                <p className="text-xs text-gray-600">
                  Showing {categories.length} of {categories.length + (hasMore ? '+' : '')} categories
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* End of content indicator */}
      {!hasMore && categories.length > 0 && (
        <div className="flex justify-center py-8">
          <div className="text-center">
            <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
              <Database className="w-6 h-6 text-green-500" />
            </div>
            <p className="text-sm text-gray-400">All {contentType} loaded</p>
            <p className="text-xs text-gray-600 mt-1">
              {categories.length} categories total
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoriesContainer;