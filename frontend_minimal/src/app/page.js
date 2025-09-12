'use client';

import { useState } from 'react';
import usePlaylistStore from '../store/playlistStore';
import Link from 'next/link';
import { Play, Film, Tv, RefreshCw, AlertCircle, Check } from 'lucide-react';

export default function HomePage() {
  const {
    baseUrl,
    username,
    password,
    setCredentials,
    fetchAndIngestData,
    isLoading,
    error,
    lastFetchedAt,
    statistics,
    categories,
    clearError
  } = usePlaylistStore();

  const [formError, setFormError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    if (!baseUrl.trim() || !username.trim() || !password.trim()) {
      setFormError('Please fill in all fields');
      return;
    }

    setFormError('');
    clearError();
    await fetchAndIngestData();
  };

  const hasData = statistics || categories.live.length > 0 || categories.vod.length > 0 || categories.series.length > 0;

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="bg-black/80 backdrop-blur-md border-b border-gray-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-red-600 rounded"></div>
              <h1 className="text-2xl font-bold">STREAM</h1>
            </div>
            {statistics && (
              <div className="text-sm text-gray-400">
                {statistics.totalItems?.toLocaleString()} titles available
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {!hasData ? (
          /* Login Form */
          <div className="max-w-md mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-2">Welcome to STREAM</h2>
              <p className="text-gray-400">Enter your playlist credentials to get started</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Playlist URL
                </label>
                <input
                  type="url"
                  value={baseUrl}
                  onChange={(e) => setCredentials(e.target.value, username, password)}
                  placeholder="https://example.com/playlist.m3u"
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-white"
                  disabled={isLoading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setCredentials(baseUrl, e.target.value, password)}
                  placeholder="Enter username"
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-white"
                  disabled={isLoading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setCredentials(baseUrl, username, e.target.value)}
                  placeholder="Enter password"
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-white"
                  disabled={isLoading}
                />
              </div>

              {(formError || error) && (
                <div className="flex items-center space-x-2 p-3 bg-red-900/30 border border-red-700 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-400" />
                  <span className="text-red-400 text-sm">{formError || error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-800 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Loading...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5" />
                    <span>Load Playlist</span>
                  </>
                )}
              </button>
            </form>
          </div>
        ) : (
          /* Dashboard */
          <div>
            {/* Stats Section */}
            {statistics && (
              <div className="mb-8">
                <h2 className="text-2xl font-bold mb-4">Your Library</h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-gray-900 rounded-lg p-6">
                    <div className="text-3xl font-bold text-blue-400">
                      {statistics.totalLive?.toLocaleString() || 0}
                    </div>
                    <div className="text-gray-400 flex items-center space-x-1">
                      <Tv className="w-4 h-4" />
                      <span>Live Channels</span>
                    </div>
                  </div>
                  <div className="bg-gray-900 rounded-lg p-6">
                    <div className="text-3xl font-bold text-green-400">
                      {statistics.totalVod?.toLocaleString() || 0}
                    </div>
                    <div className="text-gray-400 flex items-center space-x-1">
                      <Film className="w-4 h-4" />
                      <span>Movies</span>
                    </div>
                  </div>
                  <div className="bg-gray-900 rounded-lg p-6">
                    <div className="text-3xl font-bold text-purple-400">
                      {statistics.totalSeries?.toLocaleString() || 0}
                    </div>
                    <div className="text-gray-400 flex items-center space-x-1">
                      <Tv className="w-4 h-4" />
                      <span>TV Series</span>
                    </div>
                  </div>
                  <div className="bg-gray-900 rounded-lg p-6">
                    <div className="text-3xl font-bold text-white">
                      {statistics.totalItems?.toLocaleString() || 0}
                    </div>
                    <div className="text-gray-400">Total Titles</div>
                  </div>
                </div>
              </div>
            )}

            {/* Categories Section */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">Browse Content</h2>
                {lastFetchedAt && (
                  <div className="text-sm text-gray-400 flex items-center space-x-1">
                    <Check className="w-4 h-4 text-green-400" />
                    <span>
                      Last updated: {new Date(lastFetchedAt).toLocaleTimeString()}
                    </span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Live TV */}
                {categories.live.length > 0 && (
                  <Link href="/live">
                    <div className="bg-gradient-to-br from-blue-900/50 to-blue-800/30 border border-blue-700 rounded-lg p-6 hover:from-blue-800/50 hover:to-blue-700/30 transition-all cursor-pointer group">
                      <div className="flex items-center justify-between mb-4">
                        <Tv className="w-8 h-8 text-blue-400" />
                        <div className="text-sm text-blue-400 bg-blue-900/50 px-2 py-1 rounded">
                          {categories.live.length} categories
                        </div>
                      </div>
                      <h3 className="text-xl font-bold mb-2 group-hover:text-blue-300 transition-colors">
                        Live TV
                      </h3>
                      <p className="text-gray-400 text-sm">
                        Watch live television channels from around the world
                      </p>
                    </div>
                  </Link>
                )}

                {/* Movies */}
                {categories.vod.length > 0 && (
                  <Link href="/movies">
                    <div className="bg-gradient-to-br from-green-900/50 to-green-800/30 border border-green-700 rounded-lg p-6 hover:from-green-800/50 hover:to-green-700/30 transition-all cursor-pointer group">
                      <div className="flex items-center justify-between mb-4">
                        <Film className="w-8 h-8 text-green-400" />
                        <div className="text-sm text-green-400 bg-green-900/50 px-2 py-1 rounded">
                          {categories.vod.length} categories
                        </div>
                      </div>
                      <h3 className="text-xl font-bold mb-2 group-hover:text-green-300 transition-colors">
                        Movies
                      </h3>
                      <p className="text-gray-400 text-sm">
                        Browse our extensive collection of movies
                      </p>
                    </div>
                  </Link>
                )}

                {/* TV Series */}
                {categories.series.length > 0 && (
                  <Link href="/series">
                    <div className="bg-gradient-to-br from-purple-900/50 to-purple-800/30 border border-purple-700 rounded-lg p-6 hover:from-purple-800/50 hover:to-purple-700/30 transition-all cursor-pointer group">
                      <div className="flex items-center justify-between mb-4">
                        <Tv className="w-8 h-8 text-purple-400" />
                        <div className="text-sm text-purple-400 bg-purple-900/50 px-2 py-1 rounded">
                          {categories.series.length} categories
                        </div>
                      </div>
                      <h3 className="text-xl font-bold mb-2 group-hover:text-purple-300 transition-colors">
                        TV Series
                      </h3>
                      <p className="text-gray-400 text-sm">
                        Catch up on your favorite TV shows and series
                      </p>
                    </div>
                  </Link>
                )}
              </div>
            </div>

            {/* Refresh Button */}
            <div className="text-center">
              <button
                onClick={fetchAndIngestData}
                disabled={isLoading}
                className="bg-gray-800 hover:bg-gray-700 disabled:bg-gray-900 disabled:cursor-not-allowed text-white font-medium py-2 px-6 rounded-lg transition-colors flex items-center space-x-2 mx-auto"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Refreshing...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    <span>Refresh Data</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}