'use client';

import { useState, useEffect, useCallback } from 'react';
import { useMetadataStore } from '../store/useMetadataStore';
import { useUIStore } from '../store/useUIStore';
import { getCurrentProfileWithPlaylist, getPlaylistAction } from '../lib/actions';
import { loadPlaylistData } from '../lib/dataService';
import Link from 'next/link';

export default function HomePage() {
  const { playlist, categories, setPlaylist, setCategories } = useMetadataStore();
  const { isLoading, errors, setLoading, setError } = useUIStore();
  const [loadingProgress, setLoadingProgress] = useState('');

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') {
      return;
    }

    // Check if we already have meaningful data
    const hasData = playlist && (
      categories.live.length > 0 || 
      categories.movie.length > 0 || 
      categories.series.length > 0
    );

    if (hasData) {
      console.log('✅ Home page: Using existing cached data');
      return;
    }

    // If we have a playlist, try to load from cache
    if (playlist) {
      loadDefaultPlaylist(false);
    }
  }, [playlist, categories.live.length, categories.movie.length, categories.series.length, loadDefaultPlaylist]);

  async function loadDefaultPlaylist(forceRefresh = false) {
    setLoading(true);
    setLoadingProgress('Loading profile...');
    
    try {
      // Get current profile with default playlist
      const profileResult = await getCurrentProfileWithPlaylist();
      
      if (!profileResult.success || !profileResult.data) {
        setError('home', 'No profile found. Please login first.');
        return;
      }

      const profile = profileResult.data;
      const defaultPlaylistId = profile.default_playlist_id;

      if (!defaultPlaylistId) {
        setError('home', 'No default playlist set for this profile.');
        return;
      }

      setLoadingProgress('Loading playlist details...');
      
      // Get playlist details
      const playlistResult = await getPlaylistAction(defaultPlaylistId);
      
      if (!playlistResult.success || !playlistResult.data) {
        setError('home', 'Failed to load playlist details.');
        return;
      }

      const playlistData = playlistResult.data;
      
      // Set playlist in store
      setPlaylist({
        id: playlistData.id,
        name: playlistData.name,
        url: playlistData.url,
        username: playlistData.username,
        password: playlistData.password
      });

      setLoadingProgress('Loading streams data...');
      
      // Use data service with DuckDB-first approach
      const result = await loadPlaylistData(playlistData, forceRefresh);
      
      if (!result.success) {
        setError('home', result.error || 'Failed to load playlist data');
        return;
      }
      
      // Set categories from result
      setCategories('live', result.categories.live);
      setCategories('movie', result.categories.movie);
      setCategories('series', result.categories.series);

      const source = result.fromCache ? (result.isFallback ? 'cache (fallback)' : 'cache') : 'proxy';
      console.log(`Playlist loaded successfully from ${source}:`, {
        playlist: playlistData.name,
        ...result.counts
      });

    } catch (error) {
      console.error('Failed to load playlist:', error);
      setError('home', error.message || 'Failed to load playlist');
    } finally {
      setLoading(false);
      setLoadingProgress('');
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">DuckStream</h1>
          <div className="space-y-4">
            <div className="animate-spin rounded-full border-2 border-gray-300 border-t-blue-500 w-8 h-8 mx-auto"></div>
            <p className="text-gray-600">{loadingProgress || 'Loading...'}</p>
          </div>
        </div>
      </div>
    );
  }

  if (errors.home) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">DuckStream</h1>
          <div className="space-y-4">
            <div className="text-red-500 mb-2">⚠️ Error</div>
            <p className="text-gray-600 mb-4">{errors.home}</p>
            <button 
              onClick={loadDefaultPlaylist}
              className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <h1 className="text-4xl font-bold text-gray-800 mb-4">DuckStream</h1>
        <p className="text-gray-600 mb-8">
          Memory-Optimized, Virtualized, Low-End Friendly IPTV Frontend
        </p>
        
        {playlist ? (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-green-800 font-medium">✅ {playlist.name}</p>
              <p className="text-green-600 text-sm">Playlist loaded and ready!</p>
            </div>
            
            <div className="space-y-2">
              <button 
                onClick={() => loadDefaultPlaylist(true)}
                className="w-full bg-orange-500 text-white py-2 px-4 rounded hover:bg-orange-600 transition-colors text-sm"
              >
                🔄 Refresh from Proxy
              </button>
            </div>
            
            <div className="grid grid-cols-1 gap-3">
              <Link 
                href="/live" 
                className="bg-blue-500 text-white py-3 px-4 rounded hover:bg-blue-600 transition-colors text-lg font-semibold"
              >
                📺 Live Channels ({categories.live.length})
              </Link>
              <Link 
                href="/movies" 
                className="bg-green-500 text-white py-3 px-4 rounded hover:bg-green-600 transition-colors text-lg font-semibold"
              >
                🎬 Movies ({categories.movie.length})
              </Link>
              <Link 
                href="/series" 
                className="bg-purple-500 text-white py-3 px-4 rounded hover:bg-purple-600 transition-colors text-lg font-semibold"
              >
                📺 TV Series ({categories.series.length})
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-gray-500 mb-4">No playlist loaded</p>
            <div className="space-y-2">
              <button 
                onClick={loadDefaultPlaylist}
                className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 transition-colors"
              >
                Load Default Playlist
              </button>
            </div>
          </div>
        )}
      </div>
      
      <div className="mt-8 text-center text-gray-500 text-sm">
        <p>Built with Next.js, DuckDB, and Zustand</p>
        <p className="mt-2">Optimized for 200k+ streams on low-end devices</p>
      </div>
    </div>
  );
}