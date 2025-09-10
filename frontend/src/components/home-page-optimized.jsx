'use client';

import React, { useState, useEffect, useMemo, Suspense, useCallback } from 'react';
import { useSimplePlaylistStore } from '@/store/simple-playlist';
import { List } from 'react-window';
import { Play, Tv, Film, MonitorSpeaker, Search, Database, Wifi, WifiOff } from 'lucide-react';
import { ErrorBoundary } from 'react-error-boundary';
import PlaylistLoading from './playlist-loading';

// Lazy load heavy components
const VirtualizedCategoryList = dynamic(
  () => import('@/components/netflix-style-rows').then((mod) => ({
    default: mod.VirtualizedCategoryList
  })),
  {
    loading: () => {
      const { HomePageSkeleton } = require('@/components/skeleton-loading');
      return <HomePageSkeleton />;
    },
    suspense: true
  }
);

// Error fallback component
function ErrorFallback({ error, resetErrorBoundary }) {
  return (
    <div className="h-full flex items-center justify-center bg-neutral-950 text-white p-6">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-900/20 flex items-center justify-center">
          <Database className="w-8 h-8 text-red-500" />
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">
          Something went wrong
        </h3>
        <p className="text-neutral-400 text-sm mb-4">
          {error.message || 'Failed to load content'}
        </p>
        <button
          onClick={resetErrorBoundary}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}

// Database status indicator
function DatabaseStatus() {
  const isInitialized = useSimplePlaylistStore((state) => state.isInitialized);
  
  return (
    <div className="flex items-center gap-2 text-xs text-neutral-500">
      <div className={`w-2 h-2 rounded-full ${isInitialized ? 'bg-green-500' : 'bg-yellow-500'}`} />
      <span>
        {isInitialized ? 'Database Ready' : 'Initializing...'}
      </span>
    </div>
  );
}

// Optimized tab button component
function TabButton({ active, onClick, icon: Icon, label, count, loading = false, isTabSwitching = false }) {
  return (
    <button
      onClick={onClick}
      disabled={loading || isTabSwitching}
      className={`flex items-center gap-2 px-4 py-2 rounded-full mr-4 transition-all duration-200 ${
        active
          ? 'bg-red-600 text-white shadow-lg'
          : 'bg-neutral-800/50 text-neutral-300 hover:bg-neutral-700/50 hover:text-white'
      } ${(loading || isTabSwitching) ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <Icon className="w-4 h-4" />
      <span className="font-medium">{label}</span>
      {count !== undefined && (
        <span className={`text-xs px-2 py-0.5 rounded-full ${
          active ? 'bg-red-700' : 'bg-neutral-700'
        }`}>
          {loading || isTabSwitching ? '...' : count.toLocaleString()}
        </span>
      )}
    </button>
  );
}

// Search component with debouncing
function SearchBar({ value, onChange, onSearch }) {
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (value.trim().length >= 2) {
        setIsSearching(true);
        onSearch(value).finally(() => setIsSearching(false));
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [value, onSearch]);

  return (
    <div className="flex-1 max-w-md mx-8">
      <div className="relative">
        <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${
          isSearching ? 'text-blue-500' : 'text-neutral-400'
        }`} />
        <input
          type="text"
          placeholder="Search for movies, series, or live channels..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-neutral-900/50 border border-neutral-700 rounded-lg text-white placeholder:text-neutral-400 focus:outline-none focus:border-red-500 focus:bg-neutral-900 transition-colors"
        />
        {isSearching && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
    </div>
  );
}

// Main home page component
export default function HomePage() {
  console.log('[HomePage] 🔥 Component rendering');
  
  const {
    loadDefaultPlaylist,
    getPlaylistCounts,
    getCategorizedStreams,
    globalLoading,
    error,
    clearError,
    isInitialized,
    searchContent,
    searchResults,
    clearSearchResults,
    initializeStore
  } = useSimplePlaylistStore();

  console.log('[HomePage] 📊 Store state:', {
    isInitialized,
    globalLoading,
    error,
    hasPlaylists: Object.keys(useSimplePlaylistStore.getState().playlists).length
  });

  const [currentPlaylist, setCurrentPlaylist] = useState(null);
  const [currentCounts, setCurrentCounts] = useState(null);
  const [noPlaylistMessage, setNoPlaylistMessage] = useState(null);
  const [hasTriedLoading, setHasTriedLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('live');
  const [searchQuery, setSearchQuery] = useState('');
  const [isOnline, setIsOnline] = useState(true);
  const [isTabSwitching, setIsTabSwitching] = useState(false);
  const [performanceMode, setPerformanceMode] = useState(false);

  // Initialize store on mount
  useEffect(() => {
    console.log('[HomePage] 🚀 Component mounted, calling initializeStore...');
    initializeStore();
  }, [initializeStore]);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Detect low-end hardware and enable performance mode
  useEffect(() => {
    const checkPerformance = () => {
      // Check for low memory devices
      if ('deviceMemory' in navigator) {
        if (navigator.deviceMemory < 4) {
          setPerformanceMode(true);
          return;
        }
      }
      
      // Check for slow CPU
      if ('hardwareConcurrency' in navigator) {
        if (navigator.hardwareConcurrency < 4) {
          setPerformanceMode(true);
          return;
        }
      }
      
      // Check for mobile devices
      if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
        setPerformanceMode(true);
      }
    };
    
    checkPerformance();
  }, []);

  // Load default playlist when ready
  useEffect(() => {
    if (isInitialized && !currentPlaylist && !hasTriedLoading && !globalLoading) {
      console.log('[HomePage] 🎯 Loading default playlist...');
      setHasTriedLoading(true);
      loadDefaultPlaylist().then(result => {
        console.log('[HomePage] 📝 Default playlist result:', result);
        if (result.success && result.data && !result.noPlaylist) {
          // Use the loaded playlist data directly
          const playlist = result.data;
          console.log('[HomePage] ✅ Setting loaded playlist:', playlist._meta?.name || 'Unknown');
          
          // Create a playlist store ID
          const playlistStoreId = `${playlist._meta?.baseUrl}|${playlist._meta?.username}`;
          
          setCurrentPlaylist(playlist);
          setCurrentCounts(getPlaylistCounts(playlistStoreId));
        } else if (result.noPlaylist) {
          console.log('[HomePage] ⚠️ No playlist message:', result.message);
          setNoPlaylistMessage(result.message);
        } else if (result.cached) {
          // Playlist was already cached, find it in the store
          const state = useSimplePlaylistStore.getState();
          const defaultPlaylistId = state.defaultPlaylistId;
          if (defaultPlaylistId) {
            const cachedPlaylist = state.playlists[defaultPlaylistId];
            if (cachedPlaylist) {
              console.log('[HomePage] ✅ Using cached playlist');
              setCurrentPlaylist(cachedPlaylist);
              setCurrentCounts(getPlaylistCounts(defaultPlaylistId));
            }
          }
        }
      }).catch(error => {
        console.error('[HomePage] ❌ Error loading default playlist:', error);
      });
    }
  }, [isInitialized, currentPlaylist, hasTriedLoading, globalLoading, loadDefaultPlaylist, getPlaylistCounts]);

  // Handle search
  const handleSearch = async (query) => {
    if (query.trim().length >= 2) {
      await searchContent(query, { type: activeTab });
  } else {
      clearSearchResults();
    }
  };

  // Optimized tab switching with debounce
  const handleTabChange = useCallback((newTab) => {
    if (newTab === activeTab || isTabSwitching) return;
    
    console.log('[HomePage] 🔄 Tab change:', {
      fromTab: activeTab,
      toTab: newTab,
      isTabSwitching,
      currentPlaylist: !!currentPlaylist
    });
    
    setIsTabSwitching(true);
    setActiveTab(newTab);
    
    // Debounce the tab switch to prevent rapid switching
    const timer = setTimeout(() => {
      setIsTabSwitching(false);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [activeTab, isTabSwitching, currentPlaylist]);

  // Process data for display
  const categorizedData = useMemo(() => {
    console.log('[HomePage] 🔄 useMemo recalculating categorizedData:', {
      currentPlaylist: !!currentPlaylist,
      activeTab,
      searchQuery,
      searchResultsLength: searchResults.length,
      hasGetCategorizedStreams: typeof getCategorizedStreams === 'function'
    });
    if (searchQuery && searchResults.length > 0) {
      // Show search results
      const searchCategories = [{
        name: 'Search Results',
        items: searchResults,
        count: searchResults.length,
        categoryId: 'search'
      }];
      return searchCategories;
    }

    if (!currentPlaylist) {
      return [];
    }

    try {
      // Try to find the playlist key first
      const state = useSimplePlaylistStore.getState();
      const playlistKey = Object.keys(state.playlists).find(key =>
        state.playlists[key] === currentPlaylist
      );

      let categorizedStreams;
      if (playlistKey) {
        categorizedStreams = getCategorizedStreams(playlistKey, activeTab);
        console.log('[HomePage] 📂 Got categorizedStreams from store:', {
          playlistKey,
          activeTab,
          isArray: Array.isArray(categorizedStreams),
          count: categorizedStreams?.length,
          firstCategory: categorizedStreams?.[0]
        });
      } else {
        // Fallback: use currentPlaylist directly if it has the right structure
        categorizedStreams = currentPlaylist.categorizedStreams?.[activeTab === 'movies' ? 'vod' : activeTab] || [];
        console.log('[HomePage] 📂 Got categorizedStreams from fallback:', {
          activeTab,
          isArray: Array.isArray(categorizedStreams),
          count: categorizedStreams?.length,
          firstCategory: categorizedStreams?.[0]
        });
      }

      // Ensure categorizedStreams is an array
      if (!Array.isArray(categorizedStreams)) {
        console.warn('[HomePage] ⚠️ categorizedStreams is not an array:', categorizedStreams);
        return [];
      }

      const result = categorizedStreams.map((category, index) => {
        console.log('[HomePage] 📂 Processing category:', {
          categoryKeys: Object.keys(category),
          categoryName: category.categoryName,
          category_name: category.category_name,
          name: category.name,
          category,
          streams: category.streams,
          streamsLength: category.streams?.length
        });
        
        const categoryName = category.categoryName || category.category_name || category.name || 'Unknown Category';
        // Determine the actual list of streams for this category.
        // Some playlist structures use `items` instead of `streams`, so we need to handle both.
        const streams = Array.isArray(category.streams)
          ? category.streams
          : (Array.isArray(category.items) ? category.items : []);
        const categoryId = category.categoryId || category.category_id || `category-${categoryName.replace(/[^a-zA-Z0-9]/g, '-')}-${index}`;
        
        console.log('[HomePage] 📋 Creating category object:', {
          categoryName,
          categoryId,
          streamsLength: streams.length,
          hasStreams: streams.length > 0
        });
        
        return {
          name: categoryName,
          items: streams,
          count: streams.length,
          categoryId: categoryId
        };
      });

      console.log('[HomePage] 📊 Final categorizedData:', {
        resultCount: result.length,
        firstResult: result[0]
      });

      return result;
    } catch (error) {
      console.error('[HomePage] ❌ Error processing categorized data:', error);
      return [];
    }
  }, [currentPlaylist, activeTab, searchQuery, searchResults, getCategorizedStreams]);

  // Handle retry
  const handleRetry = () => {
    clearError();
    setCurrentPlaylist(null);
    setCurrentCounts(null);
    setNoPlaylistMessage(null);
    setHasTriedLoading(false);
    setSearchQuery('');
    clearSearchResults();
  };

  // Show loading state
  if (!isInitialized || globalLoading) {
    return (
      <div className="h-screen flex flex-col bg-neutral-950">
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800">
          <h1 className="text-xl font-bold text-white">Home</h1>
          <DatabaseStatus />
        </div>
        <PlaylistLoading message="Initializing your content library..." showAnalytics={true} />
      </div>
    );
  }

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <div className="h-screen flex flex-col bg-neutral-950">
        {/* Header */}
        <div className="flex-shrink-0 bg-black/95 backdrop-blur-sm border-b border-neutral-800">
          <div className="flex items-center justify-between px-4 sm:px-6 py-4">
            <div className="flex items-center gap-4">
              <h1 className="text-xl sm:text-2xl font-bold text-white">Home</h1>
              <div className="flex items-center gap-2">
                {isOnline ? (
                  <Wifi className="w-4 h-4 text-green-500" />
                ) : (
                  <WifiOff className="w-4 h-4 text-red-500" />
                )}
                <DatabaseStatus />
                {performanceMode && (
                  <div className="flex items-center gap-1 text-xs text-amber-500">
                    <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    <span>Performance Mode</span>
                  </div>
                )}
              </div>
            </div>

            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              onSearch={handleSearch}
            />
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center px-4 sm:px-6 pb-4">
            <TabButton
              active={activeTab === 'live'}
              onClick={() => handleTabChange('live')}
              icon={Tv}
              label="Live"
              count={currentCounts?.totalLive}
              loading={globalLoading}
              isTabSwitching={isTabSwitching}
            />
            <TabButton
              active={activeTab === 'movies'}
              onClick={() => handleTabChange('movies')}
              icon={Film}
              label="Movies"
              count={currentCounts?.totalVod}
              loading={globalLoading}
              isTabSwitching={isTabSwitching}
            />
            <TabButton
              active={activeTab === 'series'}
              onClick={() => handleTabChange('series')}
              icon={MonitorSpeaker}
              label="Series"
              count={currentCounts?.totalSeries}
              loading={globalLoading}
              isTabSwitching={isTabSwitching}
            />
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden">
          {noPlaylistMessage && !currentPlaylist ? (
            <div className="h-full flex items-center justify-center bg-neutral-950 text-white p-6">
              <div className="text-center max-w-md">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-900/20 flex items-center justify-center">
                  <Tv className="w-8 h-8 text-amber-500" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  Default Playlist Issue
                </h3>
                <p className="text-neutral-400 text-sm mb-4">
                  {noPlaylistMessage}
                </p>
                <div className="space-y-2">
                  <button
                    onClick={() => window.location.href = '/playlists'}
                    className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    Manage Playlists
                  </button>
                  <button
                    onClick={handleRetry}
                    className="w-full px-4 py-2 bg-neutral-700 hover:bg-neutral-600 text-white rounded-lg transition-colors text-sm"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            </div>
          ) : error && !currentPlaylist ? (
            <ErrorFallback error={{ message: error }} resetErrorBoundary={handleRetry} />
          ) : !currentPlaylist ? (
            <PlaylistLoading message="Loading content..." showAnalytics={true} />
          ) : isTabSwitching ? (
            <PlaylistLoading message="Switching categories..." showAnalytics={false} />
          ) : (
            <Suspense fallback={<PlaylistLoading message="Loading content..." />}>
              <VirtualizedCategoryList
                categories={categorizedData}
                activeTab={activeTab}
                searchQuery={searchQuery}
                isSearchResults={!!searchQuery}
                performanceMode={performanceMode}
              />
            </Suspense>
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
}

// Dynamic import for virtual list
function dynamic(importFunc, options) {
  const LazyComponent = React.lazy(importFunc);
  return function DynamicComponent(props) {
    return (
      <React.Suspense fallback={options.loading ? options.loading() : null}>
        <LazyComponent {...props} />
      </React.Suspense>
    );
  };
}