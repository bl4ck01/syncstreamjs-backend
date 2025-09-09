'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Tv, Film, MonitorSpeaker, Search } from 'lucide-react';
import ContentCard from './content-card';
import ContentCardSkeleton from './skeleton-loading';

// Netflix-style virtualized category row
export default function NetflixCategoryRow({ category, activeTab, isSearchResults = false, performanceMode = false }) {
  const rowRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);
  const [containerWidth, setContainerWidth] = useState(0);
  const [visibleItems, setVisibleItems] = useState(performanceMode ? 10 : 20); // Start with fewer items in performance mode
  const [isLoading, setIsLoading] = useState(false);
  
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
  
  // Performance mode optimizations
  const itemsPerViewport = Math.max(1, Math.floor(containerWidth / (itemWidth + gap)));
  const itemsToLoad = performanceMode ? itemsPerViewport * 2 : itemsPerViewport * 3; // Load fewer items in performance mode
  
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
        rootMargin: performanceMode ? '100px' : '200px', // Earlier loading in performance mode
        threshold: performanceMode ? 0.05 : 0.1 // Lower threshold for performance mode
      }
    );
    
    observer.observe(rowRef.current);
    return () => observer.disconnect();
  }, []);
  
  // Measure container width
  useEffect(() => {
    if (!rowRef.current) return;
    
    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        const contentRect = entry.contentRect;
        const width = Math.max(200, contentRect.width - 80); // Account for padding
        setContainerWidth(width);
      }
    });
    
    resizeObserver.observe(rowRef.current);
    return () => resizeObserver.disconnect();
  }, []);
  
  // Load more items when user scrolls near the end
  const loadMoreItems = useCallback(() => {
    if (isLoading || !isVisible || visibleItems >= category.items.length) return;
    
    setIsLoading(true);
    
    // Simulate loading delay for better UX (shorter delay in performance mode)
    setTimeout(() => {
      setVisibleItems(prev => Math.min(
        prev + itemsToLoad,
        category.items.length
      ));
      setIsLoading(false);
    }, performanceMode ? 150 : 300);
  }, [isLoading, isVisible, visibleItems, category.items.length, itemsToLoad]);
  
  // Setup scroll listener for infinite scroll
  useEffect(() => {
    if (!rowRef.current || !isVisible) return;
    
    const handleScroll = () => {
      if (!rowRef.current) return;
      
      const scrollLeft = rowRef.current.scrollLeft;
      const scrollWidth = rowRef.current.scrollWidth;
      const clientWidth = rowRef.current.clientWidth;
      
      // Load more when user scrolls to 80% of content (90% in performance mode for earlier loading)
      const threshold = performanceMode ? 0.9 : 0.8;
      if (scrollLeft + clientWidth >= scrollWidth * threshold) {
        loadMoreItems();
      }
    };
    
    const scrollContainer = rowRef.current.querySelector('.scroll-container');
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll);
      return () => scrollContainer.removeEventListener('scroll', handleScroll);
    }
  }, [isVisible, loadMoreItems]);
  
  // Reset visible items when category changes
  useEffect(() => {
    setVisibleItems(20);
    setIsVisible(false);
  }, [category.categoryId]);
  
  // Items to display
  const displayItems = useMemo(() => {
    if (!isVisible) return [];
    return category.items.slice(0, visibleItems);
  }, [category.items, visibleItems, isVisible]);
  
  // Loading skeletons
  const skeletonCount = isLoading ? Math.min(itemsToLoad, category.items.length - visibleItems) : 0;
  
  if (!category.items || category.items.length === 0) {
    return null;
  }
  
  return (
    <div ref={rowRef} className="px-4 sm:px-6 py-4 space-y-4">
      {/* Category Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold text-white">{category.name}</h2>
          <span className="text-sm text-neutral-400">
            ({category.items.length} {category.items.length === 1 ? 'item' : 'items'})
          </span>
          {isSearchResults && (
            <span className="text-xs px-2 py-1 bg-blue-600/20 text-blue-400 rounded-full">
              Search Results
            </span>
          )}
          {category.items.length > 50 && !isSearchResults && (
            <span className="text-xs px-2 py-1 bg-amber-600/20 text-amber-400 rounded-full">
              Large Category
            </span>
          )}
        </div>
        
        {/* Scroll buttons - only show if needed */}
        {containerWidth > 0 && displayItems.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const scrollContainer = rowRef.current?.querySelector('.scroll-container');
                if (scrollContainer) {
                  scrollContainer.scrollBy({ left: -(itemWidth * 3 + gap * 3), behavior: 'smooth' });
                }
              }}
              className="p-1 rounded-full transition-all bg-neutral-700 hover:bg-neutral-600 text-white disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={() => {
                const scrollContainer = rowRef.current?.querySelector('.scroll-container');
                if (scrollContainer) {
                  scrollContainer.scrollBy({ left: itemWidth * 3 + gap * 3, behavior: 'smooth' });
                }
              }}
              className="p-1 rounded-full transition-all bg-neutral-700 hover:bg-neutral-600 text-white disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}
      </div>
      
      {/* Horizontal Scrollable Content */}
      <div className="relative">
        {containerWidth > 0 && (
          <div
            className="scroll-container flex gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory"
            style={{ 
              width: containerWidth,
              scrollBehavior: 'smooth'
            }}
          >
            {/* Content Cards */}
            {displayItems.map((item, index) => (
              <div
                key={item.stream_id || item.num || index}
                className="flex-shrink-0 snap-start"
                style={{ width: itemWidth }}
              >
                <ContentCard 
                  item={item} 
                  type={activeTab}
                  priority={index < 6} // Priority loading for first 6 items
                />
              </div>
            ))}
            
            {/* Loading Skeletons */}
            {Array.from({ length: skeletonCount }).map((_, index) => (
              <ContentCardSkeleton key={`skeleton-${index}`} />
            ))}
            
            {/* Load More Indicator */}
            {visibleItems < category.items.length && (
              <div className="flex-shrink-0 snap-start flex items-center justify-center" style={{ width: itemWidth }}>
                <div className="text-center p-4 bg-neutral-800/50 rounded-lg">
                  <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-xs text-neutral-400">
                    Loading {Math.min(itemsToLoad, category.items.length - visibleItems)} more...
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Netflix-style virtualized category list
export function NetflixCategoryList({ categories, activeTab, searchQuery, isSearchResults = false, performanceMode = false }) {
  // Ensure categories is always an array
  const safeCategories = Array.isArray(categories) ? categories : [];
  
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
      {safeCategories.map((category, index) => (
        <NetflixCategoryRow
          key={category.categoryId || index}
          category={category}
          activeTab={activeTab}
          isSearchResults={isSearchResults}
          performanceMode={performanceMode}
        />
      ))}
    </div>
  );
}