import { create } from 'zustand';
import React from 'react';

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
      
      set({ 
        allItems: items,
        visibleItems: items.slice(0, Math.min(50, items.length)), // Start with first 50 items
        startIndex: 0,
        endIndex: Math.min(49, items.length - 1),
        hasMore: items.length > 50
      });
    },
    
    // Update visible items based on scroll position
    updateVisibleItems: (scrollPosition, direction = 'none') => {
      const state = get();
      const { allItems, viewportSize, startIndex, endIndex } = state;
      
      if (allItems.length === 0) return;
      
      // Calculate item width (approximate)
      const itemWidth = 200;
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
        set({
          visibleItems: newVisibleItems,
          startIndex: newStartIndex,
          endIndex: newEndIndex
        });
      }
    },
    
    // Load more items (for infinite scroll)
    loadMoreItems: () => {
      const state = get();
      const { allItems, endIndex, viewportSize } = state;
      
      if (endIndex >= allItems.length - 1) {
        set({ hasMore: false });
        return;
      }
      
      set({ isLoading: true });
      
      // Simulate loading delay
      setTimeout(() => {
        const newEndIndex = Math.min(allItems.length - 1, endIndex + viewportSize);
        const newStartIndex = Math.max(0, newEndIndex - viewportSize + 1);
        const newVisibleItems = allItems.slice(newStartIndex, newEndIndex + 1);
        
        set({
          visibleItems: newVisibleItems,
          startIndex: newStartIndex,
          endIndex: newEndIndex,
          isLoading: false,
          hasMore: newEndIndex < allItems.length - 1
        });
      }, 100);
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
      set({
        visibleItems: [],
        isLoading: false,
        hasMore: true,
        startIndex: 0,
        endIndex: 0
      });
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