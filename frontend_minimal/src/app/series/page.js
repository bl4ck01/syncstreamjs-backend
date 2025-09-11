'use client';

import { useEffect } from 'react';
import { useMetadataStore } from '@/store/useMetadataStore';
import { loadInitialData } from '@/lib/dataLoader';
import VirtualizedContent from '@/components/VirtualizedContent/VirtualizedContent';

export default function SeriesPage() {
  const { playlist } = useMetadataStore();

  useEffect(() => {
    if (!playlist) return;
    loadInitialData('series');
  }, [playlist]);

  return <VirtualizedContent type="series" title="TV Series" />;
}