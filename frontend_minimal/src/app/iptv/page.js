'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { getCategoriesPage, getStreamsPageByCategory } from '../../lib/storage/queries.js';
import { fetchPlaylistFromProxy } from '../../lib/proxy.js';
import { importFromProxyResponse } from '../../lib/storage/importer.js';
import { db } from '../../lib/storage/db.js';
import HeroSection from '@/components/ui/hero-section.jsx';
import ContentRow from '@/components/ui/content-row.jsx';

export default function IPTVPage() {
  const searchParams = useSearchParams();
  const streamType = searchParams.get('type') || 'live';
  
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasInfiniteLoading, setHasInfiniteLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importMessage, setImportMessage] = useState('');
  const [error, setError] = useState(null);
  const [featuredContent, setFeaturedContent] = useState(null);

  // Define loadMoreCategories function at component level
  const loadMoreCategories = useCallback(async () => {
    console.log('🖱️ Load More Categories button clicked!');
    console.log(`🔍 Button click conditions: hasInfiniteLoading=${hasInfiniteLoading}, isLoadingMore=${isLoadingMore}`);
    
    if (!hasInfiniteLoading || isLoadingMore) {
      console.log('❌ Button click blocked by conditions');
      return;
    }
    
    setIsLoadingMore(true);
    const nextPage = currentPage + 1;
    console.log(`🔄 Loading more categories (page ${nextPage})...`);
    
    try {
      const result = await getCategoriesPage(streamType, nextPage, 20);
      console.log(`📂 Loaded additional categories (page ${nextPage}):`, result.categories.length, 'total pages:', result.pagination.totalPages);
      
      if (result.categories.length > 0) {
        setCategories(prev => [...prev, ...result.categories]);
        setHasInfiniteLoading(result.pagination.page < result.pagination.totalPages);
        setCurrentPage(result.pagination.page);
        console.log(`✅ Categories updated: now showing ${result.categories.length} more categories`);
      } else {
        console.log('⚠️ No more categories to load');
        setHasInfiniteLoading(false);
      }
    } catch (err) {
      console.error('❌ Failed to load more categories:', err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [hasInfiniteLoading, isLoadingMore, currentPage, streamType]);

  // Initialize data and handle import if needed
  useEffect(() => {
    console.log('🔄 IPTV Page useEffect running for type:', streamType);
    let isMounted = true;

    const initializeData = async () => {
      try {
        setIsLoading(true);
        
        // Check if we have any categories and streams
        const categoryCount = await db.categories.count();
        const streamCount = await db.streams.count();
        console.log('🔍 Initial category count:', categoryCount);
        console.log('🔍 Initial stream count:', streamCount);
        
        // Check if force import is requested via URL parameter
        const urlParams = new URLSearchParams(window.location.search);
        const forceImport = urlParams.get('force_import') === 'true';
        
        // Only import if:
        // 1. No data exists at all (categoryCount === 0)
        // 2. Incomplete import (categories exist but no streams)
        // 3. Force import is explicitly requested
        const shouldImport = categoryCount === 0 || 
                           (categoryCount > 0 && streamCount === 0) || 
                           forceImport;
        
        if (shouldImport) {
          if (forceImport) {
            console.log('🔄 Force import parameter detected - clearing database');
            await db.categories.clear();
            await db.streams.clear();
          } else if (streamCount === 0 && categoryCount > 0) {
            console.log('🔄 Found categories but no streams - clearing database for fresh import');
            await db.categories.clear();
            await db.streams.clear();
          } else if (categoryCount === 0) {
            console.log('🔄 No data found - starting fresh import');
          }
          // Import data if needed
          const baseUrl = localStorage.getItem('iptv_base_url') || 'http://line.ottcst.com';
          const username = localStorage.getItem('iptv_username') || 'AmroussO';
          const password = localStorage.getItem('iptv_password') || 'IIFNYI3LTQ';

          if (isMounted) setIsImporting(true);
          console.log('🚀 Starting import process...');

          const response = await fetchPlaylistFromProxy(baseUrl, username, password);
          const text = await response.text();
          console.log('📄 Received response text length:', text.length);

          await importFromProxyResponse(text, (msg, pct) => {
            if (isMounted) {
              console.log('📊 Progress:', msg, pct);
              setImportMessage(msg);
              setImportProgress(pct);
            }
          });

          console.log('✅ Import process completed');
          if (isMounted) setIsImporting(false);
        } else {
          console.log('✅ Data already exists in database - skipping import');
          console.log(`📊 Found ${categoryCount} categories and ${streamCount} streams`);
          
          // Check if we have categories for the current stream type
          const currentTypeCategories = await db.categories.where('stream_type').equals(streamType).count();
          const currentTypeStreams = await db.streams.where('stream_type').equals(streamType).count();
          console.log(`📊 For ${streamType}: ${currentTypeCategories} categories, ${currentTypeStreams} streams`);
        }

        // Load categories for the current stream type
        await loadCategories(streamType);
        
      } catch (err) {
        console.error('Initialization failed:', err);
        if (isMounted) {
          setError(err);
          setIsImporting(false);
        }
      }
    };

    const loadCategories = async (type, page = 1, append = false) => {
      try {
        const result = await getCategoriesPage(type, page, 20);
        console.log(`📂 Loaded categories (page ${page}):`, result.categories.length, 'of', result.pagination.total);
        
        if (result.categories.length > 0) {
          if (append) {
            setCategories(prev => [...prev, ...result.categories]);
          } else {
            setCategories(result.categories);
          }
          
          // Set featured content from first category's first stream (only on first page)
          if (page === 1) {
            const firstCategory = result.categories[0];
            if (firstCategory) {
              const streams = await getStreamsPageByCategory(firstCategory.id, 1, 1);
              if (streams.streams.length > 0) {
                setFeaturedContent(streams.streams[0]);
              }
            }
          }
        }
        
        // Enable infinite loading if there are more pages
        setHasInfiniteLoading(result.pagination.page < result.pagination.totalPages);
        setCurrentPage(result.pagination.page);
        setIsLoading(false);
      } catch (err) {
        console.error('Failed to load categories:', err);
        setError(err);
        setIsLoading(false);
      }
    };

    // loadMoreCategories is defined at component level, no need to redefine here

    initializeData();

    return () => {
      isMounted = false;
    };
  }, [streamType]);

  // Infinite scroll effect
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.offsetHeight;
      const distanceFromBottom = documentHeight - (scrollTop + windowHeight);
      
      console.log(`🔍 Scroll Debug: distance from bottom: ${distanceFromBottom}px, hasInfiniteLoading: ${hasInfiniteLoading}, isLoadingMore: ${isLoadingMore}`);
      
      if (distanceFromBottom <= 1000 && hasInfiniteLoading && !isLoadingMore) {
        console.log('🚀 Triggering loadMoreCategories from scroll');
        loadMoreCategories();
      }
    };

    if (hasInfiniteLoading) {
      console.log('📜 Setting up scroll listener, hasInfiniteLoading:', hasInfiniteLoading);
      window.addEventListener('scroll', handleScroll, { passive: true });
      return () => {
        console.log('📜 Removing scroll listener');
        window.removeEventListener('scroll', handleScroll);
      };
    }
  }, [hasInfiniteLoading, currentPage, isLoadingMore, loadMoreCategories]);

  if (isImporting) {
    return (
      <div className="flex items-center justify-center h-screen flex-col bg-black text-white pt-20">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold mb-2">📡 Loading Your Playlist</h2>
          <p className="text-gray-400 text-lg">Initializing streaming library...</p>
        </div>
        
        <div className="w-96 bg-gray-800 rounded-full h-2 mb-6">
          <div
            className="bg-red-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${importProgress}%` }}
          ></div>
        </div>
        <p className="text-xl mb-2">{importMessage}</p>
        <p className="text-gray-400 text-lg">{Math.round(importProgress)}% complete</p>
        
        {importMessage.includes('Error') && (
          <div className="mt-6 p-6 bg-red-900/50 border border-red-700 rounded-lg max-w-lg">
            <p className="text-red-400">
              Check browser console for details. Make sure your proxy server is running on localhost:8081
            </p>
          </div>
        )}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-black text-white pt-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-xl">Loading content...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-black text-white pt-20">
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-bold mb-4 text-red-500">Something went wrong</h2>
          <p className="text-gray-400 mb-6">{error.message}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-red-600 hover:bg-red-700 px-6 py-3 rounded font-semibold transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const getPageTitle = () => {
    switch (streamType) {
      case 'vod': return 'Movies';
      case 'series': return 'TV Shows';
      case 'live': 
      default: return 'Live TV';
    }
  };

  return (
    <div className="bg-black text-white min-h-screen">
      {/* Hero Section with featured content */}
      {featuredContent && (
        <HeroSection featuredContent={featuredContent} />
      )}

      {/* Content Section */}
      <div className={`relative z-10 ${featuredContent ? '-mt-32' : 'pt-20'}`}>
        {/* Page Title */}
        <div className="px-4 md:px-16 py-8">
          <h1 className="text-4xl font-bold text-white mb-2">{getPageTitle()}</h1>
          <p className="text-gray-400 text-lg">
            {streamType === 'live' && 'Watch live television channels from around the world'}
            {streamType === 'vod' && 'Browse our extensive collection of movies'}
            {streamType === 'series' && 'Catch up on your favorite TV shows and series'}
          </p>
        </div>

        {/* Category Rows */}
              <CategoryRows categories={categories} streamType={streamType} />
              
              {/* Load More Button */}
              {hasInfiniteLoading && !isLoadingMore && (
                <div className="px-4 md:px-16 py-8 text-center">
                  <button
                    onClick={() => {
                      console.log('🖱️ Button click detected!');
                      console.log(`📊 Current state: hasInfiniteLoading=${hasInfiniteLoading}, isLoadingMore=${isLoadingMore}, currentPage=${currentPage}`);
                      loadMoreCategories();
                    }}
                    className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
                  >
                    Load More Categories
                  </button>
                </div>
              )}
              
              {/* Debug info for Load More Button */}
              <div className="px-4 md:px-16 py-2 text-center text-gray-500 text-sm">
                Debug: hasInfiniteLoading={hasInfiniteLoading ? 'true' : 'false'}, isLoadingMore={isLoadingMore ? 'true' : 'false'}, currentPage={currentPage}
              </div>
              
              {isLoadingMore && (
                <div className="px-4 md:px-16 py-8 text-center">
                  <div className="text-gray-400 text-lg">Loading more categories...</div>
                </div>
              )}
            </div>
          </div>
        );
}

// Component to render category rows
function CategoryRows({ categories, streamType }) {
  const [categoryStreams, setCategoryStreams] = useState({});
  const [loadingCategories, setLoadingCategories] = useState(new Set());
  const [loadedCategories, setLoadedCategories] = useState(new Set());
  const [categoryPages, setCategoryPages] = useState({}); // Track current page for each category
  const [categoryTotals, setCategoryTotals] = useState({}); // Track total streams available for each category

  const loadStreamsForCategory = useCallback(async (categoryId, categoryName, page = 1, append = false) => {
    if (!append && (categoryStreams[categoryId] || loadingCategories.has(categoryId))) return;

    console.log(`🔄 Loading streams for category: ${categoryName} (${categoryId}) - page ${page}`);
    setLoadingCategories(prev => new Set(prev).add(categoryId));
    
    try {
      const result = await getStreamsPageByCategory(categoryId, page, 20);
      console.log(`✅ Loaded ${result.streams.length} streams for ${categoryName} (page ${page}/${result.pagination.totalPages}, total: ${result.pagination.total})`);
      
      setCategoryStreams(prev => ({
        ...prev,
        [categoryId]: append && prev[categoryId] 
          ? [...prev[categoryId], ...result.streams]
          : result.streams
      }));
      
      setCategoryPages(prev => ({
        ...prev,
        [categoryId]: { 
          current: page, 
          total: result.pagination.totalPages,
          hasMore: page < result.pagination.totalPages
        }
      }));
      
      setCategoryTotals(prev => ({
        ...prev,
        [categoryId]: result.pagination.total
      }));
      
      setLoadedCategories(prev => new Set(prev).add(categoryId));
    } catch (err) {
      console.error(`❌ Failed to load streams for category ${categoryName}:`, err);
    } finally {
      setLoadingCategories(prev => {
        const newSet = new Set(prev);
        newSet.delete(categoryId);
        return newSet;
      });
    }
  }, [categoryStreams, loadingCategories]);

  const loadMoreStreamsForCategory = useCallback(async (categoryId, categoryName) => {
    const currentPage = categoryPages[categoryId];
    if (!currentPage || !currentPage.hasMore || loadingCategories.has(categoryId)) return;

    const nextPage = currentPage.current + 1;
    await loadStreamsForCategory(categoryId, categoryName, nextPage, true);
  }, [categoryPages, loadingCategories, loadStreamsForCategory]);

  // Load streams for visible categories
  useEffect(() => {
    console.log(`🎯 CategoryRows useEffect - Loading streams for ${categories.length} categories`);
    categories.slice(0, 10).forEach(category => {
      console.log(`📂 Processing category: ${category.category_name} (${category.id})`);
      loadStreamsForCategory(category.id, category.category_name);
    });
  }, [categories, loadStreamsForCategory]);

  if (categories.length === 0) {
    return (
      <div className="px-4 md:px-16 py-12 text-center">
        <h2 className="text-2xl font-bold text-gray-400 mb-4">No content available</h2>
        <p className="text-gray-500">
          {streamType === 'live' && 'No live channels found'}
          {streamType === 'vod' && 'No movies found'}
          {streamType === 'series' && 'No TV series found'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {categories.map((category, index) => {
        const streams = categoryStreams[category.id];
        const isLoading = loadingCategories.has(category.id);
        const hasLoaded = loadedCategories.has(category.id);
        
        console.log(`🔍 Category ${category.category_name}: streams=${streams?.length || 0}, isLoading=${isLoading}, hasLoaded=${hasLoaded}`);
        
        // Always show categories that are loading, have streams, or have attempted to load
        const shouldShow = isLoading || streams || hasLoaded;
        
        if (!shouldShow) {
          return null;
        }

        return (
          <div key={category.id}>
            {isLoading ? (
              <div className="px-4 md:px-16">
                <h2 className="text-white text-xl md:text-2xl font-bold mb-4">
                  {category.category_name}
                </h2>
                <div className="flex space-x-4 px-4 md:px-0">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="min-w-[200px] aspect-[2/3] bg-gray-800 rounded-md animate-pulse" />
                  ))}
                </div>
              </div>
            ) : streams && streams.length > 0 ? (
              <ContentRow
                title={`${category.category_name} (${streams.length}${categoryTotals[category.id] ? `/${categoryTotals[category.id]}` : ''})`}
                streams={streams}
                isLarge={index === 0}
                onLoadMore={() => loadMoreStreamsForCategory(category.id, category.category_name)}
                hasMore={categoryPages[category.id]?.hasMore || false}
                isLoadingMore={loadingCategories.has(category.id)}
              />
            ) : (
              <div className="px-4 md:px-16">
                <h2 className="text-white text-xl md:text-2xl font-bold mb-4">
                  {category.category_name} (0${categoryTotals[category.id] ? `/${categoryTotals[category.id]}` : ''})
                </h2>
                <p className="text-gray-400">No content available in this category</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}