'use client';

import React, { useState, useEffect, useMemo, Suspense, useCallback } from 'react';
import { useSimplePlaylistStore } from '@/store/simple-playlist';
import { List } from 'react-window';
import { Play, Tv, Film, MonitorSpeaker, Search, Database, Wifi, WifiOff, ChevronLeft, ChevronRight } from 'lucide-react';
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

// Hero Banner Component (moved outside)
function HeroBanner({ featuredItems }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Auto-rotate every 5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % featuredItems.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [featuredItems.length]);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + featuredItems.length) % featuredItems.length);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % featuredItems.length);
  };

  if (!featuredItems?.length) return null;

  const currentItem = featuredItems[currentIndex];

  return (
    <div className="relative h-[56.25vw] max-h-[70vh] min-h-[400px] mb-8 overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <img
          src={currentItem.stream_icon || currentItem.image || '/placeholder-hero.jpg'}
          alt={currentItem.name}
          className="w-full h-full object-cover transition-all duration-500"
          loading="eager"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black" />
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/40 to-transparent" />
      </div>

      {/* Content Overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-8 max-w-2xl">
        <h2 className="text-4xl font-bold text-white mb-4 drop-shadow-lg">
          {currentItem.name}
        </h2>
        <p className="text-white text-lg mb-6 line-clamp-3 drop-shadow-md">
          {currentItem.plot || currentItem.description || 'Watch now on our platform'}
        </p>
        <div className="flex gap-4">
          <button className="flex items-center gap-2 px-6 py-3 bg-white text-black rounded font-semibold hover:bg-white/90 transition-colors">
            <Play className="w-5 h-5 fill-current" /> Play
          </button>
          <button className="flex items-center gap-2 px-6 py-3 bg-neutral-700/70 text-white rounded font-semibold hover:bg-neutral-700 transition-colors">
            More Info
          </button>
        </div>
      </div>

      {/* Navigation Controls */}
      <button
        onClick={handlePrev}
        className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 p-2 rounded-full hover:bg-black/70 transition-colors"
      >
        <ChevronLeft className="w-6 h-6 text-white" />
      </button>
      <button
        onClick={handleNext}
        className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 p-2 rounded-full hover:bg-black/70 transition-colors"
      >
        <ChevronRight className="w-6 h-6 text-white" />
      </button>

      {/* Indicators */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
        {featuredItems.map((_, index) => (
          <div
            key={index}
            className={`w-2 h-2 rounded-full transition-all ${
              index === currentIndex ? 'bg-white scale-125' : 'bg-white/50'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

// Main home page component
export default function HomePage() {
  
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
      setHasTriedLoading(true);
      loadDefaultPlaylist().then(result => {
        if (result.success && result.data && !result.noPlaylist) {
          // Use the loaded playlist data directly
          const playlist = result.data;
          
          // Create a playlist store ID
          const playlistStoreId = `${playlist._meta?.baseUrl}|${playlist._meta?.username}`;
          
          setCurrentPlaylist(playlist);
          setCurrentCounts(getPlaylistCounts(playlistStoreId));
        } else if (result.noPlaylist) {
          setNoPlaylistMessage(result.message);
        } else if (result.cached) {
          // Playlist was already cached, find it in the store
          const state = useSimplePlaylistStore.getState();
          const defaultPlaylistId = state.defaultPlaylistId;
          if (defaultPlaylistId) {
            const cachedPlaylist = state.playlists[defaultPlaylistId];
            if (cachedPlaylist) {
              setCurrentPlaylist(cachedPlaylist);
              setCurrentCounts(getPlaylistCounts(defaultPlaylistId));
            }
          }
        }
      }).catch(error => {
        console.error('Error loading default playlist:', error);
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
      } else {
        // Fallback: use currentPlaylist directly if it has the right structure
        categorizedStreams = currentPlaylist.categorizedStreams?.[activeTab === 'movies' ? 'vod' : activeTab] || [];
      }

      // Ensure categorizedStreams is an array
      if (!Array.isArray(categorizedStreams)) {
        console.warn('categorizedStreams is not an array:', categorizedStreams);
        return [];
      }

      const result = categorizedStreams.map((category, index) => {
        
        const categoryName = category.categoryName || category.category_name || category.name || 'Unknown Category';
        // Determine the actual list of streams for this category.
        // Some playlist structures use `items` instead of `streams`, so we need to handle both.
        const streams = Array.isArray(category.streams)
          ? category.streams
          : (Array.isArray(category.items) ? category.items : []);
        const categoryId = category.categoryId || category.category_id || `category-${categoryName.replace(/[^a-zA-Z0-9]/g, '-')}-${index}`;
        
        
        return {
          name: categoryName,
          items: streams,
          count: streams.length,
          categoryId: categoryId
        };
      });


      return result;
    } catch (error) {
      console.error('Error processing categorized data:', error);
      return [];
    }
  }, [currentPlaylist, activeTab, searchQuery, searchResults, getCategorizedStreams]);

  const featuredItems = useMemo(() => {
    if (!categorizedData?.length) return [];
    
    // Select first 5 items from first category as featured
    // Prioritize movies or live content
    const priorityCategory = categorizedData.find(cat => 
      cat.name.toLowerCase().includes('featured') || 
      cat.name.toLowerCase().includes('popular') ||
      cat.items.length >= 5
    ) || categorizedData[0];
    
    return priorityCategory.items.slice(0, 5).map(item => ({
      ...item,
      // Add fallback images or descriptions if needed
      description: item.plot || item.description || 'Featured content',
      backgroundImage: item.backdrop_path || item.stream_icon || '/placeholder-hero.jpg'
    }));
  }, [categorizedData]);

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

  // In the main component, add featured items selection
  // const featuredItems = useMemo(() => {
  //   if (!categorizedData?.length) return [];
    
  //   // Select first 5 items from first category as featured
  //   return categorizedData[0].items.slice(0, 5);
  // }, [categorizedData]);

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
            <>
              <HeroBanner featuredItems={featuredItems} />
              <Suspense fallback={<PlaylistLoading message="Loading content..." />}>
                <VirtualizedCategoryList
                  categories={categorizedData}
                  activeTab={activeTab}
                  searchQuery={searchQuery}
                  isSearchResults={!!searchQuery}
                  performanceMode={performanceMode}
                />
              </Suspense>
            </>
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