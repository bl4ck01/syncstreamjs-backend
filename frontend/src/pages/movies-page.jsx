'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useSimplePlaylistStore } from '@/store/simple-playlist';
import NetflixHeader from '@/components/netflix-header';
import NetflixRow from '@/components/netflix-row';
import NetflixHero from '@/components/netflix-hero';
import { NetflixHomePageSkeleton } from '@/components/netflix-skeleton-loading';
import { Film, Wifi, WifiOff } from 'lucide-react';
import { ErrorBoundary } from 'react-error-boundary';

// Error fallback component
function ErrorFallback({ error, resetErrorBoundary }) {
  return (
    <div className="h-screen flex items-center justify-center bg-black text-white p-6">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-900/20 flex items-center justify-center">
          <Film className="w-8 h-8 text-red-500" />
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

// Main Movies Page Component
export default function MoviesPage() {
  console.log('[MoviesPage] 🔥 Component rendering');

  const {
    loadDefaultPlaylist,
    getPlaylistCounts,
    getCategorizedStreams,
    globalLoading,
    error,
    clearError,
    isInitialized,
    initializeStore
  } = useSimplePlaylistStore();

  const [currentPlaylist, setCurrentPlaylist] = useState(null);
  const [noPlaylistMessage, setNoPlaylistMessage] = useState(null);
  const [hasTriedLoading, setHasTriedLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isOnline, setIsOnline] = useState(true);
  const [performanceMode, setPerformanceMode] = useState(false);

  // Initialize store on mount - only if not already initialized
  useEffect(() => {
    console.log('[MoviesPage] 🚀 Component mounted, checking initialization...');
    if (!isInitialized) {
      console.log('[MoviesPage] 🚀 Calling initializeStore...');
      initializeStore();
    } else {
      console.log('[MoviesPage] ⏭️ Store already initialized');
    }
  }, [isInitialized, initializeStore]);

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
      console.log('[MoviesPage] 🎯 Loading default playlist...');
      setHasTriedLoading(true);
      loadDefaultPlaylist().then(result => {
        console.log('[MoviesPage] 📝 Default playlist result:', result);
        if (result.success && result.data && !result.noPlaylist) {
          const playlist = result.data;
          console.log('[MoviesPage] ✅ Setting loaded playlist:', playlist._meta?.name || 'Unknown');

          setCurrentPlaylist(playlist);
        } else if (result.noPlaylist) {
          console.log('[MoviesPage] ⚠️ No playlist message:', result.message);
          setNoPlaylistMessage(result.message);
        } else if (result.cached) {
          const state = useSimplePlaylistStore.getState();
          const defaultPlaylistId = state.defaultPlaylistId;
          if (defaultPlaylistId) {
            const cachedPlaylist = state.playlists[defaultPlaylistId];
            if (cachedPlaylist) {
              console.log('[MoviesPage] ✅ Using cached playlist');
              setCurrentPlaylist(cachedPlaylist);
            }
          }
        }
      }).catch(error => {
        console.error('[MoviesPage] ❌ Error loading default playlist:', error);
      });
    }
  }, [isInitialized, currentPlaylist, hasTriedLoading, globalLoading, loadDefaultPlaylist, getPlaylistCounts]);


  // Process data for display - Netflix style horizontal rows (lazy loaded)
  const categorizedData = useMemo(() => {
    console.log('[MoviesPage] 🔄 useMemo recalculating categorizedData:', {
      currentPlaylist: !!currentPlaylist,
      searchQuery,
      hasGetCategorizedStreams: typeof getCategorizedStreams === 'function'
    });

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
        categorizedStreams = getCategorizedStreams(playlistKey, 'vod');
      } else {
        categorizedStreams = currentPlaylist.categorizedStreams?.vod || [];
      }

      if (!Array.isArray(categorizedStreams)) {
        console.warn('[MoviesPage] ⚠️ categorizedStreams is not an array:', categorizedStreams);
        return [];
      }

      // Process only first few categories initially for faster loading
      const initialCategories = categorizedStreams.slice(0, 10);
      const result = initialCategories.map((category, index) => {
        const categoryName = category.categoryName || category.category_name || category.name || 'Unknown Category';
        const streams = Array.isArray(category.streams)
          ? category.streams.slice(0, 20) // Limit initial streams per category
          : (Array.isArray(category.items) ? category.items.slice(0, 20) : []);
        const categoryId = category.categoryId || category.category_id || `category-${categoryName.replace(/[^a-zA-Z0-9]/g, '-')}-${index}`;

        return {
          name: categoryName,
          items: streams,
          count: streams.length,
          categoryId: categoryId,
          totalItems: category.streams?.length || category.items?.length || 0,
          hasMore: (category.streams?.length || category.items?.length || 0) > 20
        };
      });

      console.log('[MoviesPage] ✅ Processed initial categories:', result.length);
      return result;
    } catch (error) {
      console.error('[MoviesPage] ❌ Error processing categorized data:', error);
      return [];
    }
  }, [currentPlaylist, searchQuery, getCategorizedStreams]);

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
          type: 'movies',
          categoryName: category.name,
          description: `Featured movie from ${category.name}`
        });
      }
    });

    return featuredItems.length > 0 ? featuredItems : null;
  }, [categorizedData]);

  // Handle retry
  const handleRetry = () => {
    clearError();
    setCurrentPlaylist(null);
    setNoPlaylistMessage(null);
    setHasTriedLoading(false);
    setSearchQuery('');
  };

  // Show loading state
  if (!isInitialized || globalLoading) {
    return <NetflixHomePageSkeleton />;
  }

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <div className="h-screen bg-black overflow-x-hidden overflow-y-auto">
        {/* Netflix Header */}
        <NetflixHeader
          profile={{ name: 'User', email: 'user@example.com' }}
          onSearch={() => { }}
        />

        {/* Hero Section */}
        <div className="pt-16">
          {featuredContent && (
            <NetflixHero featuredContent={featuredContent} />
          )}
        </div>


        {/* Content Area */}
        <div className="relative z-10 pb-20">
          {noPlaylistMessage && !currentPlaylist ? (
            <div className="h-full flex items-center justify-center bg-black text-white p-6">
              <div className="text-center max-w-md">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-900/20 flex items-center justify-center">
                  <Film className="w-8 h-8 text-amber-500" />
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
          ) : categorizedData.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-800 flex items-center justify-center">
                  <Film className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">No movies found</h3>
                <p className="text-gray-400">Check your playlist configuration or try again later.</p>
              </div>
            </div>
          ) : (
            <>
              {categorizedData.map((category) => (
                <NetflixRow
                  key={category.categoryId}
                  category={category}
                  activeTab="movies"
                  isSearchResults={false}
                  performanceMode={performanceMode}
                />
              ))}
            </>
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