'use client';

import { useEffect } from 'react';
import { useMetadataStore } from '@/store/useMetadataStore';
import { loadInitialData } from '@/lib/dataLoader';
import VirtualizedContent from '@/components/VirtualizedContent/VirtualizedContent';

export default function LivePage() {
  const { playlist } = useMetadataStore();

  useEffect(() => {
    if (!playlist) return;
    loadInitialData('live');
  }, [playlist]);

  return <VirtualizedContent type="live" title="Live Channels" />;
}