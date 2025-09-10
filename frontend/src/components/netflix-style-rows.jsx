'use client';

import React from 'react';
import { Tv, Film, MonitorSpeaker, Search } from 'lucide-react';
import ContentCard from './content-card';
import ContentCardSkeleton from './skeleton-loading';
import { Grid } from 'react-window';

// Memoized content card for better performance
const MemoizedContentCard = React.memo(({ item, type, priority, isLoading }) => (
  <ContentCard 
    item={item} 
    type={type}
    priority={priority}
    isLoading={isLoading}
  />
));

MemoizedContentCard.displayName = 'MemoizedContentCard';

// Netflix-style horizontal row component
const NetflixRow = React.memo(({ 
  category, 
  activeTab, 
  isSearchResults = false, 
  performanceMode = false 
}) => {
  const containerRef = React.useRef(null);
  const [dimensions, setDimensions] = React.useState({ width: 0, height: 0 });

  // Debug container ref
  React.useEffect(() => {
    console.log('[NetflixRow] 📦 Container ref debug:', {
      categoryId: category.categoryId || category.name,
      containerRef: containerRef.current,
      containerExists: !!containerRef.current,
      containerWidth: containerRef.current?.offsetWidth,
      containerHeight: containerRef.current?.offsetHeight
    });
  }, [category.categoryId, category.name]);

  // Calculate responsive item dimensions (Netflix-style)
  const getItemWidth = () => {
    const width = window.innerWidth;
    if (width < 640) return 120; // sm - mobile
    if (width < 1024) return 160; // md - tablet
    if (width < 1280) return 200; // lg - desktop
    return 240; // xl - large desktop
  };

  const itemWidth = getItemWidth();
  const itemHeight = itemWidth * 1.5; // 16:9 aspect ratio for movies
  const gap = 12; // Smaller gap for tighter Netflix-style layout

  // Track container dimensions for horizontal scrolling
  React.useEffect(() => {
    if (!containerRef.current) return;

    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const newDimensions = {
          width: Math.max(0, rect.width),
          height: Math.max(100, itemHeight + 20) // Extra space for title
        };
        console.log('[NetflixRow] 📏 Updating dimensions:', {
          categoryId: category.categoryId || category.name,
          rect: { width: rect.width, height: rect.height },
          newDimensions,
          itemHeight
        });
        setDimensions(newDimensions);
      }
    };

    // Initial update
    updateDimensions();
    
    // Set up resize observer with debounce
    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(updateDimensions);
    });
    
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [itemHeight, category.categoryId, category.name]);

  // Fallback: if dimensions are still 0 after a delay, use window width
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (dimensions.width === 0 && containerRef.current) {
        const fallbackWidth = Math.max(0, containerRef.current.offsetWidth || window.innerWidth - 32); // Account for padding
        const fallbackHeight = Math.max(100, itemHeight + 20);
        console.log('[NetflixRow] 🔄 Using fallback dimensions:', {
          categoryId: category.categoryId || category.name,
          fallbackWidth,
          fallbackHeight,
          windowWidth: window.innerWidth
        });
        setDimensions({ width: fallbackWidth, height: fallbackHeight });
      }
    }, 1000); // Wait 1 second before fallback

    return () => clearTimeout(timer);
  }, [dimensions.width, itemHeight, category.categoryId, category.name]);

  if (!category?.items || !Array.isArray(category.items) || category.items.length === 0) {
    return null;
  }

  // Loading state with chunking for horizontal scrolling
  const CHUNK_SIZE = 50; // Smaller chunks for horizontal scrolling
  const MAX_VISIBLE_ITEMS = 200; // Keep fewer items in memory for horizontal
  const [loadedItems, setLoadedItems] = React.useState([]);
  const [isLoadingMore, setIsLoadingMore] = React.useState(false);
  const [hasLoadedAll, setHasLoadedAll] = React.useState(false);

  // Initialize with first chunk
  React.useEffect(() => {
    console.log('[NetflixRow] 🔍 Chunk initialization check:', {
      categoryId: category.categoryId || category.name,
      hasCategoryItems: !!category.items,
      categoryItemsLength: category.items?.length,
      loadedItemsLength: loadedItems.length,
      shouldInitialize: category.items && category.items.length > 0 && loadedItems.length === 0
    });

    if (category.items && category.items.length > 0 && loadedItems.length === 0) {
      console.log('[NetflixRow] 🚀 Initializing first chunk:', {
        categoryId: category.categoryId || category.name,
        totalItems: category.items.length,
        chunkSize: CHUNK_SIZE,
        firstChunkLength: Math.min(CHUNK_SIZE, category.items.length),
        firstItemSample: category.items[0],
        categoryItemsType: typeof category.items[0],
        isArray: Array.isArray(category.items)
      });
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
        resolve();
      }, 200);
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

  // Row renderer function for react-window List
  const ItemRenderer = ({ index, style }) => {
    // Validate props
    if (typeof index !== 'number' || !style) {
      return null;
    }

    const item = loadedItems[index];
    const isLoading = !isItemLoaded(index);

    if (!item && !isLoading) {
      return null;
    }

    if (isLoading) {
      return (
        <div style={style} className="flex-shrink-0">
          <ContentCardSkeleton />
        </div>
      );
    }

    return (
      <div style={style} className="flex-shrink-0">
        <MemoizedContentCard 
          item={item} 
          type={activeTab}
          priority={index < 6}
          isLoading={isLoading}
        />
      </div>
    );
  };

  console.log('[NetflixRow] 🎬 Render state:', {
    categoryId: category.categoryId || category.name,
    dimensions,
    loadedItemsLength: loadedItems.length,
    totalItems: category.items?.length,
    hasLoadedAll,
    isLoadingMore,
    itemWidth,
    itemHeight,
    gap,
    canRender: dimensions.width > 0 && loadedItems.length > 0 && typeof ItemRenderer === 'function'
  });

  return (
    <div className="space-y-3 mb-8">
      {/* Netflix-style Category Header */}
      <div className="flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-white hover:text-red-500 transition-colors cursor-pointer">
            {category.name}
          </h2>
          <span className="text-xs text-neutral-400">
            {loadedItems.length} of {category.items?.length || 0}
          </span>
          {isSearchResults && (
            <span className="text-xs px-2 py-1 bg-red-600/20 text-red-400 rounded-full">
              Search
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!hasLoadedAll && (
            <button className="text-xs text-neutral-400 hover:text-white transition-colors">
              Explore →
            </button>
          )}
        </div>
      </div>

      {/* Horizontal Scrolling Container */}
      <div ref={containerRef} className="relative">
        {(() => {
          // React.memo returns a special "react.memo" object which is not a plain function, breaking this check.
          // We simplified ItemRenderer above, so just verify we have items to show.
          const canRender = loadedItems.length > 0;
          const width = Math.max(300, dimensions.width || window.innerWidth - 32); // Ensure minimum width
          const height = Math.max(200, dimensions.height || itemHeight + 40); // Ensure minimum height
          
          console.log('[NetflixRow] 🎯 List render decision:', {
            categoryId: category.categoryId || category.name,
            canRender,
            loadedItemsLength: loadedItems.length,
            isItemLoadedFunction: typeof isItemLoaded === 'function',
            loadMoreItemsFunction: typeof loadMoreItems === 'function',
            width,
            height,
            itemSize: Math.max(50, itemWidth + gap)
          });

          if (!canRender) {
            return (
              <div className="flex items-center justify-center h-32 text-neutral-400">
                <p>
                  {loadedItems.length === 0 ? 'Loading items...' : 'Preparing content...'}
                </p>
              </div>
            );
          }

          // v2 Grid cell renderer (cellProps are spread into top-level props)
          const Cell = ({ columnIndex, style, loadedItems, activeTab }) => {
            const item = loadedItems[columnIndex];
            if (!item) return null;
            
            return (
              <div style={style} className="flex-shrink-0">
                <ContentCard 
                  item={item} 
                  type={activeTab}
                  priority={columnIndex < 6}
                />
              </div>
            );
          };
          
          return (
            <Grid
              cellComponent={Cell}
              cellProps={{ loadedItems, activeTab }}
              columnCount={loadedItems.length}
              columnWidth={itemWidth + gap}
              height={height}
              rowCount={1}
              rowHeight={itemHeight}
              width={width}
            />
          );
        })()}
        
        {/* Loading overlay */}
        {isLoadingMore && (
          <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-neutral-950 to-transparent flex items-center justify-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-500"></div>
          </div>
        )}
      </div>
    </div>
  );
});

NetflixRow.displayName = 'NetflixRow';

// Main virtualized category list with Netflix-style layout
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
    return categories.filter(cat => {
      if (!cat || typeof cat !== 'object') return false;

      // some playlist structures expose the list under `streams` instead of `items`
      const itemsArray = Array.isArray(cat.items)
        ? cat.items
        : (Array.isArray(cat.streams) ? cat.streams : []);

      return itemsArray.length > 0;
    }).map(cat => {
      // normalise so that downstream components can reliably use `items`
      if (!cat.items && Array.isArray(cat.streams)) {
        return { ...cat, items: cat.streams };
      }
      return cat;
    });
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
    <div className="h-full w-full overflow-y-auto">
      {safeCategories.map((category, index) => (
        <NetflixRow
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