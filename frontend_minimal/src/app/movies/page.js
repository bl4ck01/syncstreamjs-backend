'use client';

import { useEffect } from 'react';
import { useMetadataStore } from '@/store/useMetadataStore';
import { loadInitialData } from '@/lib/dataLoader';
import VirtualizedContent from '@/components/VirtualizedContent/VirtualizedContent';

export default function MoviesPage() {
  const { playlist } = useMetadataStore();

  useEffect(() => {
    if (!playlist) return;
    loadInitialData('movie');
  }, [playlist]);

  return <VirtualizedContent type="movie" title="Movies" />;
}