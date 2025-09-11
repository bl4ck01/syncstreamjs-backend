'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useLiveStore } from '@/store/live-store';
import NetflixHero from '@/components/netflix-hero';
import CategoriesContainer from '@/components/categories-container';
import { NetflixHomePageSkeleton } from '@/components/netflix-skeleton-loading';
import { Tv, Wifi, WifiOff } from 'lucide-react';
import { ErrorBoundary } from 'react-error-boundary';
import { optimizedDataService } from '@/services/optimized-data-service';

// Error fallback component
function ErrorFallback({ error, resetErrorBoundary }) {
  return (
    <div className="h-screen flex items-center justify-center bg-black text-white p-6">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-900/20 flex items-center justify-center">
          <Tv className="w-8 h-8 text-red-500" />
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

// Main Live Page Component
export default function LivePage() {
  console.log('[LivePage] 🔥 Component rendering - OPTIMIZED');
  
  const {
    initialize,
    loading,
    error,
    clearError,
    isInitialized,
    performanceMode,
    setPerformanceMode
  } = useLiveStore();

  const [pageData, setPageData] = useState(null);
  const [isOnline, setIsOnline] = useState(true);

  // Initialize store and load data
  useEffect(() => {
    console.log('[LivePage] 🚀 Component mounted, initializing...');
    
    const initializePage = async () => {
      try {
        // Initialize store
        await initialize();
        
        // Load optimized page data
        const data = await optimizedDataService.getLivePageData({ limit: 20 });
        setPageData(data);
        
        console.log('[LivePage] ✅ Page data loaded:', {
          categories: data.categories.length,
          totalChannels: data.totalChannels
        });
      } catch (error) {
        console.error('[LivePage] ❌ Initialization failed:', error);
      }
    };

    initializePage();
  }, [initialize]);

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
  }, [setPerformanceMode]);

  // Handle retry
  const handleRetry = async () => {
    clearError();
    try {
      const data = await optimizedDataService.getLivePageData({ limit: 20 });
      setPageData(data);
    } catch (error) {
      console.error('[LivePage] ❌ Retry failed:', error);
    }
  };

  // Show loading state
  if (!isInitialized || loading) {
    return <NetflixHomePageSkeleton />;
  }

  // Get featured content for hero section
  const featuredContent = useMemo(() => {
    if (!pageData?.featured?.length) return null;
    
    return pageData.featured.map(item => ({
      ...item,
      type: 'live',
      description: `Live ${item.categoryName} channel`
    }));
  }, [pageData]);

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <div className="h-screen bg-black overflow-x-hidden overflow-y-auto">
        {/* Hero Section */}
        <div className="pt-2">
          {featuredContent && (
            <NetflixHero featuredContent={featuredContent} />
          )}
        </div>

        {/* Content Area */}
        <div className="relative z-10 pb-20">
          {error ? (
            <ErrorFallback error={{ message: error }} resetErrorBoundary={handleRetry} />
          ) : (
            <CategoriesContainer
              contentType="live"
              activeTab="live"
              performanceMode={performanceMode}
              initialData={pageData}
            />
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