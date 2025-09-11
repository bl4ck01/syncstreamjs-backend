'use client';

import { useEffect, useState } from 'react';
import { useMetadataStore } from '@/store/useMetadataStore';
import { useUIStore } from '@/store/useUIStore';
import { loadInitialData } from '@/lib/dataLoader';
import { getCurrentProfileWithPlaylist, getPlaylistAction } from '@/lib/actions';
import { loadPlaylistData } from '@/lib/dataService';
import VirtualizedContent from '@/components/VirtualizedContent/VirtualizedContent';

export default function SeriesPage() {
  const { playlist, categories } = useMetadataStore();
  const { isLoading } = useUIStore();
  const [loadingAttempted, setLoadingAttempted] = useState(false);

  useEffect(() => {
    const loadPlaylistAndData = async () => {
      if (loadingAttempted) return;
      
      // If we already have playlist and categories, just load initial data
      if (playlist && categories.series.length > 0) {
        loadInitialData('series');
        return;
      }

      setLoadingAttempted(true);
      
      try {
        // If no playlist, try to load it
        if (!playlist) {
          console.log('🔍 Series page: No playlist found, attempting to load...');
          const profileResult = await getCurrentProfileWithPlaylist();
          
          if (!profileResult.success || !profileResult.data) {
            console.warn('❌ Series page: No profile found');
            return;
          }

          const profile = profileResult.data;
          const defaultPlaylistId = profile.default_playlist_id;

          if (!defaultPlaylistId) {
            console.warn('❌ Series page: No default playlist set');
            return;
          }
          
          const playlistResult = await getPlaylistAction(defaultPlaylistId);
          
          if (!playlistResult.success || !playlistResult.data) {
            console.warn('❌ Series page: Failed to get playlist');
            return;
          }

          const playlistData = playlistResult.data;
          
          // Load playlist data (this will process and insert into DuckDB)
          const loadResult = await loadPlaylistData(playlistData, false);
          
          if (loadResult.success) {
            console.log('✅ Series page: Playlist loaded successfully');
          } else {
            console.warn('❌ Series page: Failed to load playlist data:', loadResult.error);
          }
        } else {
          // We have playlist but no categories, load initial data
          console.log('🔍 Series page: Playlist exists, loading categories...');
          loadInitialData('series');
        }
      } catch (error) {
        console.error('❌ Series page: Error loading playlist/data:', error);
      }
    };

    loadPlaylistAndData();
  }, [playlist, categories.series.length, loadingAttempted]);

  if (isLoading && !playlist) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading TV series...</p>
        </div>
      </div>
    );
  }

  return <VirtualizedContent type="series" title="TV Series" />;
}