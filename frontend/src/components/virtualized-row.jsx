'use client';

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import NetflixContentCard from './netflix-content-card';
import NetflixContentCardSkeleton from './netflix-skeleton-loading';

const VirtualizedRow = React.memo(({ 
  category, 
  activeTab, 
  isSearchResults = false, 
  performanceMode = false,
  onLoadMore = null
}) => {
  const scrollContainerRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasLoadedMore, setHasLoadedMore] = useState(false);
  
  // Performance parameters
  const ITEM_WIDTH = performanceMode ? 140 : 180;
  const GAP = 12;
  const INITIAL_VISIBLE_ITEMS = 12; // Reduced for better performance
  const LOAD_MORE_THRESHOLD = 0.6; // Load more at 60% scroll
  const LOAD_MORE_CHUNK = 8; // Load 8 more items
  
  // State for progressive loading
  const [visibleItemsCount, setVisibleItemsCount] = useState(INITIAL_VISIBLE_ITEMS);
  
  // Calculate total items - must be defined before hooks
  const totalItems = category.totalItems || category.items.length || 0;
  const visibleItems = useMemo(() => {
    if (!category?.items) return [];
    return category.items.slice(0, visibleItemsCount);
  }, [category?.items, visibleItemsCount]);

  // Check if we should load more items
  const shouldLoadMore = useCallback(() => {
    if (!scrollContainerRef.current || !category?.items || isLoadingMore || hasLoadedMore) {
      return false;
    }
    
    const container = scrollContainerRef.current;
    const scrollLeft = container.scrollLeft;
    const scrollWidth = container.scrollWidth;
    const clientWidth = container.clientWidth;
    
    if (scrollWidth <= clientWidth) return false;
    
    // Load more when user scrolls to 60% of the current content
    const scrollProgress = scrollLeft / (scrollWidth - clientWidth);
    const hasMoreItems = visibleItemsCount < totalItems;
    
    console.log(`[VirtualizedRow] 🔄 Scroll check: ${scrollProgress.toFixed(2)} > ${LOAD_MORE_THRESHOLD} && hasMore: ${hasMoreItems} (${visibleItemsCount}/${totalItems})`);
    
    return scrollProgress > LOAD_MORE_THRESHOLD && hasMoreItems;
  }, [category?.items, visibleItemsCount, isLoadingMore, hasLoadedMore, totalItems]);

  // Load more items
  const loadMoreItems = useCallback(async () => {
    if (!category?.items || isLoadingMore || hasLoadedMore || visibleItemsCount >= totalItems) {
      console.log(`[VirtualizedRow] ⏭️ Skip loading - loading: ${isLoadingMore}, hasLoaded: ${hasLoadedMore}, visible: ${visibleItemsCount}, total: ${totalItems}`);
      return;
    }

    console.log(`[VirtualizedRow] 📥 Loading more items for category: ${category.name}`);
    setIsLoadingMore(true);

    try {
      // Call parent's load more function if provided
      if (onLoadMore) {
        const newItems = await onLoadMore(category.name, visibleItemsCount, LOAD_MORE_CHUNK);
        
        if (newItems && newItems.length > 0) {
          setVisibleItemsCount(prev => prev + newItems.length);
        }
      } else {
        // Fallback: simulate loading delay
        await new Promise(resolve => setTimeout(resolve, 300));
        const newCount = Math.min(totalItems, visibleItemsCount + LOAD_MORE_CHUNK);
        setVisibleItemsCount(newCount);
      }

      // Mark as loaded if we've reached the end
      if (visibleItemsCount + LOAD_MORE_CHUNK >= totalItems) {
        setHasLoadedMore(true);
      }

      console.log(`[VirtualizedRow] ✅ Loaded more items: ${visibleItemsCount} -> ${Math.min(visibleItemsCount + LOAD_MORE_CHUNK, totalItems)}`);
    } catch (error) {
      console.error('[VirtualizedRow] ❌ Failed to load more items:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [category, visibleItemsCount, totalItems, isLoadingMore, hasLoadedMore, onLoadMore]);

  // Check scroll capabilities
  const checkScroll = useCallback(() => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
    }
  }, []);

  // Handle scroll with progressive loading
  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current) return;
    
    checkScroll();
    
    // Check if we should load more items
    if (shouldLoadMore()) {
      loadMoreItems();
    }
  }, [checkScroll, shouldLoadMore, loadMoreItems]);

  // Scroll functionality
  const scroll = useCallback((direction) => {
    const container = scrollContainerRef.current;
    if (!container) return;

    setIsScrolling(true);
    const scrollAmount = container.clientWidth * 0.75; // Scroll 75% of container width

    container.scrollTo({
      left: direction === 'left' 
        ? container.scrollLeft - scrollAmount 
        : container.scrollLeft + scrollAmount,
      behavior: 'smooth'
    });

    setTimeout(() => setIsScrolling(false), 300);
  }, []);

  // Effect to check if component is visible
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );

    if (scrollContainerRef.current) {
      observer.observe(scrollContainerRef.current);
    }

    return () => {
      if (scrollContainerRef.current) {
        observer.unobserve(scrollContainerRef.current);
      }
    };
  }, []);

  // Effect to check scroll capabilities when items change
  useEffect(() => {
    checkScroll();
  }, [visibleItems, checkScroll]);

  // Auto-scroll check
  useEffect(() => {
    if (!isVisible) return;

    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      if (shouldLoadMore()) {
        loadMoreItems();
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [isVisible, shouldLoadMore, loadMoreItems]);

  // Reset visible items when category changes
  useEffect(() => {
    if (category?.categoryId) {
      setVisibleItemsCount(INITIAL_VISIBLE_ITEMS);
      setHasLoadedMore(false);
      setIsLoadingMore(false);
    }
  }, [category?.categoryId]);

  // Calculate container width
  const containerWidth = useMemo(() => {
    return visibleItems.length * (ITEM_WIDTH + GAP) - GAP;
  }, [visibleItems.length, ITEM_WIDTH, GAP]);

  // Don't render if no items
  if (!category?.items || !Array.isArray(category.items) || category.items.length === 0) {
    return null;
  }

  const hasMoreItems = visibleItemsCount < totalItems;
  const isLoading = isLoadingMore;

  return (
    <div className="relative mb-8 group">
      {/* Row Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-white">{category.name}</h2>
          <span className="text-sm text-gray-400">
            {Math.min(visibleItemsCount, totalItems)} of {totalItems.toLocaleString()}
          </span>
          {category.isOptimized && (
            <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">
              Optimized
            </span>
          )}
        </div>
        
        {/* Scroll Controls */}
        {canScrollLeft && (
          <button
            onClick={() => scroll('left')}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-black/80 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isScrolling}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
        {canScrollRight && (
          <button
            onClick={() => scroll('right')}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-black/80 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isScrolling}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Content Container */}
      <div 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="relative overflow-x-auto overflow-y-hidden scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <div 
          className="flex gap-3 pb-4"
          style={{ width: `${containerWidth}px` }}
        >
          {visibleItems.map((item, index) => (
            <div
              key={item.id || `${category.name}-${index}`}
              className="flex-shrink-0"
              style={{ width: `${ITEM_WIDTH}px` }}
            >
              <NetflixContentCard
                item={item}
                activeTab={activeTab}
                performanceMode={performanceMode}
              />
            </div>
          ))}
          
          {/* Loading Indicator */}
          {isLoading && (
            <div className="flex-shrink-0 flex items-center justify-center" style={{ width: `${ITEM_WIDTH}px` }}>
              <div className="w-full flex flex-col items-center gap-2">
                <div className="w-12 h-12 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-xs text-gray-400 text-center">Loading more...</span>
              </div>
            </div>
          )}
          
          {/* Load More Trigger */}
          {hasMoreItems && !isLoading && (
            <div className="flex-shrink-0 flex items-center justify-center" style={{ width: `${ITEM_WIDTH}px` }}>
              <button
                onClick={loadMoreItems}
                className="w-full h-32 bg-gray-800/50 hover:bg-gray-700/50 border border-gray-600 rounded-lg flex flex-col items-center justify-center gap-2 transition-colors"
              >
                <ChevronRight className="w-6 h-6 text-gray-400" />
                <span className="text-xs text-gray-400 text-center px-2">
                  Load {Math.min(LOAD_MORE_CHUNK, totalItems - visibleItemsCount)} more
                </span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Progress Indicator */}
      <div className="mt-2 flex items-center gap-2">
        <div className="flex-1 h-1 bg-gray-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-blue-500 transition-all duration-300"
            style={{ width: `${(visibleItemsCount / totalItems) * 100}%` }}
          />
        </div>
        <span className="text-xs text-gray-500">
          {Math.round((visibleItemsCount / totalItems) * 100)}%
        </span>
      </div>
    </div>
  );
});

VirtualizedRow.displayName = 'VirtualizedRow';

export default VirtualizedRow;