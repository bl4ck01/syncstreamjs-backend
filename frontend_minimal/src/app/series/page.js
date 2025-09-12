'use client';

import { useState, useEffect } from 'react';
import usePlaylistStore from '../store/playlistStore';
import { getSeriesCategories, getSeriesStreamsByCategory, getStreamCountByCategory } from '../duckdb/queries';
import { ArrowLeft, Tv, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function SeriesPage() {
  const { categories } = usePlaylistStore();
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [streams, setStreams] = useState([]);
  const [streamCounts, setStreamCounts] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (categories.series.length > 0) {
      loadStreamCounts();
    }
  }, [categories.series]);

  useEffect(() => {
    if (selectedCategory) {
      loadStreams();
    }
  }, [selectedCategory]);

  const loadStreamCounts = async () => {
    try {
      const counts = {};
      await Promise.all(
        categories.series.map(async (category) => {
          counts[category.category_id] = await getStreamCountByCategory(category.category_id, 'series');
        })
      );
      setStreamCounts(counts);
    } catch (error) {
      console.error('Error loading stream counts:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStreams = async () => {
    if (!selectedCategory) return;
    
    setLoading(true);
    try {
      const streamsData = await getSeriesStreamsByCategory(selectedCategory.category_id, 20);
      setStreams(streamsData);
    } catch (error) {
      console.error('Error loading streams:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading && categories.series.length === 0) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-red-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="bg-black/80 backdrop-blur-md border-b border-gray-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/" className="flex items-center space-x-2 text-gray-300 hover:text-white transition-colors">
                <ArrowLeft className="w-5 h-5" />
                <span>Back</span>
              </Link>
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-red-600 rounded"></div>
                <h1 className="text-xl font-bold">TV Series</h1>
              </div>
            </div>
            <div className="text-sm text-gray-400">
              {categories.series.length} categories
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {!selectedCategory ? (
          /* Categories View */
          <div>
            <h2 className="text-2xl font-bold mb-6">Series Categories</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {categories.series.map((category) => (
                <button
                  key={category.category_id}
                  onClick={() => setSelectedCategory(category)}
                  className="bg-gray-900 hover:bg-gray-800 rounded-lg p-4 text-left transition-colors group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <Tv className="w-5 h-5 text-purple-400" />
                    <span className="text-xs text-gray-400">
                      {streamCounts[category.category_id] || 0} series
                    </span>
                  </div>
                  <h3 className="font-medium text-sm group-hover:text-purple-300 transition-colors line-clamp-2">
                    {category.category_name}
                  </h3>
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Category Streams View */
          <div>
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => {
                  setSelectedCategory(null);
                  setStreams([]);
                }}
                className="flex items-center space-x-2 text-gray-300 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Categories</span>
              </button>
              <div>
                <h2 className="text-2xl font-bold">{selectedCategory.category_name}</h2>
                <p className="text-gray-400 text-sm">
                  {streamCounts[selectedCategory.category_id] || 0} series available
                </p>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-red-600" />
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {streams.map((stream) => (
                  <div key={stream.stream_id} className="bg-gray-900 rounded-lg overflow-hidden group cursor-pointer">
                    <div className="aspect-[2/3] bg-gray-800 relative">
                      <img
                        src={stream.cover || stream.stream_icon || `https://ui-avatars.com/api/?name=${encodeURIComponent(stream.name)}&background=1f2937&color=fff&size=200x300`}
                        alt={stream.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(stream.name)}&background=1f2937&color=fff&size=200x300`;
                        }}
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                        <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center">
                          <Tv className="w-6 h-6" />
                        </div>
                      </div>
                      {stream.num_seasons && (
                        <div className="absolute top-2 right-2 bg-purple-600 text-xs px-2 py-1 rounded">
                          {stream.num_seasons} seasons
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <h3 className="font-medium text-sm line-clamp-2 mb-1">
                        {stream.name}
                      </h3>
                      {stream.releaseDate && (
                        <p className="text-xs text-gray-400">
                          {new Date(stream.releaseDate).getFullYear()}
                        </p>
                      )}
                      {stream.rating && (
                        <p className="text-xs text-yellow-400">
                          ⭐ {stream.rating}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {streams.length === 0 && !loading && (
              <div className="text-center py-12">
                <Tv className="w-16 h-16 mx-auto text-gray-600 mb-4" />
                <p className="text-gray-400">No series found in this category</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}