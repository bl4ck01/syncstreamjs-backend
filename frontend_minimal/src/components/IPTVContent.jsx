'use client';

import { useState, useEffect, useCallback } from 'react';
import { getCategoriesPage, getStreamsPageByCategory } from '@/lib/storage/queries.js';
import { importFromProxyResponse } from '@/lib/storage/importer.js';
import { db } from '@/lib/storage/db.js';
import HeroSection from '@/components/ui/hero-section.jsx';
import ContentRow from '@/components/ui/content-row.jsx';
import { fetchPlaylistFromProxy } from '@/lib/proxy.js';

const IPTVContent = ({ streamType, pageTitle, pageDescription }) => {
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importMessage, setImportMessage] = useState('');
  const [error, setError] = useState(null);
  const [featuredContent, setFeaturedContent] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreCategories, setHasMoreCategories] = useState(true);

  // Load categories with pagination
  const loadCategories = useCallback(async (page = 1, append = false) => {
    try {
      const result = await getCategoriesPage(streamType, page, 20);
      
      if (append) {
        setCategories(prev => [...prev, ...result.categories]);
      } else {
        setCategories(result.categories);
        
        // Set featured content from first category
        if (result.categories.length > 0) {
          const firstCategory = result.categories[0];
          const streams = await getStreamsPageByCategory(firstCategory.id, 1, 1);
          if (streams.streams.length > 0) {
            setFeaturedContent(streams.streams[0]);
          }
        }
      }
      
      setHasMoreCategories(result.pagination.page < result.pagination.totalPages);
      setCurrentPage(result.pagination.page);
      setIsLoading(false);
      
    } catch (err) {
      setError(err);
      setIsLoading(false);
    }
  }, [streamType]);

  // Load more categories
  const loadMoreCategories = useCallback(async () => {
    if (isLoadingMore || !hasMoreCategories) return;
    
    setIsLoadingMore(true);
    try {
      await loadCategories(currentPage + 1, true);
    } finally {
      setIsLoadingMore(false);
    }
  }, [currentPage, hasMoreCategories, isLoadingMore, loadCategories]);

  // Initialize data
  useEffect(() => {
    const initializeData = async () => {
      try {
        setIsLoading(true);
        
        // Check if we need to import
        const categoryCount = await db.categories.count();
        const streamCount = await db.streams.count();
        
        const shouldImport = categoryCount === 0 || 
                           (categoryCount > 0 && streamCount === 0);
        
        if (shouldImport) {
          setIsImporting(true);
          const baseUrl = localStorage.getItem('iptv_base_url') || 'http://line.ottcst.com';
          const username = localStorage.getItem('iptv_username') || 'AmroussO';
          const password = localStorage.getItem('iptv_password') || 'IIFNYI3LTQ';

          const response = await fetchPlaylistFromProxy(baseUrl, username, password);
          const text = await response.text();

          await importFromProxyResponse(text, (msg, pct) => {
            setImportMessage(msg);
            setImportProgress(pct);
          });

          setIsImporting(false);
        }
        
        // Load categories
        await loadCategories(1, false);
        
      } catch (err) {
        setError(err);
        setIsImporting(false);
        setIsLoading(false);
      }
    };

    initializeData();
  }, [streamType, loadCategories]);

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

  return (
    <div className="bg-black text-white min-h-screen">
      {featuredContent && <HeroSection featuredContent={featuredContent} />}

      <div className={`relative z-10 ${featuredContent ? '-mt-32' : 'pt-20'}`}>
        <div className="px-4 md:px-16 py-8">
          <h1 className="text-4xl font-bold text-white mb-2">{pageTitle}</h1>
          <p className="text-gray-400 text-lg">{pageDescription}</p>
        </div>

        <CategoryRows categories={categories} streamType={streamType} />
        
        {hasMoreCategories && !isLoadingMore && (
          <div className="px-4 md:px-16 py-8 text-center">
            <button
              onClick={loadMoreCategories}
              className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
            >
              Load More Categories
            </button>
          </div>
        )}
        
        {isLoadingMore && (
          <div className="px-4 md:px-16 py-8 text-center">
            <div className="text-gray-400 text-lg">Loading more categories...</div>
          </div>
        )}
      </div>
    </div>
  );
};

// Simplified CategoryRows component
function CategoryRows({ categories, streamType }) {
  const [categoryStreams, setCategoryStreams] = useState({});
  const [loadingCategories, setLoadingCategories] = useState(new Set());

  const loadStreamsForCategory = useCallback(async (categoryId, categoryName, page = 1, append = false) => {
    if (loadingCategories.has(categoryId)) return;

    setLoadingCategories(prev => new Set(prev).add(categoryId));
    
    try {
      const result = await getStreamsPageByCategory(categoryId, page, 20);
      
      setCategoryStreams(prev => ({
        ...prev,
        [categoryId]: append && prev[categoryId] 
          ? [...prev[categoryId], ...result.streams]
          : result.streams
      }));
      
    } catch (err) {
      console.error(`Failed to load streams for ${categoryName}:`, err);
    } finally {
      setLoadingCategories(prev => {
        const newSet = new Set(prev);
        newSet.delete(categoryId);
        return newSet;
      });
    }
  }, []);

  const loadMoreStreamsForCategory = useCallback(async (categoryId, categoryName) => {
    const currentStreams = categoryStreams[categoryId] || [];
    const nextPage = Math.floor(currentStreams.length / 20) + 1;
    await loadStreamsForCategory(categoryId, categoryName, nextPage, true);
  }, [categoryStreams, loadStreamsForCategory]);

  // Load streams for all categories
  useEffect(() => {
    categories.forEach(category => {
      if (!categoryStreams[category.id] && !loadingCategories.has(category.id)) {
        loadStreamsForCategory(category.id, category.category_name);
      }
    });
  }, [categories, categoryStreams, loadingCategories, loadStreamsForCategory]);

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
        const streams = categoryStreams[category.id] || [];
        const isLoading = loadingCategories.has(category.id);
        
        return (
          <div key={category.id}>
            {isLoading && streams.length === 0 ? (
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
            ) : streams.length > 0 ? (
              <ContentRow
                title={`${category.category_name} (${streams.length})`}
                streams={streams}
                isLarge={index === 0}
                onLoadMore={() => loadMoreStreamsForCategory(category.id, category.category_name)}
                hasMore={streams.length % 20 === 0}
                isLoadingMore={loadingCategories.has(category.id)}
              />
            ) : (
              <div className="px-4 md:px-16">
                <h2 className="text-white text-xl md:text-2xl font-bold mb-4">
                  {category.category_name} (0)
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

export default IPTVContent;