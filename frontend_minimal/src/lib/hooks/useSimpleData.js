'use client';

import { useState, useCallback } from 'react';

// Simple data hook without complex virtualization
export const useSimpleData = (fetchFunction, dependencies = []) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const loadData = useCallback(async (pageNum = 1, append = false) => {
    if (loading || (!hasMore && pageNum > 1)) return;

    setLoading(true);
    try {
      const result = await fetchFunction(pageNum);
      
      if (append) {
        setData(prev => [...prev, ...result.data]);
      } else {
        setData(result.data);
      }
      
      setHasMore(result.pagination.page < result.pagination.totalPages);
      setPage(result.pagination.page);
      
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [fetchFunction, loading, hasMore]);

  const loadMore = useCallback(() => {
    if (hasMore && !loading) {
      loadData(page + 1, true);
    }
  }, [loadData, hasMore, loading, page]);

  const refresh = useCallback(() => {
    setData([]);
    setPage(1);
    setHasMore(true);
    setError(null);
    loadData(1, false);
  }, [loadData]);

  return {
    data,
    loading,
    error,
    page,
    hasMore,
    loadMore,
    refresh,
    loadData
  };
};