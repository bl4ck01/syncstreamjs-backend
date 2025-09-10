'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSimplePlaylistStore } from '@/store/simple-playlist';
import { dataService } from '@/services/data-service';
import { usePerformance } from '@/utils/performance-monitor';
import { ErrorBoundary } from 'react-error-boundary';
import performanceMonitor from '@/utils/performance-monitor';
import NetflixHeader from '@/components/netflix-header';
import NetflixHero from '@/components/netflix-hero';
import NetflixRow from '@/components/netflix-row';
import NetflixContentCard from '@/components/netflix-content-card';
import { NetflixHomePageSkeleton } from '@/components/netflix-skeleton-loading';
import { 
  Play, Tv, Film, MonitorSpeaker, Search, Database, Wifi, WifiOff, 
  TrendingUp, Clock, Star, Heart, Plus, ChevronRight 
} from 'lucide-react';
import Link from 'next/link';

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

// Personalized row component
function PersonalizedRow({ title, items, type, loading, linkTo }) {
  if (loading) {
    return (
      <div className="space-y-4 mb-8">
        <div className="flex items-center justify-between px-4">
          <h2 className="text-lg md:text-xl font-semibold text-white">{title}</h2>
          <div className="w-20 h-4 bg-gray-700 rounded animate-pulse"></div>
        </div>
        <div className="flex gap-3 overflow-x-auto scrollbar-hide px-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="flex-shrink-0 w-32 h-48 bg-gray-800 rounded-lg animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!items || items.length === 0) {
    return null;
  }

  const category = {
    name: title,
    items: items.slice(0, 12), // Limit home page items
    count: items.length,
    categoryId: title.toLowerCase().replace(/\s+/g, '-')
  };

  return (
    <div className="space-y-4 mb-8">
      <div className="flex items-center justify-between px-4">
        <h2 className="text-lg md:text-xl font-semibold text-white">{title}</h2>
        {linkTo && (
          <Link 
            href={linkTo}
            className="flex items-center gap-1 text-red-500 hover:text-red-400 transition-colors text-sm"
          >
            See all <ChevronRight className="w-4 h-4" />
          </Link>
        )}
      </div>
      <div className="flex gap-3 overflow-x-auto scrollbar-hide px-4">
        {items.slice(0, 12).map((item, index) => (
          <NetflixContentCard
            key={`home-${item.stream_id || item.num || item.id || `${item.name}-${index}`}`}
            item={item}
            type={type}
            priority={false}
          />
        ))}
      </div>
    </div>
  );
}

// Stats component
function StatsRow({ stats }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 bg-gray-900/50 border border-gray-800 rounded-lg mx-4 mb-6">
      <div className="flex items-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span className="text-white font-medium">
            {stats.totalContent?.toLocaleString() || '0'} Total Items
          </span>
        </div>
        <div className="flex items-center gap-2 text-gray-400">
          <Tv className="w-4 h-4" />
          <span>{stats.totalLive?.toLocaleString() || '0'} Live</span>
        </div>
        <div className="flex items-center gap-2 text-gray-400">
          <Film className="w-4 h-4" />
          <span>{stats.totalMovies?.toLocaleString() || '0'} Movies</span>
        </div>
        <div className="flex items-center gap-2 text-gray-400">
          <MonitorSpeaker className="w-4 h-4" />
          <span>{stats.totalSeries?.toLocaleString() || '0'} Series</span>
        </div>
      </div>
    </div>
  );
}

// Welcome back section
function WelcomeSection({ profile }) {
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="px-4 py-6">
      <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
        {getGreeting()}, {profile?.name || 'Guest'}!
      </h1>
      <p className="text-gray-400">
        Ready to continue your streaming journey?
      </p>
    </div>
  );
}

// Main Netflix-style home page component
export default function PersonalizedHomePage({ profile }) {
  const { startMeasure, endMeasure } = usePerformance();
  const contentLoadedRef = useRef(false);
  
  const {
    loadDefaultPlaylist,
    getPlaylistCounts,
    globalLoading,
    error,
    clearError,
    isInitialized,
    initializeStore
  } = useSimplePlaylistStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [isOnline, setIsOnline] = useState(true);
  const [performanceMode, setPerformanceMode] = useState(false);

  // Personalized content states
  const [continueWatching, setContinueWatching] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [recentlyAdded, setRecentlyAdded] = useState([]);
  const [topRated, setTopRated] = useState([]);
  const [recommended, setRecommended] = useState([]);
  const [trending, setTrending] = useState([]);
  
  const [loadingStates, setLoadingStates] = useState({
    continueWatching: true,
    favorites: true,
    recentlyAdded: true,
    topRated: true,
    recommended: true,
    trending: true
  });

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
      if ('deviceMemory' in navigator && navigator.deviceMemory < 4) {
        setPerformanceMode(true);
        return;
      }
      
      if ('hardwareConcurrency' in navigator && navigator.hardwareConcurrency < 4) {
        setPerformanceMode(true);
        return;
      }
      
      if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
        setPerformanceMode(true);
      }
    };
    
    checkPerformance();
  }, []);

  // Initialize store on mount
  useEffect(() => {
    initializeStore();
  }, []); // Empty dependency array - only run on mount

  // Load personalized content
  const loadPersonalizedContent = useCallback(async () => {
    const measureId = startMeasure('load-personalized-content', 'dataLoad');
    
    try {
      // Load playlist for stats
      if (isInitialized && !globalLoading) {
        const result = await loadDefaultPlaylist();
        if (result.success && result.data) {
          const playlistStoreId = `${result.data._meta?.baseUrl}|${result.data._meta?.username}`;
          const counts = getPlaylistCounts(playlistStoreId);
          
          // Load personalized content with delays to prevent overwhelming
          const loadContent = async () => {
            // Continue Watching
            try {
              const continueData = await dataService.getContinueWatching(profile?.id || 'default', 12);
              setContinueWatching(Array.isArray(continueData) ? continueData : []);
            } catch (error) {
              console.warn('Failed to load continue watching:', error);
              setContinueWatching([]);
            }
            setLoadingStates(prev => ({ ...prev, continueWatching: false }));
            
            // Favorites
            setTimeout(async () => {
              try {
                const favData = await dataService.getFavorites(profile?.id || 'default', 12);
                setFavorites(Array.isArray(favData) ? favData : []);
              } catch (error) {
                console.warn('Failed to load favorites:', error);
                setFavorites([]);
              }
              setLoadingStates(prev => ({ ...prev, favorites: false }));
            }, 200);
            
            // Recently Added
            setTimeout(async () => {
              try {
                const recentData = await dataService.getRecentlyAdded('all', 12);
                setRecentlyAdded(Array.isArray(recentData) ? recentData : []);
              } catch (error) {
                console.warn('Failed to load recently added:', error);
                setRecentlyAdded([]);
              }
              setLoadingStates(prev => ({ ...prev, recentlyAdded: false }));
            }, 400);
            
            // Top Rated
            setTimeout(async () => {
              try {
                const topRatedData = await dataService.getTopRated('all', 12);
                setTopRated(Array.isArray(topRatedData) ? topRatedData : []);
              } catch (error) {
                console.warn('Failed to load top rated:', error);
                setTopRated([]);
              }
              setLoadingStates(prev => ({ ...prev, topRated: false }));
            }, 600);
            
            // Recommended
            setTimeout(async () => {
              try {
                const recData = await dataService.getRecommendations(profile?.id || 'default', 'all', 12);
                setRecommended(Array.isArray(recData) ? recData : []);
              } catch (error) {
                console.warn('Failed to load recommendations:', error);
                setRecommended([]);
              }
              setLoadingStates(prev => ({ ...prev, recommended: false }));
            }, 800);
            
            // Trending
            setTimeout(async () => {
              try {
                const trendingData = await dataService.getTopRated('all', 12);
                setTrending(Array.isArray(trendingData) ? trendingData : []);
              } catch (error) {
                console.warn('Failed to load trending:', error);
                setTrending([]);
              }
              setLoadingStates(prev => ({ ...prev, trending: false }));
            }, 1000);
          };
          
          loadContent();
        } else {
          console.warn('Failed to load playlist:', result);
        }
      } else {
        return;
      }
      
      endMeasure(measureId, { 
        success: true,
        profileId: profile?.id
      });
      
    } catch (error) {
      console.error('Error loading personalized content:', error);
      endMeasure(measureId, { success: false, error: error.message });
    }
  }, [profile?.id, isInitialized, globalLoading, loadDefaultPlaylist, getPlaylistCounts, startMeasure, endMeasure]);

  // Initialize data
  useEffect(() => {
    if (isInitialized && !globalLoading && !contentLoadedRef.current) {
      contentLoadedRef.current = true;
      loadPersonalizedContent();
    }
  }, [isInitialized, globalLoading]); // Removed loadPersonalizedContent dependency

  // Log performance summary on unmount
  useEffect(() => {
    return () => {
      if (process.env.NODE_ENV === 'development') {
        console.log('%c📊 Home Page Performance Summary', 'color: #2196F3; font-weight: bold; font-size: 14px;');
        performanceMonitor.logSummary();
      }
    };
  }, []);

  // Handle search
  const handleSearch = useCallback((query) => {
    setSearchQuery(query);
  }, []);

  // Handle retry
  const handleRetry = () => {
    clearError();
    contentLoadedRef.current = false; // Reset content loaded flag
    setLoadingStates({
      continueWatching: true,
      favorites: true,
      recentlyAdded: true,
      topRated: true,
      recommended: true,
      trending: true
    });
    loadPersonalizedContent();
  };

  // Calculate stats
  const stats = useMemo(() => {
    const state = useSimplePlaylistStore.getState();
    const defaultPlaylistId = state.defaultPlaylistId;
    const counts = defaultPlaylistId ? getPlaylistCounts(defaultPlaylistId) : null;
    
    return {
      totalContent: (counts?.totalLive || 0) + (counts?.totalVod || 0) + (counts?.totalSeries || 0),
      totalLive: counts?.totalLive || 0,
      totalMovies: counts?.totalVod || 0,
      totalSeries: counts?.totalSeries || 0
    };
  }, [getPlaylistCounts]);

  // Get featured content for hero
  const featuredContent = useMemo(() => {
    // Mix of top rated and recently added
    const featured = [];
    
    if (Array.isArray(topRated) && topRated.length > 0) {
      featured.push(...topRated.slice(0, 2));
    }
    
    if (Array.isArray(recentlyAdded) && recentlyAdded.length > 0) {
      featured.push(...recentlyAdded.slice(0, 2));
    }
    
    if (Array.isArray(recommended) && recommended.length > 0) {
      featured.push(...recommended.slice(0, 1));
    }
    
    return featured.length > 0 ? featured : null;
  }, [topRated, recentlyAdded, recommended]);

  // Show loading state
  if (!isInitialized || globalLoading) {
    return <NetflixHomePageSkeleton />;
  }

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <div className="min-h-screen bg-black">
        {/* Netflix Header */}
        <NetflixHeader 
          profile={profile}
          onSearch={handleSearch}
        />

        <div className="pt-16">
          {/* Welcome Section */}
          <WelcomeSection profile={profile} />
          
          {/* Stats */}
          <StatsRow stats={stats} />

          {/* Hero Section */}
          {featuredContent && (
            <NetflixHero featuredContent={featuredContent} />
          )}

          {/* Continue Watching */}
          {Array.isArray(continueWatching) && continueWatching.length > 0 && (
            <PersonalizedRow
              title="Continue Watching"
              items={continueWatching}
              type={continueWatching[0]?.type || 'movies'}
              loading={loadingStates.continueWatching}
            />
          )}

          {/* Favorites */}
          {Array.isArray(favorites) && favorites.length > 0 && (
            <PersonalizedRow
              title="My List"
              items={favorites}
              type={favorites[0]?.type || 'movies'}
              loading={loadingStates.favorites}
            />
          )}

          {/* Trending Now */}
          {Array.isArray(trending) && trending.length > 0 && (
            <PersonalizedRow
              title="Trending Now"
              items={trending}
              type={trending[0]?.type || 'movies'}
              loading={loadingStates.trending}
            />
          )}

          {/* Recommended */}
          {Array.isArray(recommended) && recommended.length > 0 && (
            <PersonalizedRow
              title="Recommended For You"
              items={recommended}
              type={recommended[0]?.type || 'movies'}
              loading={loadingStates.recommended}
            />
          )}

          {/* Recently Added Movies */}
          {Array.isArray(recentlyAdded) && recentlyAdded.filter(item => item.type === 'movies').length > 0 && (
            <PersonalizedRow
              title="New Movies"
              items={recentlyAdded.filter(item => item.type === 'movies')}
              type="movies"
              loading={loadingStates.recentlyAdded}
              linkTo="/movies"
            />
          )}

          {/* Recently Added Series */}
          {Array.isArray(recentlyAdded) && recentlyAdded.filter(item => item.type === 'series').length > 0 && (
            <PersonalizedRow
              title="New Series"
              items={recentlyAdded.filter(item => item.type === 'series')}
              type="series"
              loading={loadingStates.recentlyAdded}
              linkTo="/series"
            />
          )}

          {/* Top Rated */}
          {Array.isArray(topRated) && topRated.length > 0 && (
            <PersonalizedRow
              title="Top Rated"
              items={topRated}
              type={topRated[0]?.type || 'movies'}
              loading={loadingStates.topRated}
            />
          )}

          {/* Quick Access to Live */}
          <div className="px-4 mb-8">
            <Link 
              href="/live"
              className="flex items-center justify-between p-4 bg-gradient-to-r from-red-600 to-red-800 rounded-lg hover:from-red-700 hover:to-red-900 transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <Tv className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-lg">Live TV Channels</h3>
                  <p className="text-red-100 text-sm">Watch your favorite channels live</p>
                </div>
              </div>
              <ChevronRight className="w-6 h-6 text-white group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {/* Error state */}
          {error && (
            <div className="flex items-center justify-center h-64">
              <ErrorFallback error={{ message: error }} resetErrorBoundary={handleRetry} />
            </div>
          )}

          {/* Empty state */}
          {!loadingStates.continueWatching && 
           !loadingStates.favorites && 
           !loadingStates.recentlyAdded && 
           !loadingStates.topRated && 
           !loadingStates.recommended && 
           Array.isArray(continueWatching) && continueWatching.length === 0 && 
           Array.isArray(favorites) && favorites.length === 0 && 
           Array.isArray(recentlyAdded) && recentlyAdded.length === 0 && 
           Array.isArray(topRated) && topRated.length === 0 && 
           Array.isArray(recommended) && recommended.length === 0 && (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-800 flex items-center justify-center">
                  <Play className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Welcome to SyncStream!</h3>
                <p className="text-gray-400 mb-4">Start exploring our content library</p>
                <div className="space-y-2">
                  <Link 
                    href="/movies"
                    className="block px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                  >
                    Browse Movies
                  </Link>
                  <Link 
                    href="/series"
                    className="block px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                  >
                    Browse Series
                  </Link>
                  <Link 
                    href="/live"
                    className="block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    Watch Live TV
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Status indicators */}
        <div className="fixed bottom-4 right-4 flex items-center gap-4 text-xs text-gray-500">
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