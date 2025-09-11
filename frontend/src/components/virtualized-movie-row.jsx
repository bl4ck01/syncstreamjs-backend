'use client';

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import NetflixContentCard from './netflix-content-card';
import NetflixContentCardSkeleton from './netflix-skeleton-loading';

const VirtualizedMovieRow = React.memo(({ 
  category, 
  activeTab, 
  isSearchResults = false, 
  performanceMode = false 
}) => {
  const scrollContainerRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  
  // Progressive loading parameters
  const ITEM_WIDTH = performanceMode ? 140 : 180;
  const GAP = 12;
  const INITIAL_VISIBLE_ITEMS = 20; // Show 20 items initially
  const LOAD_MORE_CHUNK = 12; // Load 12 more items when needed
  
  // State for progressive loading
  const [visibleItemsCount, setVisibleItemsCount] = useState(INITIAL_VISIBLE_ITEMS);
  const [containerWidth, setContainerWidth] = useState(0);

  // Calculate total items - must be defined before useCallback
  const totalItems = category.totalItems || category.items.length || 0;

  // Check scroll capabilities
  const checkScroll = useCallback(() => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
    }
  }, []);

  
  // Get currently visible items
  const visibleItems = useMemo(() => {
    if (!category?.items) return [];
    return category.items.slice(0, visibleItemsCount);
  }, [category?.items, visibleItemsCount]);

  // Check if we should load more items
  const shouldLoadMore = useCallback(() => {
    if (!scrollContainerRef.current || !category?.items || isLoadingMore) return false;
    
    const container = scrollContainerRef.current;
    const scrollLeft = container.scrollLeft;
    const scrollWidth = container.scrollWidth;
    const clientWidth = container.clientWidth;
    
    // Load more when user scrolls to 70% of the current content
    const scrollProgress = scrollLeft / (scrollWidth - clientWidth);
    const hasMoreItems = visibleItemsCount < totalItems;
    
    return scrollProgress > 0.7 && hasMoreItems;
  }, [category?.items, visibleItemsCount, isLoadingMore, totalItems]);

  // Load more items
  const loadMoreItems = useCallback(async () => {
    if (!category?.items || isLoadingMore || visibleItemsCount >= totalItems) return;
    
    setIsLoadingMore(true);
    
    // Simulate loading delay for smooth UX
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const newCount = Math.min(
      totalItems,
      visibleItemsCount + LOAD_MORE_CHUNK
    );
    
    setVisibleItemsCount(newCount);
    setIsLoadingMore(false);
  }, [category?.items, visibleItemsCount, isLoadingMore, totalItems]);

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
    const scrollAmount = container.clientWidth * 0.8;
    
    container.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    });

    setTimeout(() => setIsScrolling(false), 300);
  }, []);

  // Intersection Observer for lazy loading
  useEffect(() => {
    const rowElement = scrollContainerRef.current?.parentElement;
    if (!rowElement) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      {
        root: null,
        rootMargin: '200px',
        threshold: 0.1
      }
    );

    observer.observe(rowElement);
    return () => observer.disconnect();
  }, []);

  // Container width measurement
  useEffect(() => {
    if (!scrollContainerRef.current || !isVisible) return;

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        const newWidth = Math.max(200, entry.contentRect.width - 80);
        setContainerWidth(newWidth);
      }
    });

    resizeObserver.observe(scrollContainerRef.current);
    return () => resizeObserver.disconnect();
  }, [isVisible]);

  // Scroll event listener
  useEffect(() => {
    if (!scrollContainerRef.current || !isVisible) return;

    const container = scrollContainerRef.current;
    container.addEventListener('scroll', handleScroll, { passive: true });
    checkScroll();

    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [handleScroll, checkScroll, isVisible]);

  
  if (!category?.items || !Array.isArray(category.items) || category.items.length === 0) {
    return null;
  }

  const hasMoreItems = visibleItemsCount < totalItems;

  return (
    <div className="relative mb-8 group">
      {/* Row Header */}
      <div className="flex items-center justify-between px-4 mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg md:text-xl font-semibold text-white hover:text-red-500 transition-colors cursor-pointer">
            {category.name}
          </h2>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">
              {Math.min(visibleItemsCount, totalItems)} of {totalItems.toLocaleString()}
            </span>
            {isSearchResults && (
              <span className="text-xs px-2 py-1 bg-red-600/20 text-red-400 rounded-full">
                Search
              </span>
            )}
            {hasMoreItems && (
              <span className="text-xs px-2 py-1 bg-blue-600/20 text-blue-400 rounded-full">
                Loading...
              </span>
            )}
          </div>
        </div>
        
        {/* Load more button */}
        {hasMoreItems && (
          <button 
            onClick={loadMoreItems}
            disabled={isLoadingMore}
            className="text-xs text-gray-400 hover:text-white transition-colors disabled:opacity-50"
          >
            {isLoadingMore ? 'Loading...' : 'Load More →'}
          </button>
        )}
      </div>

      {/* Scroll Container */}
      <div className="relative">
        {/* Navigation Arrows */}
        {canScrollLeft && (
          <button
            onClick={() => scroll('left')}
            disabled={isScrolling}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-20 w-10 h-10 bg-black/60 border border-gray-600 rounded-full flex items-center justify-center text-white hover:bg-black/80 transition-all opacity-0 group-hover:opacity-100 disabled:opacity-50 -translate-x-5 group-hover:translate-x-0"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
        
        {canScrollRight && (
          <button
            onClick={() => scroll('right')}
            disabled={isScrolling}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-20 w-10 h-10 bg-black/60 border border-gray-600 rounded-full flex items-center justify-center text-white hover:bg-black/80 transition-all opacity-0 group-hover:opacity-100 disabled:opacity-50 translate-x-5 group-hover:translate-x-0"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}

        {/* Content Row */}
        <div
          ref={scrollContainerRef}
          className="flex gap-3 overflow-x-auto scrollbar-hide px-4 py-2"
          style={{ 
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            WebkitScrollbarDisplay: 'none'
          }}
        >
          {/* Skeleton loading for lazy load */}
          {!isVisible && (
            <>
              {Array.from({ length: 6 }).map((_, index) => (
                <NetflixContentCardSkeleton key={`lazy-skeleton-${index}`} />
              ))}
            </>
          )}
          
          {/* Loaded items */}
          {isVisible && visibleItems.map((item, index) => (
            <NetflixContentCard
              key={`${item.stream_id || item.num || item.id || item.name}-${index}`}
              item={item}
              type={activeTab}
              priority={index < 6}
            />
          ))}

          {/* Loading indicator for more items */}
          {isLoadingMore && (
            <div className="flex-shrink-0 w-32 h-full flex items-center justify-center">
              <div className="text-center">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                <span className="text-xs text-gray-400">Loading more...</span>
              </div>
            </div>
          )}

          {/* End indicator */}
          {!hasMoreItems && visibleItems.length > 0 && (
            <div className="flex-shrink-0 w-32 h-full flex items-center justify-center">
              <span className="text-xs text-gray-500">End of row</span>
            </div>
          )}
        </div>

        {/* Edge gradients */}
        <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-black to-transparent pointer-events-none"></div>
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-black to-transparent pointer-events-none"></div>
      </div>

      {/* Performance indicator */}
      <div className="flex items-center justify-between px-4 mt-2 text-xs text-gray-500 flex-wrap">
        <span>Showing: {visibleItems.length} items</span>
        <span>Total: {totalItems} items</span>
        {hasMoreItems && (
          <span className="text-blue-500">
            Progressive loading
          </span>
        )}
        {isLoadingMore && (
          <span className="text-yellow-500">
            Loading more...
          </span>
        )}
        {performanceMode && (
          <span className="text-amber-500">
            Performance Mode
          </span>
        )}
      </div>
    </div>
  );
});

VirtualizedMovieRow.displayName = 'VirtualizedMovieRow';

export default VirtualizedMovieRow;