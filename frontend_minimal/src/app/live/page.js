'use client';

import { useEffect, useState } from 'react';
import { useMetadataStore } from '@/store/useMetadataStore';
import { useUIStore } from '@/store/useUIStore';
import { loadInitialData } from '@/lib/dataLoader';
import { getCurrentProfileWithPlaylist, getPlaylistAction } from '@/lib/actions';
import { loadPlaylistData } from '@/lib/dataService';
import VirtualizedContent from '@/components/VirtualizedContent/VirtualizedContent';

export default function LivePage() {
  const { playlist, categories } = useMetadataStore();
  const { isLoading } = useUIStore();
  const [loadingAttempted, setLoadingAttempted] = useState(false);

  useEffect(() => {
    const loadPlaylistAndData = async () => {
      if (loadingAttempted) return;
      
      // If we already have playlist and categories, just load initial data
      if (playlist && categories.live.length > 0) {
        loadInitialData('live');
        return;
      }

      setLoadingAttempted(true);
      
      try {
        // If no playlist, try to load it
        if (!playlist) {
          console.log('🔍 Live page: No playlist found, attempting to load...');
          const profileResult = await getCurrentProfileWithPlaylist();
          
          if (!profileResult.success || !profileResult.data) {
            console.warn('❌ Live page: No profile found');
            return;
          }

          const profile = profileResult.data;
          const defaultPlaylistId = profile.default_playlist_id;

          if (!defaultPlaylistId) {
            console.warn('❌ Live page: No default playlist set');
            return;
          }
          
          const playlistResult = await getPlaylistAction(defaultPlaylistId);
          
          if (!playlistResult.success || !playlistResult.data) {
            console.warn('❌ Live page: Failed to get playlist');
            return;
          }

          const playlistData = playlistResult.data;
          
          // Load playlist data (this will process and insert into DuckDB)
          const loadResult = await loadPlaylistData(playlistData, false);
          
          if (loadResult.success) {
            console.log('✅ Live page: Playlist loaded successfully');
          } else {
            console.warn('❌ Live page: Failed to load playlist data:', loadResult.error);
          }
        } else {
          // We have playlist but no categories, load initial data
          console.log('🔍 Live page: Playlist exists, loading categories...');
          loadInitialData('live');
        }
      } catch (error) {
        console.error('❌ Live page: Error loading playlist/data:', error);
      }
    };

    loadPlaylistAndData();
  }, [playlist, categories.live.length, loadingAttempted]);

  if (isLoading && !playlist) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading live channels...</p>
        </div>
      </div>
    );
  }

  return <VirtualizedContent type="live" title="Live Channels" />;
}