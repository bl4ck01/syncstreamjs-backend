'use client';

import React from 'react';
import { Grid, List } from 'react-window';
import InfiniteLoader from 'react-window-infinite-loader';
import { Tv, Film, MonitorSpeaker, Search } from 'lucide-react';
import ContentCard from './content-card';
import ContentCardSkeleton from './skeleton-loading';

// Memoized content card for better performance
const MemoizedContentCard = React.memo(({ item, type, priority, isLoading }) => (
  <ContentCard 
    item={item} 
    type={type}
    priority={priority}
  />
));

MemoizedContentCard.displayName = 'MemoizedContentCard';

// Row component for horizontal scrolling (Netflix-style)
const HorizontalRow = React.memo(({ 
  index, 
  style, 
  data 
}) => {
  const { categories, activeTab, isSearchResults, performanceMode } = data;
  const category = categories[index];
  
  if (!category) {
    return null;
  }

  return (
    <div style={style} className="mb-8">
      <VirtualizedGrid
        category={category}
        activeTab={activeTab}
        isSearchResults={isSearchResults}
        performanceMode={performanceMode}
      />
    </div>
  );
});

GridCell.displayName = 'GridCell';

// Virtualized horizontal row component (Netflix-style)
const VirtualizedGrid = React.memo(({ 
  category, 
  activeTab, 
  isSearchResults = false, 
  performanceMode = false 
}) => {
  const containerRef = React.useRef(null);
  const [dimensions, setDimensions] = React.useState({ width: 0, height: 0 });

  // Calculate responsive item width
  const getItemWidth = () => {
    const width = window.innerWidth;
    if (width < 640) return 140; // sm
    if (width < 1024) return 160; // md
    if (width < 1280) return 176; // lg
    return 192; // xl
  };

  // Track container dimensions with debouncing
  React.useEffect(() => {
    if (!containerRef.current) return;

    let resizeTimeout;
    const updateDimensions = () => {
      if (containerRef.current) {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
          const rect = containerRef.current.getBoundingClientRect();
          setDimensions({
            width: rect.width,
            height: Math.max(400, rect.height) // Minimum height
          });
        }, 100); // Debounce resize events
      }
    };

    updateDimensions();
    const resizeObserver = new ResizeObserver(updateDimensions);
    resizeObserver.observe(containerRef.current);

    return () => {
      clearTimeout(resizeTimeout);
      resizeObserver.disconnect();
    };
  }, []);

  if (!category?.items || !Array.isArray(category.items) || category.items.length === 0) {
    return null;
  }

  const itemWidth = getItemWidth();
  const itemHeight = itemWidth * 1.5; // 16:9 aspect ratio
  const gap = 16;
  const totalItemWidth = itemWidth + gap;
  const totalItemHeight = itemHeight + gap;

  // Loading state with chunking
  const CHUNK_SIZE = 100; // Load 100 items at a time
  const MAX_VISIBLE_ITEMS = 1000; // Maximum items to keep in memory
  const [loadedItems, setLoadedItems] = React.useState([]);
  const [isLoadingMore, setIsLoadingMore] = React.useState(false);
  const [hasLoadedAll, setHasLoadedAll] = React.useState(false);

  // Calculate grid dimensions
  const cols = dimensions.width > 0 ? Math.max(1, Math.floor(dimensions.width / totalItemWidth)) : 1;
  const displayItems = loadedItems.length > 0 ? loadedItems : [];
  const rows = Math.max(1, Math.ceil(displayItems.length / cols));

  // Initialize with first chunk
  React.useEffect(() => {
    if (category.items && category.items.length > 0 && loadedItems.length === 0) {
      const firstChunk = category.items.slice(0, CHUNK_SIZE);
      setLoadedItems(firstChunk);
      setHasLoadedAll(category.items.length <= CHUNK_SIZE);
    }
  }, [category.items, loadedItems.length]);

  // Load more items in chunks
  const loadMoreItems = React.useCallback((startIndex, stopIndex) => {
    if (isLoadingMore || hasLoadedAll || !category.items) {
      return Promise.resolve();
    }

    setIsLoadingMore(true);
    
    return new Promise((resolve) => {
      // Simulate async loading
      setTimeout(() => {
        const nextChunkStart = loadedItems.length;
        const nextChunkEnd = Math.min(nextChunkStart + CHUNK_SIZE, category.items.length);
        const nextChunk = category.items.slice(nextChunkStart, nextChunkEnd);
        
        setLoadedItems(prev => {
          const newItems = [...prev, ...nextChunk];
          // Keep only the most recent MAX_VISIBLE_ITEMS to prevent memory issues
          if (newItems.length > MAX_VISIBLE_ITEMS) {
            return newItems.slice(-MAX_VISIBLE_ITEMS);
          }
          return newItems;
        });
        
        setHasLoadedAll(nextChunkEnd >= category.items.length);
        setIsLoadingMore(false);
        resolve();
      }, 300);
    });
  }, [isLoadingMore, hasLoadedAll, category.items, loadedItems.length]);

  // Check if item is loaded
  const isItemLoaded = React.useCallback((index) => {
    return index < loadedItems.length;
  }, [loadedItems]);

  // Check if item is loading
  const isItemLoading = React.useCallback((index) => {
    return !isItemLoaded(index) && index < (category.items?.length || 0);
  }, [isItemLoaded, category.items]);

  // Item data for grid cells
  const itemData = React.useMemo(() => {
    // Validate all required data before creating itemData
    if (!loadedItems || !Array.isArray(loadedItems) || loadedItems.length === 0) {
      return null;
    }
    
    if (typeof activeTab !== 'string' || typeof cols !== 'number') {
      return null;
    }
    
    return {
      items: loadedItems,
      activeTab,
      isItemLoaded: isItemLoaded || (() => true),
      isItemLoading: isItemLoading || (() => false),
      cols,
      totalItems: category.items?.length || 0,
      hasLoadedAll
    };
  }, [loadedItems, activeTab, isItemLoaded, isItemLoading, cols, category.items, hasLoadedAll]);

  // Calculate how many items to show based on viewport
  const getVisibleCount = () => {
    if (performanceMode) return 8;
    // Limit initial visible count for performance
    return Math.min(20, loadedItems.length);
  };

  const visibleCount = getVisibleCount();
  
  // Early return if no data to display
  if (!category || !category.items || category.items.length === 0) {
    return null;
  }

  return (
    <div className="px-4 sm:px-6 py-4 space-y-4">
      {/* Category Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold text-white">{category.name}</h2>
          <span className="text-sm text-neutral-400">
            {loadedItems.length} of {category.items?.length || 0} items loaded
          </span>
          {isSearchResults && (
            <span className="text-xs px-2 py-1 bg-blue-600/20 text-blue-400 rounded-full">
              Search Results
            </span>
          )}
          {(category.items.length > visibleCount) && (
            <span className="text-xs px-2 py-1 bg-purple-600/20 text-purple-400 rounded-full">
              Grid Layout
            </span>
          )}
        </div>
      </div>

      {/* Virtualized Grid */}
      <div ref={containerRef} className="relative">
        {dimensions.width > 0 && itemData ? (
          <InfiniteLoader
            isItemLoaded={isItemLoaded}
            itemCount={category.items?.length || 0}
            loadMoreItems={loadMoreItems}
          >
            {({ ref }) => (
              <Grid
                ref={ref}
                cellComponent={GridCell}
                cellProps={itemData}
                columnCount={cols}
                columnWidth={totalItemWidth}
                height={dimensions.height}
                rowCount={rows}
                rowHeight={totalItemHeight}
                className="overflow-hidden"
              />
            )}
          </InfiniteLoader>
        ) : (
          <div className="flex items-center justify-center h-64 text-neutral-400">
            <p>Preparing grid view...</p>
          </div>
        )}
        
        {/* Loading indicator at the bottom */}
        {isLoadingMore && (
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            <span className="ml-2 text-neutral-400 text-sm">Loading more items...</span>
          </div>
        )}
        
        {/* Load more button when not all items are loaded */}
        {!hasLoadedAll && !isLoadingMore && loadedItems.length > 0 && (
          <div className="flex items-center justify-center py-4">
            <button
              onClick={() => loadMoreItems()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
            >
              Load More Items ({Math.min(CHUNK_SIZE, (category.items?.length || 0) - loadedItems.length)} remaining)
            </button>
          </div>
        )}
      </div>
    </div>
  );
});

VirtualizedGrid.displayName = 'VirtualizedGrid';

// Main virtualized category list
const VirtualizedCategoryList = React.memo(({ 
  categories, 
  activeTab, 
  searchQuery, 
  isSearchResults = false, 
  performanceMode = false 
}) => {
  // Ensure categories is always an array
  const safeCategories = React.useMemo(() => {
    if (!Array.isArray(categories)) return [];
    return categories.filter(cat => 
      cat && 
      typeof cat === 'object' && 
      cat.items && 
      Array.isArray(cat.items) && 
      cat.items.length > 0
    );
  }, [categories]);

  // Empty state component
  if (safeCategories.length === 0) {
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
    <div className="h-full w-full overflow-y-auto space-y-6">
      {safeCategories.map((category, index) => (
        <VirtualizedGrid
          key={category.categoryId || `category-${index}`}
          category={category}
          activeTab={activeTab}
          isSearchResults={isSearchResults}
          performanceMode={performanceMode}
        />
      ))}
    </div>
  );
});

VirtualizedCategoryList.displayName = 'VirtualizedCategoryList';

export { VirtualizedCategoryList };