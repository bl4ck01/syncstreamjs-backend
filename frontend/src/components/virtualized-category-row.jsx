'use client';

import React, { useState, useRef, useEffect, useMemo, useCallback, useReducer } from 'react';
import { Tv, Film, MonitorSpeaker, Search } from 'lucide-react';
import ContentCard from './content-card';
import ContentCardSkeleton from './skeleton-loading';
import { useVirtualizedCategory } from '@/store/virtualized-category';

// Memoized category item component
const MemoizedContentCard = React.memo(({ item, type, priority }) => (
  <ContentCard 
    item={item} 
    type={type}
    priority={priority}
  />
));

MemoizedContentCard.displayName = 'MemoizedContentCard';

// Truly virtualized category row with fixed 100-item render limit
const VirtualizedCategoryRow = React.memo(({ category, activeTab, isSearchResults = false, performanceMode = false }) => {
  const rowRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  
  // Debug received props with stable component ID
  const componentId = useMemo(() => {
    if (category?.categoryId) {
      return `${category.categoryId}-${activeTab}`;
    }
    return `category-${activeTab}`;
  }, [category?.categoryId, activeTab]);
  
  console.log(`[VirtualizedCategoryRow] 📦 Received props [${componentId}]:`, {
    category,
    categoryType: typeof category,
    categoryKeys: Object.keys(category || {}),
    activeTab,
    isSearchResults,
    performanceMode
  });

  // Debug update mechanism (removed forced updates to prevent infinite loops)
  
  // Enhanced real-time debug state
  const [debugInfo, setDebugInfo] = useState({
    scrollPosition: 0,
    scrollWidth: 0,
    clientWidth: 0,
    lastScrollTime: 0,
    scrollEvents: 0,
    componentMounted: true, // Start as true since component is mounted
    scrollListenerAttached: false,
    containerWidthMeasured: false,
    isVisible: false,
    lastStateUpdate: Date.now(),
    loadingAttempts: 0,
    errorCount: 0,
    dataFetchTime: 0,
    forcedUpdateCount: 0,
    retryCount: 0,
    lastErrorTime: 0,
    recoveryAttempts: 0
  });
  
  // Early return if category is not valid
  if (!category || typeof category !== 'object' || !category.items || !Array.isArray(category.items)) {
    console.log(`[VirtualizedCategoryRow] ⚠️ Invalid category [${componentId}]:`, {
      category,
      categoryType: typeof category,
      hasItems: !!category?.items,
      isItemsArray: Array.isArray(category?.items),
      categoryKeys: category ? Object.keys(category) : 'N/A'
    });
    return null;
  }
  
  // Simple debug update helper without forced re-renders
  const updateDebugInfo = useCallback((newInfo) => {
    setDebugInfo(prev => ({
      ...prev,
      ...newInfo,
      lastStateUpdate: Date.now()
    }));
  }, []);

  // Memoized retry mechanism with stable dependencies
  const retryWithErrorBackoff = useCallback(async (operation, maxRetries = 3) => {
    let retryCount = 0;
    let lastError = null;
    
    while (retryCount < maxRetries) {
      try {
        const result = await operation();
        setDebugInfo(prev => ({
          ...prev,
          retryCount: 0,
          lastErrorTime: 0,
          recoveryAttempts: prev.recoveryAttempts + 1
        }));
        return result;
      } catch (error) {
        lastError = error;
        retryCount++;
        
        console.error(`[VirtualizedCategoryRow] ❌ Retry ${retryCount}/${maxRetries} failed:`, error);
        
        setDebugInfo(prev => ({
          ...prev,
          retryCount,
          lastErrorTime: Date.now(),
          errorCount: prev.errorCount + 1
        }));
        
        // Exponential backoff: 1s, 2s, 4s
        const delay = Math.pow(2, retryCount - 1) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError;
  }, []);
  
  // Enhanced component lifecycle logging
  console.log(`[VirtualizedCategoryRow] 🚀 Component Mounting [${componentId}]:`, {
    category,
    categoryType: typeof category,
    itemsLength: category.items?.length,
    firstItem: category.items?.[0],
    categoryName: category.name,
    categoryId: category.categoryId,
    timestamp: Date.now(),
    mountId: componentId
  });

  // Simplified component lifecycle with minimal state updates
  React.useEffect(() => {
    console.log(`[VirtualizedCategoryRow] ✅ Component Mounted [${componentId}]`);
    
    return () => {
      console.log(`[VirtualizedCategoryRow] 💀 Component Unmounting [${componentId}]`);
    };
  }, [componentId]);
  
  // Use virtualized category store with memoized store ID
  const storeId = useMemo(() => 
    category?.categoryId || `category-${componentId}`,
    [category?.categoryId, componentId]
  );
  
  const categoryStore = useVirtualizedCategory(
    storeId,
    category?.items || []
  );
  
  // Memoized store data extraction
  const storeData = useMemo(() => ({
    visibleItems: categoryStore.visibleItems || [],
    isLoading: categoryStore.isLoading || false,
    hasMore: categoryStore.hasMore || false,
    loadMoreItems: categoryStore.loadMoreItems || (() => {}),
    error: categoryStore.error || null,
    clearError: categoryStore.clearError || (() => {}),
    loadedChunks: categoryStore.loadedChunks || 0,
    totalAvailableItems: categoryStore.totalAvailableItems || 0,
    chunkSize: categoryStore.chunkSize || 50,
    averageLoadTime: categoryStore.averageLoadTime || 0,
    loadCount: categoryStore.loadCount || 0,
    totalLoadTime: categoryStore.totalLoadTime || 0,
    startIndex: categoryStore.startIndex || 0,
    endIndex: categoryStore.endIndex || 0
  }), [categoryStore]);
  
  const { 
    visibleItems, 
    isLoading, 
    hasMore, 
    loadMoreItems, 
    error,
    clearError,
    loadedChunks,
    totalAvailableItems,
    chunkSize,
    averageLoadTime,
    loadCount,
    totalLoadTime,
    startIndex,
    endIndex
  } = storeData;
  
  // Enhanced store debugging
  console.log(`[VirtualizedCategoryRow] 📊 Store Initialized [${componentId}]:`, {
    storeId,
    storeType: typeof categoryStore,
    hasStoreMethods: typeof categoryStore.loadMoreItems === 'function',
    visibleItemsLength: visibleItems.length,
    isLoading,
    hasMore,
    loadedChunks,
    totalAvailableItems,
    chunkSize,
    startIndex,
    endIndex,
    renderRange: `[${startIndex}-${endIndex}]`,
    storeMethods: Object.keys(categoryStore).filter(key => typeof categoryStore[key] === 'function')
  });
  
  // Memoized safe visible items array
  const safeVisibleItems = useMemo(() => 
    Array.isArray(visibleItems) ? visibleItems : [],
    [visibleItems]
  );
  
  // Memoized item calculations
  const itemMetrics = useMemo(() => {
    const width = window.innerWidth;
    let itemWidth;
    if (width < 640) itemWidth = 140; // sm
    else if (width < 1024) itemWidth = 160; // md
    else if (width < 1280) itemWidth = 176; // lg
    else itemWidth = 192; // xl
    
    const gap = 16;
    const itemsPerViewport = Math.max(1, Math.floor(containerWidth / (itemWidth + gap)));
    
    return { itemWidth, gap, itemsPerViewport };
  }, [containerWidth]);
  
  const { itemWidth, gap, itemsPerViewport } = itemMetrics;
  
  // Use intersection observer to detect when row is visible with enhanced debugging and proper cleanup
  useEffect(() => {
    if (!rowRef.current) {
      console.log(`[VirtualizedCategoryRow] ⚠️ No row ref available for intersection observer [${componentId}]`);
      return;
    }
    
    console.log(`[VirtualizedCategoryRow] 👁️ Setting up intersection observer [${componentId}]`, {
      rowRef: !!rowRef.current,
      performanceMode,
      rootMargin: performanceMode ? '100px' : '200px',
      threshold: performanceMode ? 0.05 : 0.1
    });
    
    let observer = null;
    let isMounted = true;
    
    try {
      observer = new IntersectionObserver(
        ([entry]) => {
          if (!isMounted) return;
          
          console.log(`[VirtualizedCategoryRow] 🎯 Intersection Observer Callback [${componentId}]:`, {
            isIntersecting: entry.isIntersecting,
            intersectionRatio: entry.intersectionRatio,
            boundingClientRect: entry.boundingClientRect,
            intersectionRect: entry.intersectionRect,
            rootBounds: entry.rootBounds,
            time: entry.time
          });
          
          if (entry.isIntersecting) {
            console.log(`[VirtualizedCategoryRow] ✅ Row became visible, setting isVisible to true [${componentId}]`);
            setIsVisible(true);
            setDebugInfo(prev => ({
              ...prev,
              isVisible: true,
              forcedUpdateCount: prev.forcedUpdateCount + 1
            }));
            
            // Safe cleanup
            if (observer) {
              observer.unobserve(entry.target);
            }
          }
        },
        {
          rootMargin: performanceMode ? '100px' : '200px',
          threshold: performanceMode ? 0.05 : 0.1
        }
      );
      
      observer.observe(rowRef.current);
    } catch (error) {
      console.error(`[VirtualizedCategoryRow] ❌ Error setting up intersection observer [${componentId}]:`, error);
    }
    
    return () => {
      console.log(`[VirtualizedCategoryRow] 🧹 Cleaning up intersection observer [${componentId}]`);
      isMounted = false;
      if (observer) {
        observer.disconnect();
        observer = null;
      }
    };
  }, [performanceMode, componentId]);
  
  // Measure container width with enhanced debugging and proper cleanup
  useEffect(() => {
    if (!rowRef.current) {
      console.log(`[VirtualizedCategoryRow] ⚠️ No row ref available for resize observer [${componentId}]`);
      return;
    }
    
    console.log(`[VirtualizedCategoryRow] 📏 Setting up resize observer [${componentId}]`, {
      rowRef: !!rowRef.current,
      currentContainerWidth: containerWidth
    });
    
    let resizeObserver = null;
    let isMounted = true;
    
    try {
      resizeObserver = new ResizeObserver((entries) => {
        if (!isMounted) return;
        
        const entry = entries[0];
        if (entry) {
          const contentRect = entry.contentRect;
          const newWidth = Math.max(200, contentRect.width - 80);
          
          // Only update if the width change is significant (more than 5px)
          if (Math.abs(newWidth - containerWidth) > 5) {
            console.log(`[VirtualizedCategoryRow] 📐 Resize Observer Callback [${componentId}]:`, {
              contentRect,
              newWidth,
              oldWidth: containerWidth,
              widthDiff: newWidth - containerWidth,
              entriesCount: entries.length
            });
            
            setContainerWidth(newWidth);
          }
        }
      });
      
      resizeObserver.observe(rowRef.current);
    } catch (error) {
      console.error(`[VirtualizedCategoryRow] ❌ Error setting up resize observer [${componentId}]:`, error);
    }
    
    return () => {
      console.log(`[VirtualizedCategoryRow] 🧹 Cleaning up resize observer [${componentId}]`);
      isMounted = false;
      if (resizeObserver) {
        resizeObserver.disconnect();
        resizeObserver = null;
      }
    };
  }, [componentId]);
  
  // Update debug info when container width changes (separate from resize observer)
  useEffect(() => {
    if (containerWidth > 0) {
      setDebugInfo(prev => ({
        ...prev,
        containerWidthMeasured: true
      }));
    }
  }, [containerWidth]);
  
  // Ensure scroll container is properly initialized when container width changes
  useEffect(() => {
    if (containerWidth > 0 && scrollContainerRef.current && isVisible) {
      // Trigger a scroll check to ensure everything is properly set up
      const scrollContainer = scrollContainerRef.current;
      console.log(`[VirtualizedCategoryRow] 🔄 Container width changed, reinitializing scroll [${componentId}]:`, {
        containerWidth,
        scrollContainer: !!scrollContainer,
        scrollWidth: scrollContainer.scrollWidth,
        clientWidth: scrollContainer.clientWidth,
        canScroll: scrollContainer.scrollWidth > scrollContainer.clientWidth
      });
      
      // Trigger a scroll event to update the state
      const event = new Event('scroll');
      scrollContainer.dispatchEvent(event);
    }
  }, [containerWidth, isVisible, componentId]);
  
  // Handle scroll events for virtualization with robust container management
  useEffect(() => {
    // Validate prerequisites
    if (!scrollContainerRef.current) {
      console.log(`[VirtualizedCategoryRow] ⚠️ No scroll container ref available [${componentId}]`);
      return;
    }
    
    if (!isVisible) {
      console.log(`[VirtualizedCategoryRow] ⏳ Row not visible, skipping scroll setup [${componentId}]`);
      return;
    }
    
    const scrollContainer = scrollContainerRef.current;
    
    // Validate container state
    const containerState = {
      scrollContainer: !!scrollContainer,
      scrollWidth: scrollContainer.scrollWidth,
      clientWidth: scrollContainer.clientWidth,
      scrollLeft: scrollContainer.scrollLeft,
      canScroll: scrollContainer.scrollWidth > scrollContainer.clientWidth,
      containerWidth: containerWidth,
      itemWidth,
      gap,
      itemsPerViewport
    };
    
    console.log(`[VirtualizedCategoryRow] 🎯 Setting up scroll listener [${componentId}]:`, containerState);
    
    // Track scroll state
    let lastScrollTime = 0;
    let scrollThrottleTimeout = null;
    let isScrolling = false;
    
    const handleScroll = () => {
      if (!scrollContainerRef.current) return;
      
      const now = Date.now();
      const scrollLeft = scrollContainer.scrollLeft;
      const scrollWidth = scrollContainer.scrollWidth;
      const clientWidth = scrollContainer.clientWidth;
      
      // Update scroll position state
      setScrollPosition(scrollLeft);
      
      // Update debug info with throttling
      if (now - lastScrollTime > 100) { // Update debug every 100ms
        updateDebugInfo({
          scrollPosition: scrollLeft,
          scrollWidth,
          clientWidth,
          lastScrollTime: now,
          scrollEvents: debugInfo.scrollEvents + 1
        });
        lastScrollTime = now;
      }
      
      // Calculate visibility
      const firstVisibleIndex = Math.floor(scrollLeft / (itemWidth + gap));
      const lastVisibleIndex = Math.min(
        (category.items?.length || 0) - 1,
        firstVisibleIndex + itemsPerViewport
      );
      
      // Enhanced scroll event logging (throttled)
      if (!scrollThrottleTimeout) {
        scrollThrottleTimeout = setTimeout(() => {
          console.log(`[VirtualizedCategoryRow] 📜 Scroll Event [${componentId}]:`, {
            scrollLeft,
            scrollWidth,
            clientWidth,
            itemWidth,
            gap,
            itemsPerViewport,
            firstVisibleIndex,
            lastVisibleIndex,
            scrollProgress: `${Math.round((scrollLeft / scrollWidth) * 100)}%`,
            viewportProgress: `${Math.round(((scrollLeft + clientWidth) / scrollWidth) * 100)}%`,
            hasMore,
            isLoading,
            error: error ? error.message || error : null,
            canScroll: scrollWidth > clientWidth,
            isScrolling,
            timestamp: now
          });
          scrollThrottleTimeout = null;
        }, 200); // Throttle scroll logs to every 200ms
      }
      
      // Update visible items in store (debounced)
      if (!isScrolling) {
        isScrolling = true;
        requestAnimationFrame(() => {
          try {
            categoryStore.updateVisibleItems(scrollLeft, 'scroll');
          } catch (err) {
            console.error(`[VirtualizedCategoryRow] ❌ Error updating visible items:`, err);
          }
          isScrolling = false;
        });
      }
      
      // Auto-loading logic with enhanced validation
      const threshold = performanceMode ? 0.7 : 0.6;
      const scrollProgress = scrollLeft + clientWidth;
      const thresholdPosition = scrollWidth * threshold;
      const shouldLoad = scrollProgress >= thresholdPosition;
      
      if (shouldLoad && hasMore && !isLoading && !error) {
        console.log(`[VirtualizedCategoryRow] 🚀 Triggering Auto-loading [${componentId}] at ${Math.round(threshold * 100)}% threshold:`, {
          currentScroll: scrollLeft,
          viewportEnd: scrollProgress,
          threshold: `${Math.round(threshold * 100)}%`,
          thresholdPosition,
          totalItems: category.items?.length || 0,
          loadedChunks,
          totalAvailableItems,
          scrollWidth,
          clientWidth,
          shouldLoad,
          hasMore,
          isLoading,
          hasError: !!error
        });
        
        // Increment loading attempts counter
        updateDebugInfo({
          loadingAttempts: debugInfo.loadingAttempts + 1,
          forcedUpdateCount: debugInfo.forcedUpdateCount + 1
        });
        
        try {
          // Handle async loadMoreItems with retry mechanism
          const loadPromise = loadMoreItems();
          if (loadPromise && typeof loadPromise.then === 'function') {
            retryWithErrorBackoff(async () => {
              await loadPromise;
            }).catch(err => {
              console.error(`[VirtualizedCategoryRow] ❌ Error loading more items after retries:`, err);
              updateDebugInfo({
                errorCount: debugInfo.errorCount + 1,
                forcedUpdateCount: debugInfo.forcedUpdateCount + 1
              });
              categoryStore.setLoadingError(err.message || 'Failed to load more items');
            });
          }
        } catch (err) {
          console.error(`[VirtualizedCategoryRow] ❌ Error loading more items:`, err);
          updateDebugInfo({
            errorCount: debugInfo.errorCount + 1,
            forcedUpdateCount: debugInfo.forcedUpdateCount + 1
          });
          categoryStore.setLoadingError(err.message || 'Failed to load more items');
        }
      }
    };
    
    // Add scroll event listener with validation
    try {
      scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
      updateDebugInfo({
        scrollListenerAttached: true,
        forcedUpdateCount: debugInfo.forcedUpdateCount + 1
      });
      
      console.log(`[VirtualizedCategoryRow] ✅ Scroll listener attached successfully [${componentId}]`);
    } catch (err) {
      console.error(`[VirtualizedCategoryRow] ❌ Failed to attach scroll listener [${componentId}]:`, err);
      updateDebugInfo({
        scrollListenerAttached: false,
        errorCount: debugInfo.errorCount + 1,
        forcedUpdateCount: debugInfo.forcedUpdateCount + 1
      });
    }
    
    // Initial scroll state check
    handleScroll();
    
    // Cleanup function
    return () => {
      if (scrollThrottleTimeout) {
        clearTimeout(scrollThrottleTimeout);
      }
      try {
        scrollContainer.removeEventListener('scroll', handleScroll);
        console.log(`[VirtualizedCategoryRow] 🧹 Scroll listener removed [${componentId}]`);
      } catch (err) {
        console.error(`[VirtualizedCategoryRow] ❌ Error removing scroll listener [${componentId}]:`, err);
      }
    };
  }, [isVisible, itemWidth, gap, itemsPerViewport, category.items?.length, hasMore, isLoading, loadMoreItems, performanceMode, error, containerWidth, componentId]);
  
  // Reset when category changes with optimized dependencies
  useEffect(() => {
    if (category?.categoryId && categoryStore) {
      categoryStore.initializeItems(category.items || []);
      setScrollPosition(0);
      setIsVisible(false);
    }
  }, [category?.categoryId, category?.items?.length, categoryStore]);
  
  // Calculate total width
  const totalWidth = useMemo(() => {
    return (category.items?.length || 0) * (itemWidth + gap) - gap;
  }, [category.items?.length, itemWidth, gap]);
  
  return (
    <div ref={rowRef} className="px-4 sm:px-6 py-4 space-y-4">
      {/* Category Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold text-white">{category.name}</h2>
          <span className="text-sm text-neutral-400">
            {safeVisibleItems.length > 0 ? `${safeVisibleItems.length}/${category.items?.length || 0}` : category.items?.length || 0} items
          </span>
          {/* Debug info showing render range */}
          <span className="text-xs px-2 py-1 bg-green-600/20 text-green-400 rounded-full font-mono">
            [{categoryStore.startIndex || 0}-{categoryStore.endIndex || 0}]
          </span>
          {isSearchResults && (
            <span className="text-xs px-2 py-1 bg-blue-600/20 text-blue-400 rounded-full">
              Search Results
            </span>
          )}
          {(category.items?.length || 0) > 100 && !isSearchResults && (
            <span className="text-xs px-2 py-1 bg-purple-600/20 text-purple-400 rounded-full">
              Virtualized
            </span>
          )}
        </div>
        
        {/* Scroll buttons */}
        {containerWidth > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (scrollContainerRef.current) {
                  scrollContainerRef.current.scrollBy({ 
                    left: -(itemWidth * 3 + gap * 3), 
                    behavior: 'smooth' 
                  });
                }
              }}
              className="p-1 rounded-full transition-all bg-neutral-700 hover:bg-neutral-600 text-white disabled:opacity-50"
              disabled={scrollPosition <= 0}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={() => {
                if (scrollContainerRef.current) {
                  scrollContainerRef.current.scrollBy({ 
                    left: itemWidth * 3 + gap * 3, 
                    behavior: 'smooth' 
                  });
                }
              }}
              className="p-1 rounded-full transition-all bg-neutral-700 hover:bg-neutral-600 text-white disabled:opacity-50"
              disabled={scrollPosition >= totalWidth - containerWidth}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}
      </div>
      
      {/* Virtualized Horizontal Scroll */}
      <div className="relative">
        {containerWidth > 0 && (
          <div
            ref={scrollContainerRef}
            className="flex gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory"
            style={{ 
              width: containerWidth,
              scrollBehavior: 'smooth'
            }}
          >
            {/* Render only visible items (max 100) */}
            {safeVisibleItems.map((item, index) => {
              const actualIndex = category.items.indexOf(item);
              return (
                <div
                  key={item.stream_id || item.num || actualIndex}
                  className="flex-shrink-0 snap-start"
                  style={{ width: itemWidth }}
                >
                  <MemoizedContentCard 
                    item={item} 
                    type={activeTab}
                    priority={index < 6}
                  />
                </div>
              );
            })}
            
            {/* Loading indicator */}
            {isLoading && (
              <div className="flex-shrink-0 snap-start flex items-center justify-center" style={{ width: itemWidth }}>
                <div className="text-center p-4 bg-neutral-800/50 rounded-lg">
                  <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-xs text-neutral-400">Loading...</p>
                </div>
              </div>
            )}
            
            {/* Error state */}
            {error && (
              <div className="flex-shrink-0 snap-start flex items-center justify-center" style={{ width: itemWidth }}>
                <div className="text-center p-4 bg-red-900/30 rounded-lg">
                  <div className="w-4 h-4 border-2 border-red-500 rounded-full mx-auto mb-2" />
                  <p className="text-xs text-red-400">Error: {error}</p>
                  <button 
                    className="mt-2 text-xs px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded"
                    onClick={() => {
                      clearError();
                      loadMoreItems();
                    }}
                  >
                    Retry
                  </button>
                </div>
              </div>
            )}
            
          {/* Auto-loading indicator */}
            {hasMore && !isLoading && !error && (
              <div className="flex-shrink-0 snap-start flex items-center justify-center" style={{ width: itemWidth }}>
                <div className="text-center p-4 bg-neutral-800/30 rounded-lg">
                  <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-xs text-neutral-400">Auto-loading...</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Enhanced Real-time Debug Panel */}
      <div className="mt-2 p-3 bg-neutral-900/80 rounded-lg text-xs font-mono text-neutral-300 border border-neutral-700">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
          {/* Core Metrics */}
          <div className="space-y-1">
            <div className="text-blue-400 font-semibold">Core Metrics</div>
            <div>Scroll: <span className="text-white">{debugInfo.scrollPosition}px</span></div>
            <div>Progress: <span className="text-green-400">{debugInfo.scrollWidth > 0 ? Math.round((debugInfo.scrollPosition / debugInfo.scrollWidth) * 100) : 0}%</span></div>
            <div>Viewport: <span className="text-purple-400">{debugInfo.clientWidth}px</span></div>
            <div>Events: <span className="text-cyan-400">{debugInfo.scrollEvents}</span></div>
          </div>
          
          {/* Loading State */}
          <div className="space-y-1">
            <div className="text-orange-400 font-semibold">Loading State</div>
            <div>Loading: <span className={isLoading ? 'text-red-400' : 'text-green-400'}>{isLoading ? 'YES' : 'NO'}</span></div>
            <div>HasMore: <span className={hasMore ? 'text-blue-400' : 'text-gray-400'}>{hasMore ? 'YES' : 'NO'}</span></div>
            <div>Attempts: <span className="text-yellow-400">{debugInfo.loadingAttempts}</span></div>
            <div>Errors: <span className={debugInfo.errorCount > 0 ? 'text-red-400' : 'text-green-400'}>{debugInfo.errorCount}</span></div>
            <div>Retries: <span className={debugInfo.retryCount > 0 ? 'text-orange-400' : 'text-gray-400'}>{debugInfo.retryCount}</span></div>
          </div>
          
          {/* Component State */}
          <div className="space-y-1">
            <div className="text-purple-400 font-semibold">Component State</div>
            <div>Visible: <span className={debugInfo.isVisible ? 'text-green-400' : 'text-gray-400'}>{debugInfo.isVisible ? 'YES' : 'NO'}</span></div>
            <div>Container: <span className={debugInfo.containerWidthMeasured ? 'text-green-400' : 'text-gray-400'}>{debugInfo.containerWidthMeasured ? 'YES' : 'NO'}</span></div>
            <div>Listener: <span className={debugInfo.scrollListenerAttached ? 'text-green-400' : 'text-red-400'}>{debugInfo.scrollListenerAttached ? 'YES' : 'NO'}</span></div>
            <div>Mounted: <span className={debugInfo.componentMounted ? 'text-green-400' : 'text-gray-400'}>{debugInfo.componentMounted ? 'YES' : 'NO'}</span></div>
          </div>
          
          {/* Performance */}
          <div className="space-y-1">
            <div className="text-green-400 font-semibold">Performance</div>
            <div>Items: <span className="text-white">{safeVisibleItems.length}/{category.items?.length || 0}</span></div>
            <div>Range: <span className="text-cyan-400">[{startIndex}-{endIndex}]</span></div>
            <div>Chunks: <span className="text-yellow-400">{loadedChunks}/{Math.ceil(totalAvailableItems / chunkSize) || 1}</span></div>
            <div>Avg Load: <span className="text-orange-400">{averageLoadTime.toFixed(0)}ms</span></div>
          </div>
        </div>
        
        {/* Real-time Status Bar */}
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-neutral-700">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isLoading ? 'bg-yellow-400 animate-pulse' : hasMore ? 'bg-green-400' : debugInfo.errorCount > 0 ? 'bg-red-400' : 'bg-gray-400'}`}></div>
            <span className="text-xs">
              {isLoading ? 'LOADING' : hasMore ? 'READY' : debugInfo.errorCount > 0 ? 'ERROR' : 'COMPLETE'}
            </span>
          </div>
          <div className="text-xs text-gray-500">
            Last Update: {debugInfo.lastStateUpdate ? new Date(debugInfo.lastStateUpdate).toLocaleTimeString() : 'Never'}
          </div>
          <div className="text-xs text-gray-500">
            Forced Updates: {debugInfo.forcedUpdateCount}
          </div>
        </div>
      </div>

      {/* Performance indicator */}
      <div className="flex items-center justify-between text-xs text-neutral-500 flex-wrap">
        <span>
          Rendering: {safeVisibleItems.length} items
        </span>
        <span>
          Total: {totalAvailableItems || category.items?.length || 0} items
        </span>
        <span className="text-green-500">
          Range: [{categoryStore.startIndex || 0}-{categoryStore.endIndex || 0}]
        </span>
        <span className="text-purple-500">
          Chunks: {loadedChunks}/{Math.ceil(totalAvailableItems / chunkSize) || 1}
        </span>
        {loadCount > 0 && (
          <span className="text-cyan-500">
            Avg: {averageLoadTime.toFixed(0)}ms
          </span>
        )}
        {performanceMode && (
          <span className="text-amber-500">
            Performance Mode
          </span>
        )}
        {error && (
          <span className="text-red-500">
            Error
          </span>
        )}
        {hasMore && !error && (
          <span className="text-blue-500">
            Auto-loading
          </span>
        )}
      </div>
    </div>
  );
});

VirtualizedCategoryRow.displayName = 'VirtualizedCategoryRow';

// Memoized virtualized category list
const VirtualizedCategoryList = React.memo(({ categories, activeTab, searchQuery, isSearchResults = false, performanceMode = false }) => {
  console.log('[VirtualizedCategoryList] 🚀 Component function called with props:', {
    categories,
    activeTab,
    searchQuery,
    isSearchResults,
    performanceMode
  });
  
  // Ensure categories is always an array
  const safeCategories = Array.isArray(categories) ? categories : [];
  
  console.log('[VirtualizedCategoryList] 📊 Received categories:', {
    categoriesCount: safeCategories.length,
    categories: safeCategories.map(cat => ({
      name: cat?.name,
      categoryId: cat?.categoryId,
      itemsCount: cat?.items?.length || 0
    })),
    categoriesType: typeof categories,
    isArray: Array.isArray(categories),
    rawCategories: categories
  });
  
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
      {safeCategories.map((category, index) => {
        console.log(`[VirtualizedCategoryList] 🔄 Mapping category ${index}:`, {
          category,
          categoryKeys: Object.keys(category || {}),
          name: category?.name,
          categoryId: category?.categoryId,
          items: category?.items?.length
        });
        
        // Additional validation before rendering
        if (!category || typeof category !== 'object') {
          console.warn(`[VirtualizedCategoryList] ⚠️ Invalid category object at index ${index}:`, category);
          return null;
        }
        
        return (
          <VirtualizedCategoryRow
            key={category.categoryId || `category-${index}`}
            category={category}
            activeTab={activeTab}
            isSearchResults={isSearchResults}
            performanceMode={performanceMode}
          />
        );
      })}
    </div>
  );
});

VirtualizedCategoryList.displayName = 'VirtualizedCategoryList';

export { VirtualizedCategoryList };