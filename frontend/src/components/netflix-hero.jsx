'use client';

import React, { useState, useEffect } from 'react';
import { Play, Info, Volume2, VolumeX, ThumbsUp, Plus } from 'lucide-react';

export default function NetflixHero({ featuredContent }) {
  const [isMuted, setIsMuted] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  // If no featured content, use a fallback
  const content = featuredContent || {
    name: "Featured Content",
    description: "Discover amazing movies, series, and live channels from our extensive library.",
    stream_icon: null,
    rating: "8.5",
    year: 2024,
    duration: "2h 15m",
    type: "movies"
  };

  // Auto-rotate hero content every 30 seconds
  useEffect(() => {
    if (featuredContent && Array.isArray(featuredContent) && featuredContent.length > 1) {
      const timer = setInterval(() => {
        setCurrentImageIndex((prev) => (prev + 1) % featuredContent.length);
      }, 30000);
      
      return () => clearInterval(timer);
    }
  }, [featuredContent]);

  const currentContent = Array.isArray(featuredContent) 
    ? featuredContent[currentImageIndex] 
    : content;

  const getTypeColor = () => {
    switch (currentContent.type) {
      case 'live': return 'bg-red-600';
      case 'movies': return 'bg-blue-600';
      case 'series': return 'bg-purple-600';
      default: return 'bg-gray-600';
    }
  };

  const getTypeLabel = () => {
    switch (currentContent.type) {
      case 'live': return 'LIVE';
      case 'movies': return 'MOVIE';
      case 'series': return 'SERIES';
      default: return 'FEATURED';
    }
  };

  return (
    <div className="relative h-[70vh] min-h-[500px] bg-black overflow-hidden z-0">
      {/* Background Image/Video */}
      <div className="absolute inset-0">
        {currentContent.stream_icon ? (
          <>
            <img
              src={currentContent.stream_icon}
              alt={currentContent.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black via-black/40 to-transparent"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent"></div>
          </>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-red-900 via-black to-blue-900">
            <div className="absolute inset-0 bg-gradient-to-r from-black via-black/40 to-transparent"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent"></div>
          </div>
        )}
      </div>

      {/* Content Overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-6 md:p-12 lg:p-16 z-10">
        <div className="max-w-4xl">
          {/* Type Badge */}
          <div className="mb-4">
            <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getTypeColor()} text-white`}>
              {getTypeLabel()}
            </span>
          </div>

          {/* Title */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 leading-tight">
            {currentContent.name}
          </h1>

          {/* Meta Information */}
          <div className="flex items-center gap-4 mb-6 flex-wrap">
            <span className="text-green-400 font-medium">
              {currentContent.rating || '8.5'}% Match
            </span>
            <span className="text-white border border-gray-600 px-2 py-1 text-sm rounded">
              {currentContent.year || '2024'}
            </span>
            {currentContent.type === 'movies' && (
              <span className="text-white">
                {currentContent.duration || '2h 15m'}
              </span>
            )}
            <span className="text-white border border-gray-600 px-2 py-1 text-sm rounded">
              HD
            </span>
          </div>

          {/* Description */}
          <p className="text-gray-300 text-lg mb-8 max-w-3xl leading-relaxed">
            {currentContent.description || 
              `Experience the best in entertainment with our carefully curated collection of ${getTypeLabel().toLowerCase()} content. 
               Stream in stunning quality with our advanced technology.`}
          </p>

          {/* Action Buttons */}
          <div className="flex items-center gap-4 flex-wrap">
            <button className="flex items-center gap-2 bg-white text-black px-8 py-3 rounded-md font-semibold hover:bg-gray-200 transition-colors">
              <Play className="w-5 h-5" />
              Play
            </button>
            
            <button className="flex items-center gap-2 bg-gray-700/80 text-white px-8 py-3 rounded-md font-semibold hover:bg-gray-600/80 transition-colors">
              <Plus className="w-5 h-5" />
              My List
            </button>
            
            <button 
              className="flex items-center gap-2 bg-gray-700/80 text-white px-6 py-3 rounded-md font-semibold hover:bg-gray-600/80 transition-colors"
              onClick={() => setIsMuted(!isMuted)}
            >
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>
            
            <button className="flex items-center gap-2 bg-gray-700/80 text-white px-6 py-3 rounded-md font-semibold hover:bg-gray-600/80 transition-colors">
              <ThumbsUp className="w-5 h-5" />
            </button>
            
            <button className="flex items-center gap-2 bg-gray-700/80 text-white px-6 py-3 rounded-md font-semibold hover:bg-gray-600/80 transition-colors">
              <Info className="w-5 h-5" />
              More Info
            </button>
          </div>

          {/* Additional Info */}
          <div className="mt-6 text-sm text-gray-400">
            <div className="flex items-center gap-4 flex-wrap">
              <span>Cast: {currentContent.cast || 'Various Artists'}</span>
              <span>•</span>
              <span>Genres: {currentContent.genres || 'Drama, Action, Thriller'}</span>
              <span>•</span>
              <span>This {getTypeLabel().toLowerCase()} is: {currentContent.maturity || 'PG-13'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Dots (if multiple featured items) */}
      {Array.isArray(featuredContent) && featuredContent.length > 1 && (
        <div className="absolute bottom-6 right-6 flex items-center gap-2">
          {featuredContent.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentImageIndex(index)}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentImageIndex ? 'bg-white w-8' : 'bg-white/50'
              }`}
            />
          ))}
        </div>
      )}

      {/* Age Rating Badge */}
      <div className="absolute top-6 right-6">
        <span className="bg-gray-800/80 text-white px-3 py-1 rounded text-sm font-medium border border-gray-600">
          {currentContent.maturity || 'PG-13'}
        </span>
      </div>
    </div>
  );
}