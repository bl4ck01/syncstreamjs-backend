'use client';

import React, { useState, useEffect, useMemo, Suspense, useCallback } from 'react';
import { useSimplePlaylistStore } from '@/store/simple-playlist';
import { Play, Tv, Film, MonitorSpeaker, Search, Database, Wifi, WifiOff } from 'lucide-react';
import { ErrorBoundary } from 'react-error-boundary';
import NetflixHeader from './netflix-header';
import NetflixHero from './netflix-hero';
import NetflixRow from './netflix-row';
import { NetflixHomePageSkeleton } from './netflix-skeleton-loading';

// Error fallback component
function ErrorFallback({ error, resetErrorBoundary }) {
  return (
    <div className="h-screen flex items-center justify-center bg-black text-white p-6">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-900/20 flex items-center justify-center">
          <Database className="w-8 h-8 text-red-500" />
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">
          Something went wrong
        </h3>
        <p className="text-gray-400 text-sm mb-4">
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
    <div className="flex items-center gap-2 text-xs text-gray-400">
      <div className={`w-2 h-2 rounded-full ${isInitialized ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'}`} />
      <span>
        {isInitialized ? 'Library Ready' : 'Loading Library...'}
      </span>
    </div>
  );
}

// Main Netflix-style home page component
export default function NetflixHomePage() {
  console.log('[NetflixHomePage] 🔥 Component rendering');
  
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

  console.log('[NetflixHomePage] 📊 Store state:', {
    isInitialized,
    globalLoading,
    error,
    hasPlaylists: Object.keys(useSimplePlaylistStore.getState().playlists).length
  });

  const [currentPlaylist, setCurrentPlaylist] = useState(null);
  const [currentCounts, setCurrentCounts] = useState(null);
  const [noPlaylistMessage, setNoPlaylistMessage] = useState(null);
  const [hasTriedLoading, setHasTriedLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('movies'); // Start with movies for hero
  const [searchQuery, setSearchQuery] = useState('');
  const [isOnline, setIsOnline] = useState(true);
  const [isTabSwitching, setIsTabSwitching] = useState(false);
  const [performanceMode, setPerformanceMode] = useState(false);

  // Initialize store on mount
  useEffect(() => {
    console.log('[NetflixHomePage] 🚀 Component mounted, calling initializeStore...');
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
      console.log('[NetflixHomePage] 🎯 Loading default playlist...');
      setHasTriedLoading(true);
      loadDefaultPlaylist().then(result => {
        console.log('[NetflixHomePage] 📝 Default playlist result:', result);
        if (result.success && result.data && !result.noPlaylist) {
          const playlist = result.data;
          console.log('[NetflixHomePage] ✅ Setting loaded playlist:', playlist._meta?.name || 'Unknown');
          
          const playlistStoreId = `${playlist._meta?.baseUrl}|${playlist._meta?.username}`;
          
          setCurrentPlaylist(playlist);
          setCurrentCounts(getPlaylistCounts(playlistStoreId));
        } else if (result.noPlaylist) {
          console.log('[NetflixHomePage] ⚠️ No playlist message:', result.message);
          setNoPlaylistMessage(result.message);
        } else if (result.cached) {
          const state = useSimplePlaylistStore.getState();
          const defaultPlaylistId = state.defaultPlaylistId;
          if (defaultPlaylistId) {
            const cachedPlaylist = state.playlists[defaultPlaylistId];
            if (cachedPlaylist) {
              console.log('[NetflixHomePage] ✅ Using cached playlist');
              setCurrentPlaylist(cachedPlaylist);
              setCurrentCounts(getPlaylistCounts(defaultPlaylistId));
            }
          }
        }
      }).catch(error => {
        console.error('[NetflixHomePage] ❌ Error loading default playlist:', error);
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
    
    console.log('[NetflixHomePage] 🔄 Tab change:', {
      fromTab: activeTab,
      toTab: newTab,
      isTabSwitching,
      currentPlaylist: !!currentPlaylist
    });
    
    setIsTabSwitching(true);
    setActiveTab(newTab);
    
    const timer = setTimeout(() => {
      setIsTabSwitching(false);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [activeTab, isTabSwitching, currentPlaylist]);

  // Process data for display
  const categorizedData = useMemo(() => {
    console.log('[NetflixHomePage] 🔄 useMemo recalculating categorizedData:', {
      currentPlaylist: !!currentPlaylist,
      activeTab,
      searchQuery,
      searchResultsLength: searchResults.length,
      hasGetCategorizedStreams: typeof getCategorizedStreams === 'function'
    });
    
    if (searchQuery && searchResults.length > 0) {
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
      const state = useSimplePlaylistStore.getState();
      const playlistKey = Object.keys(state.playlists).find(key =>
        state.playlists[key] === currentPlaylist
      );

      let categorizedStreams;
      if (playlistKey) {
        categorizedStreams = getCategorizedStreams(playlistKey, activeTab);
      } else {
        categorizedStreams = currentPlaylist.categorizedStreams?.[activeTab === 'movies' ? 'vod' : activeTab] || [];
      }

      if (!Array.isArray(categorizedStreams)) {
        console.warn('[NetflixHomePage] ⚠️ categorizedStreams is not an array:', categorizedStreams);
        return [];
      }

      const result = categorizedStreams.map((category, index) => {
        const categoryName = category.categoryName || category.category_name || category.name || 'Unknown Category';
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
      console.error('[NetflixHomePage] ❌ Error processing categorized data:', error);
      return [];
    }
  }, [currentPlaylist, activeTab, searchQuery, searchResults, getCategorizedStreams]);

  // Get featured content for hero section
  const featuredContent = useMemo(() => {
    if (!categorizedData.length || !categorizedData[0]?.items?.length) {
      return null;
    }
    
    // Get some featured items from different categories
    const featuredItems = [];
    categorizedData.slice(0, 3).forEach(category => {
      if (category.items && category.items.length > 0) {
        featuredItems.push({
          ...category.items[0],
          type: activeTab,
          categoryName: category.name,
          description: `Featured content from ${category.name}`
        });
      }
    });
    
    return featuredItems.length > 0 ? featuredItems : null;
  }, [categorizedData, activeTab]);

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
    return <NetflixHomePageSkeleton />;
  }

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <div className="min-h-screen bg-black">
        {/* Netflix Header */}
        <NetflixHeader 
          profile={{ name: 'User', email: 'user@example.com' }}
          onSearch={handleSearch}
        />

        {/* Hero Section */}
        <div className="pt-16">
          {featuredContent && (
            <NetflixHero featuredContent={featuredContent} />
          )}
        </div>

        {/* Tab Navigation */}
        <div className="sticky top-16 z-40 bg-black/95 backdrop-blur-sm border-b border-gray-800">
          <div className="flex items-center px-4 sm:px-8 py-4">
            <button
              onClick={() => handleTabChange('live')}
              className={`flex items-center gap-2 px-6 py-2 rounded-full mr-4 transition-all duration-200 ${
                activeTab === 'live'
                  ? 'bg-red-600 text-white shadow-lg'
                  : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50 hover:text-white'
              }`}
            >
              <Tv className="w-4 h-4" />
              <span className="font-medium">Live TV</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                activeTab === 'live' ? 'bg-red-700' : 'bg-gray-700'
              }`}>
                {currentCounts?.totalLive?.toLocaleString() || '0'}
              </span>
            </button>
            
            <button
              onClick={() => handleTabChange('movies')}
              className={`flex items-center gap-2 px-6 py-2 rounded-full mr-4 transition-all duration-200 ${
                activeTab === 'movies'
                  ? 'bg-red-600 text-white shadow-lg'
                  : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50 hover:text-white'
              }`}
            >
              <Film className="w-4 h-4" />
              <span className="font-medium">Movies</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                activeTab === 'movies' ? 'bg-red-700' : 'bg-gray-700'
              }`}>
                {currentCounts?.totalVod?.toLocaleString() || '0'}
              </span>
            </button>
            
            <button
              onClick={() => handleTabChange('series')}
              className={`flex items-center gap-2 px-6 py-2 rounded-full transition-all duration-200 ${
                activeTab === 'series'
                  ? 'bg-red-600 text-white shadow-lg'
                  : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50 hover:text-white'
              }`}
            >
              <MonitorSpeaker className="w-4 h-4" />
              <span className="font-medium">Series</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                activeTab === 'series' ? 'bg-red-700' : 'bg-gray-700'
              }`}>
                {currentCounts?.totalSeries?.toLocaleString() || '0'}
              </span>
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="relative -mt-32 z-10 pb-20">
          {noPlaylistMessage && !currentPlaylist ? (
            <div className="h-full flex items-center justify-center bg-black text-white p-6">
              <div className="text-center max-w-md">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-900/20 flex items-center justify-center">
                  <Tv className="w-8 h-8 text-amber-500" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  Playlist Issue
                </h3>
                <p className="text-gray-400 text-sm mb-4">
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
                    className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            </div>
          ) : error && !currentPlaylist ? (
            <ErrorFallback error={{ message: error }} resetErrorBoundary={handleRetry} />
          ) : !currentPlaylist ? (
            <NetflixHomePageSkeleton />
          ) : isTabSwitching ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-white text-lg">Loading {activeTab}...</p>
              </div>
            </div>
          ) : categorizedData.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-800 flex items-center justify-center">
                  <Search className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">No {activeTab} found</h3>
                <p className="text-gray-400">Try a different category or check back later.</p>
              </div>
            </div>
          ) : (
            <Suspense fallback={<NetflixHomePageSkeleton />}>
              {categorizedData.map((category) => (
                <NetflixRow
                  key={category.categoryId}
                  category={category}
                  activeTab={activeTab}
                  isSearchResults={!!searchQuery}
                  performanceMode={performanceMode}
                />
              ))}
            </Suspense>
          )}
        </div>

        {/* Status indicators */}
        <div className="fixed bottom-4 right-4 flex items-center gap-4 text-xs text-gray-500">
          <DatabaseStatus />
          {isOnline ? (
            <Wifi className="w-3 h-3 text-green-500" />
          ) : (
            <WifiOff className="w-3 h-3 text-red-500" />
          )}
          {performanceMode && (
            <div className="flex items-center gap-1 text-amber-500">
              <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span>Performance Mode</span>
            </div>
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
}