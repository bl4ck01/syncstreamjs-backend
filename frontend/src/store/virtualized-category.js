import { create } from 'zustand';
import React from 'react';
import { getCategoryStreams } from '@/lib/simple-database';

// Virtualized category store for managing individual categories
export const createVirtualizedCategoryStore = (categoryId, initialItems = []) => {
  return create((set, get) => ({
    // State
    categoryId,
    allItems: initialItems,
    visibleItems: [],
    isLoading: false,
    hasMore: true,
    startIndex: 0,
    endIndex: 0,
    viewportSize: 100, // Fixed maximum number of items to render at once
    loadedChunks: 0, // Track how many chunks we've loaded
    totalAvailableItems: initialItems.length, // Total items available in database
    chunkSize: 50, // Size of each loading chunk
    // Performance metrics
    loadStartTime: null,
    totalLoadTime: 0,
    loadCount: 0,
    averageLoadTime: 0,
    error: null,
    
    // Actions
    initializeItems: (items) => {
      // Don't initialize if items are the same as current allItems
      const currentItems = get().allItems;
      if (currentItems && currentItems.length === items.length) {
        const areItemsEqual = items.every((item, index) => 
          item === currentItems[index] || 
          (item.stream_id && currentItems[index]?.stream_id === item.stream_id) ||
          (item.num && currentItems[index]?.num === item.num)
        );
        if (areItemsEqual) {
          return; // Skip initialization if items are identical
        }
      }
      
      const initialChunkSize = Math.min(50, items.length);
      const endIndex = Math.min(initialChunkSize - 1, items.length - 1);
      
      console.log('[VirtualizedCategory] 🚀 Initializing category:', {
        categoryId,
        totalItems: items.length,
        initialChunkSize,
        endIndex,
        hasMore: items.length > initialChunkSize
      });
      
      set({ 
        allItems: items,
        visibleItems: items.slice(0, initialChunkSize),
        startIndex: 0,
        endIndex: endIndex,
        hasMore: items.length > initialChunkSize,
        loadedChunks: 1,
        totalAvailableItems: items.length
      });
    },
    
    // Update visible items based on scroll position
    updateVisibleItems: (scrollPosition, direction = 'none') => {
      const state = get();
      const { allItems, viewportSize, startIndex, endIndex } = state;
      
      if (allItems.length === 0) return;
      
      // Use responsive item width calculation (approximate)
      const getItemWidth = () => {
        if (typeof window === 'undefined') return 192; // Default width
        const width = window.innerWidth;
        if (width < 640) return 140; // sm
        if (width < 1024) return 160; // md
        if (width < 1280) return 176; // lg
        return 192; // xl
      };
      
      const itemWidth = getItemWidth();
      const gap = 16;
      
      // Calculate which item is at the center of the viewport
      const centerIndex = Math.floor(scrollPosition / (itemWidth + gap));
      const halfViewport = Math.floor(viewportSize / 2);
      
      // Calculate new visible range
      let newStartIndex = Math.max(0, centerIndex - halfViewport);
      let newEndIndex = Math.min(allItems.length - 1, centerIndex + halfViewport);
      
      // Ensure we don't exceed viewport size
      if (newEndIndex - newStartIndex >= viewportSize) {
        newEndIndex = newStartIndex + viewportSize - 1;
      }
      
      // Only update if the range actually changed
      if (newStartIndex !== startIndex || newEndIndex !== endIndex) {
        const newVisibleItems = allItems.slice(newStartIndex, newEndIndex + 1);
        
        console.log('[VirtualizedCategory] 🔄 Updating visible items:', {
          scrollPosition,
          itemWidth,
          gap,
          centerIndex,
          newStartIndex,
          newEndIndex,
          previousRange: `[${startIndex}-${endIndex}]`,
          newRange: `[${newStartIndex}-${newEndIndex}]`,
          visibleItemsCount: newVisibleItems.length
        });
        
        set({
          visibleItems: newVisibleItems,
          startIndex: newStartIndex,
          endIndex: newEndIndex
        });
      }
    },
    
    // Load more items (for infinite scroll) - Actual database queries
    loadMoreItems: async () => {
      const state = get();
      const { 
        allItems, 
        endIndex, 
        viewportSize, 
        isLoading, 
        loadedChunks, 
        totalAvailableItems,
        chunkSize,
        categoryId
      } = state;
      
      // Prevent concurrent loading calls
      if (isLoading) {
        console.log('[VirtualizedCategory] ⚠️ Already loading, skipping request');
        return;
      }
      
      // Check if we've loaded all available items
      if (endIndex >= totalAvailableItems - 1) {
        console.log('[VirtualizedCategory] ✅ Reached end of all available items');
        set({ hasMore: false });
        return;
      }
      
      // Calculate next chunk to load
      const nextChunkIndex = loadedChunks;
      const chunkStartIndex = nextChunkIndex * chunkSize;
      const chunkEndIndex = Math.min(chunkStartIndex + chunkSize - 1, totalAvailableItems - 1);
      
      console.log('[VirtualizedCategory] 🔄 Loading next chunk from database:', {
        categoryId,
        currentEndIndex: endIndex,
        chunkNumber: nextChunkIndex + 1,
        chunkStartIndex,
        chunkEndIndex,
        totalAvailableItems,
        chunkSize
      });
      
      // Start performance tracking
      const loadStartTime = performance.now();
      set({ 
        isLoading: true,
        loadStartTime
      });
      
      try {
        // Parse categoryId to extract playlist information
        // Assuming categoryId format: "playlistId|categoryName" or similar
        const categoryParts = categoryId.split('|');
        const playlistId = categoryParts[0];
        const categoryName = categoryParts[1] || categoryId;
        const type = categoryParts[2] || 'live'; // Default to live if not specified
        
        console.log('[VirtualizedCategory] 📡 Fetching from database:', {
          playlistId,
          categoryName,
          type,
          limit: chunkSize,
          offset: chunkStartIndex
        });
        
        // Fetch data from database
        const result = await getCategoryStreams(playlistId, categoryName, type, chunkSize, chunkStartIndex);
        
        console.log('[VirtualizedCategory] 📦 Database query result:', {
          streamsReceived: result.streams.length,
          totalAvailable: result.total,
          hasMore: chunkStartIndex + chunkSize < result.total
        });
        
        // Update total available items if database has different count
        const updatedTotalAvailable = result.total;
        const newEndIndex = Math.min(updatedTotalAvailable - 1, endIndex + result.streams.length);
        const newStartIndex = Math.max(0, newEndIndex - viewportSize + 1);
        
        // Merge new streams with existing ones
        const updatedAllItems = [...allItems];
        result.streams.forEach((stream, index) => {
          const targetIndex = chunkStartIndex + index;
          if (targetIndex < updatedAllItems.length) {
            updatedAllItems[targetIndex] = stream;
          } else {
            updatedAllItems.push(stream);
          }
        });
        
        // Get the visible items for the new extended range
        const newVisibleItems = updatedAllItems.slice(newStartIndex, newEndIndex + 1);
        
        const hasMoreItems = newEndIndex < updatedTotalAvailable - 1;
        
        // Calculate performance metrics
        const loadEndTime = performance.now();
        const loadTime = loadEndTime - loadStartTime;
        const newLoadCount = state.loadCount + 1;
        const newTotalLoadTime = state.totalLoadTime + loadTime;
        const newAverageLoadTime = newTotalLoadTime / newLoadCount;
        
        console.log('[VirtualizedCategory] ✅ Loaded new chunk from database:', {
          previousRange: `[${state.startIndex}-${state.endIndex}]`,
          newRange: `[${newStartIndex}-${newEndIndex}]`,
          previousEndIndex: state.endIndex,
          newEndIndex,
          itemsAdded: result.streams.length,
          visibleItemsCount: newVisibleItems.length,
          totalLoadedChunks: loadedChunks + 1,
          hasMore: hasMoreItems,
          loadTime: `${loadTime.toFixed(2)}ms`,
          averageLoadTime: `${newAverageLoadTime.toFixed(2)}ms`,
          totalLoadCount: newLoadCount,
          databaseTotal: updatedTotalAvailable,
          streamsReturned: result.streams.length
        });
        
        set({
          allItems: updatedAllItems,
          visibleItems: newVisibleItems,
          startIndex: newStartIndex,
          endIndex: newEndIndex,
          isLoading: false,
          hasMore: hasMoreItems,
          loadedChunks: loadedChunks + 1,
          totalAvailableItems: updatedTotalAvailable,
          totalLoadTime: newTotalLoadTime,
          loadCount: newLoadCount,
          averageLoadTime: newAverageLoadTime,
          loadStartTime: null
        });
        
      } catch (error) {
        console.error('[VirtualizedCategory] ❌ Database query failed:', error);
        
        // Calculate performance metrics even for errors
        const loadEndTime = performance.now();
        const loadTime = loadEndTime - loadStartTime;
        const newLoadCount = state.loadCount + 1;
        const newTotalLoadTime = state.totalLoadTime + loadTime;
        const newAverageLoadTime = newTotalLoadTime / newLoadCount;
        
        set({
          isLoading: false,
          error: error.message || 'Failed to load more items',
          totalLoadTime: newTotalLoadTime,
          loadCount: newLoadCount,
          averageLoadTime: newAverageLoadTime,
          loadStartTime: null
        });
      }
    },
    
    // Scroll to specific position
    scrollToIndex: (index) => {
      const state = get();
      const { allItems, viewportSize } = state;
      
      if (index < 0 || index >= allItems.length) return;
      
      const halfViewport = Math.floor(viewportSize / 2);
      const newStartIndex = Math.max(0, index - halfViewport);
      const newEndIndex = Math.min(allItems.length - 1, index + halfViewport);
      
      const newVisibleItems = allItems.slice(newStartIndex, newEndIndex + 1);
      
      set({
        visibleItems: newVisibleItems,
        startIndex: newStartIndex,
        endIndex: newEndIndex
      });
    },
    
    // Reset store
    reset: () => {
      console.log('[VirtualizedCategory] 🔄 Resetting store');
      set({
        visibleItems: [],
        isLoading: false,
        hasMore: true,
        startIndex: 0,
        endIndex: 0,
        loadedChunks: 0,
        error: null,
        loadStartTime: null,
        totalLoadTime: 0,
        loadCount: 0,
        averageLoadTime: 0
      });
    },

    // Handle loading errors
    setLoadingError: (error) => {
      console.error('[VirtualizedCategory] ❌ Loading error:', error);
      set({
        isLoading: false,
        hasMore: false,
        error: error
      });
    },

    // Clear error state
    clearError: () => {
      set({ error: null });
    }
  }));
};

// Global store manager for all category stores
export const useCategoryStoreManager = create((set, get) => ({
  stores: {},
  
  // Get or create store for a category
  getCategoryStore: (categoryId, initialItems = []) => {
    const state = get();
    
    if (!state.stores[categoryId]) {
      const newStore = createVirtualizedCategoryStore(categoryId, initialItems);
      set(prev => ({
        stores: {
          ...prev.stores,
          [categoryId]: newStore
        }
      }));
      return newStore;
    }
    
    return state.stores[categoryId];
  },
  
  // Remove store for a category
  removeCategoryStore: (categoryId) => {
    set(prev => {
      const newStores = { ...prev.stores };
      delete newStores[categoryId];
      return { stores: newStores };
    });
  },
  
  // Clear all stores
  clearAllStores: () => {
    set({ stores: {} });
  }
}));

// Hook to use a specific category store
export const useVirtualizedCategory = (categoryId, initialItems = []) => {
  const getCategoryStore = useCategoryStoreManager((state) => state.getCategoryStore);
  const storeCreator = getCategoryStore(categoryId, initialItems);
  const store = storeCreator();
  
  // Track initialization state to prevent infinite loops
  const isInitialized = React.useRef(false);
  const lastItemsLength = React.useRef(0);
  
  // Initialize items only when they actually change
  React.useEffect(() => {
    if (!initialItems || initialItems.length === 0) return;
    
    // Prevent re-initialization with the same items
    if (isInitialized.current && lastItemsLength.current === initialItems.length) {
      return;
    }
    
    // Check if items are actually different (simple length check for performance)
    const currentStoreItems = store.allItems || [];
    if (currentStoreItems.length === initialItems.length) {
      const areItemsEqual = initialItems.every((item, index) => 
        item === currentStoreItems[index] || 
        (item.stream_id && currentStoreItems[index]?.stream_id === item.stream_id) ||
        (item.num && currentStoreItems[index]?.num === item.num)
      );
      
      if (areItemsEqual) {
        isInitialized.current = true;
        lastItemsLength.current = initialItems.length;
        return;
      }
    }
    
    // Initialize with new items
    store.initializeItems(initialItems);
    isInitialized.current = true;
    lastItemsLength.current = initialItems.length;
  }, [initialItems, store]);
  
  return store;
};