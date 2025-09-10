'use client';

import React from 'react';
import { List } from 'react-window';
import { Tv, Film, MonitorSpeaker, Search } from 'lucide-react';
import ContentCard from './content-card';
import ContentCardSkeleton from './skeleton-loading';

// Memoized content card for better performance
const MemoizedContentCard = React.memo(({ item, type, priority }) => (
  <ContentCard 
    item={item} 
    type={type}
    priority={priority}
  />
));

MemoizedContentCard.displayName = 'MemoizedContentCard';

// Row component for react-window List
const RowRenderer = React.memo(({ index, style, data }) => {
  const { items, activeTab } = data;
  const item = items[index];
  if (!item) return null;

  return (
    <div style={style} className="snap-start">
      <MemoizedContentCard 
        item={item} 
        type={activeTab}
        priority={index < 6}
      />
    </div>
  );
});

RowRenderer.displayName = 'RowRenderer';

// Virtualized row component using react-window
const VirtualizedRow = React.memo(({ 
  category, 
  activeTab, 
  isSearchResults = false, 
  performanceMode = false 
}) => {
  if (!category?.items || !Array.isArray(category.items) || category.items.length === 0) {
    return null;
  }

  // Calculate responsive item width
  const getItemWidth = () => {
    const width = window.innerWidth;
    if (width < 640) return 140; // sm
    if (width < 1024) return 160; // md
    if (width < 1280) return 176; // lg
    return 192; // xl
  };

  const itemWidth = getItemWidth();
  const gap = 16;
  const totalItemWidth = itemWidth + gap;

  // Data for row renderer
  const itemData = React.useMemo(() => ({
    items: category.items,
    activeTab
  }), [category.items, activeTab]);

  // Calculate how many items to show based on viewport
  const getVisibleCount = () => {
    if (performanceMode) return 8;
    return Math.min(20, category.items.length);
  };

  const visibleCount = getVisibleCount();

  return (
    <div className="px-4 sm:px-6 py-4 space-y-4">
      {/* Category Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold text-white">{category.name}</h2>
          <span className="text-sm text-neutral-400">
            {category.items.length} items
          </span>
          {isSearchResults && (
            <span className="text-xs px-2 py-1 bg-blue-600/20 text-blue-400 rounded-full">
              Search Results
            </span>
          )}
          {(category.items.length > visibleCount) && (
            <span className="text-xs px-2 py-1 bg-purple-600/20 text-purple-400 rounded-full">
              Virtualized
            </span>
          )}
        </div>
      </div>

      {/* Virtualized Horizontal List */}
      <div className="relative">
        <List
          height={itemWidth + 32} // Height of one row + padding
          width="100%"
          itemCount={category.items.length}
          itemSize={totalItemWidth}
          itemData={itemData}
          layout="horizontal"
          className="overflow-x-auto scrollbar-hide snap-x snap-mandatory"
          direction="ltr"
        >
          {RowRenderer}
        </List>
      </div>
    </div>
  );
});

VirtualizedRow.displayName = 'VirtualizedRow';

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
        <VirtualizedRow
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