'use client';

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Tv, Film, MonitorSpeaker, Search } from 'lucide-react';
import ContentCard from './content-card';
import ContentCardSkeleton from './skeleton-loading';
import { useVirtualizedCategory } from '@/store/virtualized-category';

// Truly virtualized category row with fixed 100-item render limit
export default function VirtualizedCategoryRow({ category, activeTab, isSearchResults = false, performanceMode = false }) {
  const rowRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  
  // Debug received props
  const componentId = Math.random().toString(36).substr(2, 9);
  console.log(`[VirtualizedCategoryRow] 📦 Received props [${componentId}]:`, {
    category,
    categoryType: typeof category,
    categoryKeys: Object.keys(category || {}),
    activeTab,
    isSearchResults,
    performanceMode
  });
  
  // Early return if category is not valid
  if (!category || typeof category !== 'object' || !category.items || !Array.isArray(category.items)) {
    console.log(`[VirtualizedCategoryRow] ⚠️ Invalid category [${componentId}]:`, {
      category,
      categoryType: typeof category,
      hasItems: !!category?.items,
      isItemsArray: Array.isArray(category?.items),
      categoryKeys: category ? Object.keys(category) : 'N/A'
    });
    return null;
  }
  
  // TEMP: Debug without virtualized store
  console.log(`[VirtualizedCategoryRow] 🔍 Debug - Direct category data [${componentId}]:`, {
    category,
    itemsLength: category.items?.length,
    firstItem: category.items?.[0]
  });
  
  // Use virtualized category store with validation
  const categoryStore = useVirtualizedCategory(
    category?.categoryId || `category-${componentId}`,
    category?.items || []
  );
  
  const { visibleItems = [], isLoading = false, hasMore = false, loadMoreItems = () => {} } = categoryStore;
  
  // Ensure visibleItems is always an array
  const safeVisibleItems = Array.isArray(visibleItems) ? visibleItems : [];
  
  console.log(`[VirtualizedCategoryRow] 📊 Store data [${componentId}]:`, {
    visibleItemsLength: safeVisibleItems.length,
    isLoading,
    hasMore,
    storeItemsLength: categoryStore.allItems?.length
  });
  
  // Calculate responsive item width
  const getItemWidth = useCallback(() => {
    const width = window.innerWidth;
    if (width < 640) return 140; // sm
    if (width < 1024) return 160; // md
    if (width < 1280) return 176; // lg
    return 192; // xl
  }, []);
  
  const itemWidth = getItemWidth();
  const gap = 16;
  
  // Calculate how many items fit in viewport
  const itemsPerViewport = Math.max(1, Math.floor(containerWidth / (itemWidth + gap)));
  
  // Use intersection observer to detect when row is visible
  useEffect(() => {
    if (!rowRef.current) return;
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      {
        rootMargin: performanceMode ? '100px' : '200px',
        threshold: performanceMode ? 0.05 : 0.1
      }
    );
    
    observer.observe(rowRef.current);
    return () => observer.disconnect();
  }, [performanceMode]);
  
  // Measure container width
  useEffect(() => {
    if (!rowRef.current) return;
    
    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        const contentRect = entry.contentRect;
        const width = Math.max(200, contentRect.width - 80);
        setContainerWidth(width);
      }
    });
    
    resizeObserver.observe(rowRef.current);
    return () => resizeObserver.disconnect();
  }, []);
  
  // Handle scroll events for virtualization
  useEffect(() => {
    if (!scrollContainerRef.current || !isVisible) return;
    
    const handleScroll = () => {
      if (!scrollContainerRef.current) return;
      
      const scrollLeft = scrollContainerRef.current.scrollLeft;
      const scrollWidth = scrollContainerRef.current.scrollWidth;
      const clientWidth = scrollContainerRef.current.clientWidth;
      
      setScrollPosition(scrollLeft);
      
      // Calculate which items should be visible based on scroll position
      const firstVisibleIndex = Math.floor(scrollLeft / (itemWidth + gap));
      const lastVisibleIndex = Math.min(
        (category.items?.length || 0) - 1,
        firstVisibleIndex + itemsPerViewport
      );
      
      // Update visible items in store
      categoryStore.updateVisibleItems(scrollLeft, 'scroll');
      
      // Load more items when scrolling near the end
      const threshold = performanceMode ? 0.9 : 0.8;
      if (scrollLeft + clientWidth >= scrollWidth * threshold && hasMore && !isLoading) {
        loadMoreItems();
      }
    };
    
    const scrollContainer = scrollContainerRef.current;
    scrollContainer.addEventListener('scroll', handleScroll);
    
    // Initial scroll check
    handleScroll();
    
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, [isVisible, itemWidth, gap, itemsPerViewport, category.items?.length, hasMore, isLoading, loadMoreItems, categoryStore, performanceMode]);
  
  // Reset when category changes
  useEffect(() => {
    if (category?.categoryId && categoryStore) {
      categoryStore.initializeItems(category.items || []);
      setScrollPosition(0);
      setIsVisible(false);
    }
  }, [category?.categoryId, category?.items, categoryStore]);
  
  // Calculate total width
  const totalWidth = useMemo(() => {
    return (category.items?.length || 0) * (itemWidth + gap) - gap;
  }, [category.items?.length, itemWidth, gap]);
  
  return (
    <div ref={rowRef} className="px-4 sm:px-6 py-4 space-y-4">
      {/* Category Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold text-white">{category.name}</h2>
          <span className="text-sm text-neutral-400">
            {safeVisibleItems.length > 0 ? `${safeVisibleItems.length}/${category.items?.length || 0}` : category.items?.length || 0} items
          </span>
          {isSearchResults && (
            <span className="text-xs px-2 py-1 bg-blue-600/20 text-blue-400 rounded-full">
              Search Results
            </span>
          )}
          {(category.items?.length || 0) > 100 && !isSearchResults && (
            <span className="text-xs px-2 py-1 bg-purple-600/20 text-purple-400 rounded-full">
              Virtualized
            </span>
          )}
        </div>
        
        {/* Scroll buttons */}
        {containerWidth > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (scrollContainerRef.current) {
                  scrollContainerRef.current.scrollBy({ 
                    left: -(itemWidth * 3 + gap * 3), 
                    behavior: 'smooth' 
                  });
                }
              }}
              className="p-1 rounded-full transition-all bg-neutral-700 hover:bg-neutral-600 text-white disabled:opacity-50"
              disabled={scrollPosition <= 0}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={() => {
                if (scrollContainerRef.current) {
                  scrollContainerRef.current.scrollBy({ 
                    left: itemWidth * 3 + gap * 3, 
                    behavior: 'smooth' 
                  });
                }
              }}
              className="p-1 rounded-full transition-all bg-neutral-700 hover:bg-neutral-600 text-white disabled:opacity-50"
              disabled={scrollPosition >= totalWidth - containerWidth}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}
      </div>
      
      {/* Virtualized Horizontal Scroll */}
      <div className="relative">
        {containerWidth > 0 && (
          <div
            ref={scrollContainerRef}
            className="flex gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory"
            style={{ 
              width: containerWidth,
              scrollBehavior: 'smooth'
            }}
          >
            {/* Render only visible items (max 100) */}
            {safeVisibleItems.map((item, index) => {
              const actualIndex = category.items.indexOf(item);
              return (
                <div
                  key={item.stream_id || item.num || actualIndex}
                  className="flex-shrink-0 snap-start"
                  style={{ width: itemWidth }}
                >
                  <ContentCard 
                    item={item} 
                    type={activeTab}
                    priority={index < 6}
                  />
                </div>
              );
            })}
            
            {/* Loading indicator */}
            {isLoading && (
              <div className="flex-shrink-0 snap-start flex items-center justify-center" style={{ width: itemWidth }}>
                <div className="text-center p-4 bg-neutral-800/50 rounded-lg">
                  <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-xs text-neutral-400">Loading...</p>
                </div>
              </div>
            )}
            
            {/* Load more button */}
            {hasMore && !isLoading && (
              <div className="flex-shrink-0 snap-start flex items-center justify-center" style={{ width: itemWidth }}>
                <div className="text-center p-4 bg-neutral-800/50 rounded-lg">
                  <button 
                    className="text-xs px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-colors"
                    onClick={loadMoreItems}
                  >
                    Load More
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Performance indicator */}
      <div className="flex items-center justify-between text-xs text-neutral-500">
        <span>
          Rendering: {safeVisibleItems.length} items
        </span>
        <span>
          Total: {category.items?.length || 0} items
        </span>
        {performanceMode && (
          <span className="text-amber-500">
            Performance Mode
          </span>
        )}
      </div>
    </div>
  );
}

// Virtualized category list
export function VirtualizedCategoryList({ categories, activeTab, searchQuery, isSearchResults = false, performanceMode = false }) {
  console.log('[VirtualizedCategoryList] 🚀 Component function called with props:', {
    categories,
    activeTab,
    searchQuery,
    isSearchResults,
    performanceMode
  });
  
  // Ensure categories is always an array
  const safeCategories = Array.isArray(categories) ? categories : [];
  
  console.log('[VirtualizedCategoryList] 📊 Received categories:', {
    categoriesCount: safeCategories.length,
    categories: safeCategories.map(cat => ({
      name: cat?.name,
      categoryId: cat?.categoryId,
      itemsCount: cat?.items?.length || 0
    })),
    categoriesType: typeof categories,
    isArray: Array.isArray(categories),
    rawCategories: categories
  });
  
  if (safeCategories.length === 0) {
    // Empty state component
    const getIcon = () => {
      if (isSearchResults) return <Search className="w-16 h-16 text-neutral-600" />;
      switch (activeTab) {
        case 'live': return <Tv className="w-16 h-16 text-neutral-600" />;
        case 'movies': return <Film className="w-16 h-16 text-neutral-600" />;
        case 'series': return <MonitorSpeaker className="w-16 h-16 text-neutral-600" />;
        default: return <Tv className="w-16 h-16 text-neutral-600" />;
      }
    };
    
    const getTitle = () => {
      if (isSearchResults) {
        return `No results for "${searchQuery}"`;
      }
      if (searchQuery) {
        return `No ${activeTab} results for "${searchQuery}"`;
      }
      switch (activeTab) {
        case 'live': return 'No Live Channels';
        case 'movies': return 'No Movies Available';
        case 'series': return 'No Series Available';
        default: return 'No Content Available';
      }
    };
    
    const getDescription = () => {
      if (searchQuery) {
        return 'Try adjusting your search terms or browse different categories.';
      }
      return 'This playlist doesn\'t contain any content in this category yet.';
    };
    
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-neutral-900/50 flex items-center justify-center">
            {getIcon()}
          </div>
          <h3 className="text-xl font-semibold text-white mb-3">
            {getTitle()}
          </h3>
          <p className="text-neutral-400 text-sm">
            {getDescription()}
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="h-full w-full overflow-y-auto">
      {safeCategories.map((category, index) => {
        console.log(`[VirtualizedCategoryList] 🔄 Mapping category ${index}:`, {
          category,
          categoryKeys: Object.keys(category || {}),
          name: category?.name,
          categoryId: category?.categoryId,
          items: category?.items?.length
        });
        
        // Additional validation before rendering
        if (!category || typeof category !== 'object') {
          console.warn(`[VirtualizedCategoryList] ⚠️ Invalid category object at index ${index}:`, category);
          return null;
        }
        
        return (
          <VirtualizedCategoryRow
            key={category.categoryId || `category-${index}`}
            category={category}
            activeTab={activeTab}
            isSearchResults={isSearchResults}
            performanceMode={performanceMode}
          />
        );
      })}
    </div>
  );
}