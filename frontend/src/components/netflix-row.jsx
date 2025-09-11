'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import NetflixContentCard from './netflix-content-card';
import NetflixContentCardSkeleton from './netflix-skeleton-loading';

const NetflixRow = React.memo(({ 
  category, 
  activeTab, 
  isSearchResults = false, 
  performanceMode = false 
}) => {
  const scrollContainerRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);
  const [loadedItems, setLoadedItems] = useState([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasLoadedAll, setHasLoadedAll] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  const CHUNK_SIZE = performanceMode ? 15 : 25;
  const MAX_VISIBLE_ITEMS = performanceMode ? 80 : 150;

  // Check scroll capabilities
  const checkScroll = useCallback(() => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
    }
  }, []);

  // Handle scroll events
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    let touchStartX = 0;
    let touchStartY = 0;

    const handleScroll = () => {
      checkScroll();
      
      // Load more items when scrolling near the end
      const { scrollLeft, scrollWidth, clientWidth } = container;
      const scrollPercentage = (scrollLeft + clientWidth) / scrollWidth;
      
      if (scrollPercentage > 0.7 && !isLoadingMore && !hasLoadedAll) {
        loadMoreItems();
      }
    };

    const handleWheel = (e) => {
      // If it's primarily a vertical scroll, let it bubble up
      const isVerticalScroll = Math.abs(e.deltaY) > Math.abs(e.deltaX);
      
      if (isVerticalScroll) {
        return; // Allow vertical scrolling to propagate
      }
      
      // Only prevent default for horizontal scrolls
      e.preventDefault();
      e.stopPropagation();
      
      container.scrollLeft += e.deltaX;
      checkScroll();
      
      // Load more items when scrolling near the end
      const { scrollLeft, scrollWidth, clientWidth } = container;
      const scrollPercentage = (scrollLeft + clientWidth) / scrollWidth;
      
      if (scrollPercentage > 0.7 && !isLoadingMore && !hasLoadedAll) {
        loadMoreItems();
      }
    };

    const handleTouchStart = (e) => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    };

    const handleTouchMove = (e) => {
      if (!touchStartX || !touchStartY) return;
      
      const touchEndX = e.touches[0].clientX;
      const touchEndY = e.touches[0].clientY;
      
      const deltaX = touchEndX - touchStartX;
      const deltaY = touchEndY - touchStartY;
      
      // If it's primarily a vertical swipe, let it bubble up
      if (Math.abs(deltaY) > Math.abs(deltaX)) {
        return;
      }
      
      // Prevent default for horizontal swipes
      e.preventDefault();
      
      // Handle horizontal scroll
      container.scrollLeft -= deltaX;
      checkScroll();
      
      // Load more items when scrolling near the end
      const { scrollLeft, scrollWidth, clientWidth } = container;
      const scrollPercentage = (scrollLeft + clientWidth) / scrollWidth;
      
      if (scrollPercentage > 0.7 && !isLoadingMore && !hasLoadedAll) {
        loadMoreItems();
      }
      
      // Update touch start position
      touchStartX = touchEndX;
      touchStartY = touchEndY;
    };

    const handleTouchEnd = () => {
      touchStartX = 0;
      touchStartY = 0;
    };

    container.addEventListener('scroll', handleScroll);
    container.addEventListener('wheel', handleWheel, { passive: false });
    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });
    
    checkScroll();

    // Check scroll on resize
    const resizeObserver = new ResizeObserver(checkScroll);
    resizeObserver.observe(container);

    return () => {
      container.removeEventListener('scroll', handleScroll);
      container.removeEventListener('wheel', handleWheel);
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      resizeObserver.disconnect();
    };
  }, [checkScroll, isLoadingMore, hasLoadedAll]);

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
        rootMargin: '100px',
        threshold: 0.1
      }
    );

    observer.observe(rowElement);

    return () => observer.disconnect();
  }, []);

  // Initialize with first chunk when visible
  useEffect(() => {
    if (isVisible && category?.items && Array.isArray(category.items) && category.items.length > 0 && loadedItems.length === 0) {
      const firstChunk = category.items.slice(0, CHUNK_SIZE);
      setLoadedItems(firstChunk);
      setHasLoadedAll(category.items.length <= CHUNK_SIZE);
    }
  }, [isVisible, category?.items, loadedItems.length, CHUNK_SIZE]);

  // Load more items
  const loadMoreItems = useCallback(() => {
    if (isLoadingMore || hasLoadedAll || !category?.items) return;

    setIsLoadingMore(true);
    
    setTimeout(() => {
      const nextChunkStart = loadedItems.length;
      const nextChunkEnd = Math.min(nextChunkStart + CHUNK_SIZE, category.items.length);
      const nextChunk = category.items.slice(nextChunkStart, nextChunkEnd);
      
      setLoadedItems(prev => {
        const newItems = [...prev, ...nextChunk];
        if (newItems.length > MAX_VISIBLE_ITEMS) {
          return newItems.slice(-MAX_VISIBLE_ITEMS);
        }
        return newItems;
      });
      
      setHasLoadedAll(nextChunkEnd >= category.items.length);
      setIsLoadingMore(false);
    }, 200);
  }, [isLoadingMore, hasLoadedAll, category?.items, loadedItems.length, CHUNK_SIZE, MAX_VISIBLE_ITEMS]);

  if (!category?.items || !Array.isArray(category.items) || category.items.length === 0) {
    return null;
  }

  const itemCount = loadedItems.length;
  const totalItems = category.items.length;

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
              {itemCount} of {totalItems.toLocaleString()}
            </span>
            {isSearchResults && (
              <span className="text-xs px-2 py-1 bg-red-600/20 text-red-400 rounded-full">
                Search
              </span>
            )}
          </div>
        </div>
        
        {!hasLoadedAll && (
          <button 
            onClick={loadMoreItems}
            disabled={isLoadingMore}
            className="text-xs text-gray-400 hover:text-white transition-colors disabled:opacity-50"
          >
            {isLoadingMore ? 'Loading...' : 'See More →'}
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
          
          {/* Skeleton loading for initial load */}
          {isVisible && loadedItems.length === 0 && (
            <>
              {Array.from({ length: 6 }).map((_, index) => (
                <NetflixContentCardSkeleton key={`skeleton-${index}`} />
              ))}
            </>
          )}

          {/* Loaded items */}
          {loadedItems.map((item, index) => (
            <NetflixContentCard
              key={`${item.stream_id || item.num || item.id || item.name}-${index}`}
              item={item}
              type={activeTab}
              priority={index < 6}
            />
          ))}

          {/* Loading more skeletons */}
          {isLoadingMore && (
            <>
              {Array.from({ length: 4 }).map((_, index) => (
                <NetflixContentCardSkeleton key={`loading-skeleton-${index}`} />
              ))}
            </>
          )}

          {/* End indicator */}
          {hasLoadedAll && loadedItems.length > 0 && (
            <div className="flex-shrink-0 w-32 h-full flex items-center justify-center">
              <span className="text-xs text-gray-500">End of row</span>
            </div>
          )}
        </div>

        {/* Edge gradients */}
        <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-black to-transparent pointer-events-none"></div>
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-black to-transparent pointer-events-none"></div>
      </div>
    </div>
  );
});

NetflixRow.displayName = 'NetflixRow';

export default NetflixRow;