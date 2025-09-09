'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Tv, Film, MonitorSpeaker, Search } from 'lucide-react';
import ContentCard from './content-card';

// Category list with simple rendering
export default function VirtualCategoryList({ categories, activeTab, searchQuery, isSearchResults = false }) {
  // Ensure categories is always an array
  const safeCategories = Array.isArray(categories) ? categories : [];

  if (safeCategories.length === 0) {
    return (
      <EmptyState 
        activeTab={activeTab} 
        searchQuery={searchQuery}
        isSearchResults={isSearchResults}
      />
    );
  }

  return (
    <div className="h-full w-full overflow-y-auto">
      {safeCategories.map((category, index) => (
        <div key={category.categoryId || index} className="px-4 sm:px-6 py-4">
          <CategoryRowContent 
            category={category} 
            activeTab={activeTab}
            isSearchResults={isSearchResults}
          />
        </div>
      ))}
    </div>
  );
}

// Category row content with optimized horizontal scrolling
function CategoryRowContent({ category, activeTab, isSearchResults, onHeightCalculated }) {
  // Ensure category has required properties
  if (!category || !Array.isArray(category.items)) {
    return null;
  }

  const listRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const measureRef = useRef(null);
  const [showLeftScroll, setShowLeftScroll] = useState(false);
  const [showRightScroll, setShowRightScroll] = useState(false);
  
  // Limit items for performance - show only first 50 items for large categories
  const maxItems = 50;
  const displayItems = category.items.length > maxItems && !isSearchResults 
    ? category.items.slice(0, maxItems) 
    : category.items;
  const hasMoreItems = category.items.length > maxItems && !isSearchResults;

  // Responsive item sizing
  const getItemWidth = useCallback(() => {
    const width = window.innerWidth;
    if (width < 640) return 140; // sm
    if (width < 1024) return 160; // md
    if (width < 1280) return 176; // lg
    return 192; // xl
  }, []);

  const itemWidth = useMemo(() => getItemWidth(), [getItemWidth]);
  const gap = 16;

  // Measure container width
  useEffect(() => {
    if (!measureRef.current) return;
    
    const ro = new ResizeObserver((entries) => {
      const cr = entries[0]?.contentRect;
      if (cr?.width) {
        const width = Math.max(200, cr.width - 80); // Account for padding and scroll buttons
        setContainerWidth(width);
      }
    });
    
    ro.observe(measureRef.current);
    return () => ro.disconnect();
  }, []);

  // Check scroll position
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;

    const checkScroll = () => {
      setShowLeftScroll(list.scrollLeft > 0);
      setShowRightScroll(list.scrollLeft < list.scrollWidth - list.clientWidth);
    };

    list.addEventListener('scroll', checkScroll);
    checkScroll(); // Initial check

    return () => list.removeEventListener('scroll', checkScroll);
  }, [displayItems.length]);

  // Scroll functions
  const scroll = useCallback((direction) => {
    const list = listRef.current;
    if (!list) return;

    const scrollAmount = itemWidth * 2 + gap;
    const currentScroll = list.scrollLeft;
    
    if (direction === 'left') {
      list.scrollTo({ left: Math.max(0, currentScroll - scrollAmount), behavior: 'smooth' });
    } else {
      list.scrollTo({ left: currentScroll + scrollAmount, behavior: 'smooth' });
    }
  }, [itemWidth, gap]);

  // Calculate total width needed
  const totalWidth = useMemo(() => {
    const itemCount = hasMoreItems ? displayItems.length + 1 : displayItems.length;
    return itemCount * (itemWidth + gap) - gap;
  }, [displayItems.length, hasMoreItems, itemWidth, gap]);

  // Report height to parent
  useEffect(() => {
    if (measureRef.current) {
      const height = measureRef.current.offsetHeight;
      onHeightCalculated?.(height);
    }
  }, [displayItems.length, onHeightCalculated]);

  if (!category.items || category.items.length === 0) {
    return null;
  }

  return (
    <div ref={measureRef} className="space-y-4">
      {/* Category Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold text-white">{category.name}</h2>
          <span className="text-sm text-neutral-400">
            ({hasMoreItems ? `${displayItems.length}+` : category.items.length} {category.items.length === 1 ? 'item' : 'items'})
          </span>
          {isSearchResults && (
            <span className="text-xs px-2 py-1 bg-blue-600/20 text-blue-400 rounded-full">
              Search Results
            </span>
          )}
          {hasMoreItems && (
            <span className="text-xs px-2 py-1 bg-amber-600/20 text-amber-400 rounded-full">
              Large Category
            </span>
          )}
        </div>
        
        {totalWidth > containerWidth && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => scroll('left')}
              disabled={!showLeftScroll}
              className={`p-1 rounded-full transition-all ${
                showLeftScroll 
                  ? 'bg-neutral-700 hover:bg-neutral-600 text-white' 
                  : 'bg-neutral-800/50 text-neutral-600 cursor-not-allowed'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={() => scroll('right')}
              disabled={!showRightScroll}
              className={`p-1 rounded-full transition-all ${
                showRightScroll 
                  ? 'bg-neutral-700 hover:bg-neutral-600 text-white' 
                  : 'bg-neutral-800/50 text-neutral-600 cursor-not-allowed'
              }`}
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
            ref={listRef}
            className="flex gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory"
            style={{ 
              width: containerWidth,
              scrollSnapType: 'x mandatory',
              scrollBehavior: 'smooth'
            }}
          >
            {displayItems.map((item, index) => (
              <div
                key={item.stream_id || item.num || index}
                className="flex-shrink-0 snap-start"
                style={{ width: itemWidth }}
              >
                <ContentCard 
                  item={item} 
                  type={activeTab}
                  priority={index < 4} // Priority loading for first few items
                />
              </div>
            ))}
            {hasMoreItems && (
              <div className="flex-shrink-0 snap-start flex items-center justify-center" style={{ width: itemWidth }}>
                <div className="text-center p-4 bg-neutral-800/50 rounded-lg">
                  <p className="text-xs text-neutral-400 mb-2">
                    +{category.items.length - maxItems} more
                  </p>
                  <button 
                    className="text-xs px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-colors"
                    onClick={() => {
                      // This would open a detailed view or load more items
                      console.log('Load more items for category:', category.name);
                    }}
                  >
                    View All
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}


// Empty state component
function EmptyState({ activeTab, searchQuery, isSearchResults }) {
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