'use client';

import React, { useState, useCallback } from 'react';
import { Play, Info, Volume2, VolumeX, ThumbsUp, ThumbsDown, Plus, Check } from 'lucide-react';

export default function NetflixContentCard({ item, type, priority = false }) {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isVisible, setIsVisible] = useState(priority);
  const [isHovered, setIsHovered] = useState(false);
  const [isMuted, setIsMuted] = useState(true);

  // Lazy load images using Intersection Observer
  React.useEffect(() => {
    if (priority) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    const card = document.getElementById(`netflix-card-${item.stream_id || item.num}`);
    if (card) {
      observer.observe(card);
    }

    return () => observer.disconnect();
  }, [item.stream_id, item.num, priority]);

  const handleImageError = useCallback(() => {
    setImageError(true);
    setImageLoaded(false);
  }, []);

  const handleImageLoad = useCallback(() => {
    setImageLoaded(true);
  }, []);

  const getTypeColor = () => {
    switch (type) {
      case 'live': return 'bg-red-600';
      case 'movies': return 'bg-blue-600';
      case 'series': return 'bg-purple-600';
      default: return 'bg-gray-600';
    }
  };

  const getTypeLabel = () => {
    switch (type) {
      case 'live': return 'LIVE';
      case 'movies': return 'MOVIE';
      case 'series': return 'SERIES';
      default: return 'CONTENT';
    }
  };

  // Generate rating if not available
  const rating = item.rating || `${Math.floor(Math.random() * 2) + 7}.${Math.floor(Math.random() * 10)}`;
  const year = item.year || new Date().getFullYear();
  const duration = item.duration || `${Math.floor(Math.random() * 2) + 1}h ${Math.floor(Math.random() * 60)}m`;

  return (
    <div 
      id={`netflix-card-${item.stream_id || item.num}`}
      className="flex-shrink-0 relative group cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Base Card */}
      <div className="relative">
        {/* Netflix-style card with proper aspect ratio */}
        <div className="w-[160px] sm:w-[200px] md:w-[240px] aspect-[2/3] bg-black rounded-sm overflow-hidden shadow-lg">
          {isVisible && item.stream_icon && !imageError ? (
            <>
              <img
                src={item.stream_icon}
                alt={item.name}
                className={`w-full h-full object-cover transition-all duration-500 ${
                  imageLoaded ? 'opacity-100' : 'opacity-0'
                } ${isHovered ? 'scale-110' : ''}`}
                onError={handleImageError}
                onLoad={handleImageLoad}
                loading={priority ? 'eager' : 'lazy'}
                sizes="(max-width: 640px) 160px, (max-width: 1024px) 200px, (max-width: 1280px) 220px, 240px"
              />
              {!imageLoaded && (
                <div className="absolute inset-0 bg-gradient-to-br from-gray-800 via-gray-700 to-gray-800 flex items-center justify-center">
                  <div className="w-8 h-8 border-2 border-gray-600 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </>
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-gray-800 via-gray-700 to-gray-800 flex items-center justify-center">
              <div className="text-center">
                <div className="w-12 h-12 bg-gray-600 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Play className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-xs text-gray-400 px-2 line-clamp-2">{item.name}</p>
              </div>
            </div>
          )}
          
          {/* Always visible elements */}
          <div className="absolute top-2 right-2">
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${getTypeColor()} text-white`}>
              {getTypeLabel()}
            </span>
          </div>
          
          {/* Bottom gradient overlay */}
          <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-black via-black/60 to-transparent"></div>
          
          {/* Title overlay */}
          <div className="absolute bottom-2 left-2 right-2">
            <h3 className="text-white font-medium text-sm line-clamp-2 mb-1">{item.name}</h3>
            <div className="flex items-center gap-2 text-xs text-gray-300">
              <span>{rating}</span>
              <span>•</span>
              <span>{year}</span>
              {type === 'movies' && (
                <>
                  <span>•</span>
                  <span>{duration}</span>
                </>
              )}
            </div>
          </div>
        </div>
        
        {/* Netflix-style hover overlay */}
        <div 
          className={`absolute inset-0 bg-black transition-all duration-300 rounded-sm ${
            isHovered ? 'opacity-100 scale-110 z-50 shadow-2xl' : 'opacity-0 scale-100 z-10'
          }`}
          style={{ boxShadow: isHovered ? '0 25px 50px -12px rgba(0, 0, 0, 0.8)' : 'none' }}
        >
          {isVisible && item.stream_icon && !imageError && (
            <img
              src={item.stream_icon}
              alt={item.name}
              className="w-full h-full object-cover"
            />
          )}
          
          {/* Dark overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>
          
          {/* Hover content */}
          <div className="absolute inset-0 flex flex-col">
            {/* Top actions */}
            <div className="flex items-center justify-between p-3">
              <div className="flex items-center gap-2">
                <button className="w-8 h-8 bg-white text-black rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors">
                  <Play className="w-4 h-4 ml-0.5" />
                </button>
                <button className="w-8 h-8 bg-gray-800/80 text-white rounded-full flex items-center justify-center hover:bg-gray-700/80 transition-colors">
                  <Plus className="w-4 h-4" />
                </button>
                <button className="w-8 h-8 bg-gray-800/80 text-white rounded-full flex items-center justify-center hover:bg-gray-700/80 transition-colors">
                  <ThumbsUp className="w-4 h-4" />
                </button>
              </div>
              <button 
                className="w-8 h-8 bg-gray-800/80 text-white rounded-full flex items-center justify-center hover:bg-gray-700/80 transition-colors"
                onClick={() => setIsMuted(!isMuted)}
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
            </div>
            
            {/* Center content */}
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center px-4">
                <div className="flex items-center justify-center gap-2 text-xs text-white mb-2">
                  <span className="text-green-400 font-medium">{rating}% Match</span>
                  <span>{year}</span>
                  {type === 'movies' && <span>{duration}</span>}
                </div>
                <p className="text-xs text-gray-300 line-clamp-3">
                  {item.description || `${item.name} - ${getTypeLabel()} content available for streaming now.`}
                </p>
              </div>
            </div>
            
            {/* Bottom actions */}
            <div className="p-3">
              <div className="flex items-center justify-between">
                <button className="text-xs text-gray-300 hover:text-white transition-colors flex items-center gap-1">
                  <Info className="w-3 h-3" />
                  More Info
                </button>
                <div className="flex items-center gap-1">
                  {item.categoryName && (
                    <span className="text-xs text-gray-400">{item.categoryName}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}