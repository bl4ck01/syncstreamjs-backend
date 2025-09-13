'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { getCategoriesPage, getStreamsPageByCategory } from '../storage/queries.js';

export const useVirtualCategories = (streamType) => {
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState(null);
  const [total, setTotal] = useState(0);
  const pageCache = useRef({});
  const fetchQueue = useRef(new Set());

  const parentRef = useRef(null);

  const fetchPage = useCallback(async (page) => {
    if (pageCache.current[page] || fetchQueue.current.has(page)) {
      return pageCache.current[page] || [];
    }
    
    fetchQueue.current.add(page);
    setIsFetching(true);
    try {
      const result = await getCategoriesPage(streamType, page, 20);
      if (page === 1) setTotal(result.pagination.total);
      pageCache.current[page] = result.categories;
      return result.categories;
    } catch (err) {
      console.error('Failed to fetch categories page:', err);
      setError(err);
      return [];
    } finally {
      fetchQueue.current.delete(page);
      setIsFetching(false);
    }
  }, [streamType]);

  const virtualizer = useVirtualizer({
    count: total,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80,
    overscan: 3,
  });

  const virtualItems = virtualizer.getVirtualItems();

  // Initial effect to load first page and establish total count
  useEffect(() => {
    const initializeData = async () => {
      if (total === 0) {
        console.log('🔄 Initializing categories for stream type:', streamType);
        await fetchPage(1);
      }
    };
    
    initializeData();
  }, [streamType, fetchPage, total]);

  useEffect(() => {
    if (total === 0) return;

    const pagesNeeded = new Set(
      virtualItems.map(vi => Math.floor(vi.index / 20) + 1)
    );

    const loadMissingPages = async () => {
      const promises = [];
      for (const page of pagesNeeded) {
        if (!pageCache.current[page]) {
          promises.push(fetchPage(page));
        }
      }
      await Promise.all(promises);

      const newItems = [];
      for (let i = 0; i < total; i++) {
        const page = Math.floor(i / 20) + 1;
        const pageIndex = i % 20;
        if (pageCache.current[page]?.[pageIndex]) {
          newItems[i] = pageCache.current[page][pageIndex];
        }
      }
      setCategories(newItems);
      setIsLoading(false);
    };

    loadMissingPages();
  }, [virtualItems, total, fetchPage]);

  return {
    categories,
    virtualizer,
    parentRef,
    isLoading,
    isFetching,
    error,
    total,
  };
};

export const useVirtualStreams = (categoryId) => {
  const [streams, setStreams] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState(null);
  const [total, setTotal] = useState(0);
  const pageCache = useRef({});
  const fetchQueue = useRef(new Set());

  const parentRef = useRef(null);

  const fetchPage = useCallback(async (page) => {
    if (pageCache.current[page] || fetchQueue.current.has(page)) {
      return pageCache.current[page] || [];
    }
    
    fetchQueue.current.add(page);
    setIsFetching(true);
    try {
      const result = await getStreamsPageByCategory(categoryId, page, 20);
      if (page === 1) setTotal(result.pagination.total);
      pageCache.current[page] = result.streams;
      return result.streams;
    } catch (err) {
      console.error('Failed to fetch streams page:', err);
      setError(err);
      return [];
    } finally {
      fetchQueue.current.delete(page);
      setIsFetching(false);
    }
  }, [categoryId]);

  const virtualizer = useVirtualizer({
    count: total,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 60,
    overscan: 5,
  });

  const virtualItems = virtualizer.getVirtualItems();

  // Initial effect to load first page and establish total count
  useEffect(() => {
    const initializeData = async () => {
      if (total === 0 && categoryId) {
        console.log('🔄 Initializing streams for category:', categoryId);
        await fetchPage(1);
      }
    };
    
    initializeData();
  }, [categoryId, fetchPage, total]);

  useEffect(() => {
    if (total === 0) return;

    const pagesNeeded = new Set(
      virtualItems.map(vi => Math.floor(vi.index / 20) + 1)
    );

    const loadMissingPages = async () => {
      const promises = [];
      for (const page of pagesNeeded) {
        if (!pageCache.current[page]) {
          promises.push(fetchPage(page));
        }
      }
      await Promise.all(promises);

      const newItems = [];
      for (let i = 0; i < total; i++) {
        const page = Math.floor(i / 20) + 1;
        const pageIndex = i % 20;
        if (pageCache.current[page]?.[pageIndex]) {
          newItems[i] = pageCache.current[page][pageIndex];
        }
      }
      setStreams(newItems);
      setIsLoading(false);
    };

    loadMissingPages();
  }, [virtualItems, total, fetchPage]);

  return {
    streams,
    virtualizer,
    parentRef,
    isLoading,
    isFetching,
    error,
    total,
  };
};