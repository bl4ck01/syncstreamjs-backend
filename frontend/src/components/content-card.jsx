'use client';

import { useState, useCallback, useEffect } from 'react';
import { Play, Tv, Film, MonitorSpeaker } from 'lucide-react';

export default function ContentCard({ item, type, priority = false }) {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isVisible, setIsVisible] = useState(priority);

  // Lazy load images using Intersection Observer
  useEffect(() => {
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

    const card = document.getElementById(`card-${item.stream_id || item.num}`);
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

  const getIcon = () => {
    switch (type) {
      case 'live': return <Tv className="w-8 h-8 text-neutral-600" />;
      case 'movies': return <Film className="w-8 h-8 text-neutral-600" />;
      case 'series': return <MonitorSpeaker className="w-8 h-8 text-neutral-600" />;
      default: return <Tv className="w-8 h-8 text-neutral-600" />;
    }
  };

  return (
    <div 
      id={`card-${item.stream_id || item.num}`}
      className="group relative bg-black rounded-lg overflow-hidden cursor-pointer transition-all duration-300 hover:scale-105 hover:z-10 hover:shadow-2xl"
    >
      {/* Image Container */}
      <div className="aspect-video bg-neutral-800 relative overflow-hidden rounded-lg">
        {isVisible && item.stream_icon && !imageError ? (
          <>
            <img
              src={item.stream_icon}
              alt={item.name}
              className={`w-full h-full object-cover transition-opacity duration-300 ${
                imageLoaded ? 'opacity-100' : 'opacity-0'
              }`}
              onError={handleImageError}
              onLoad={handleImageLoad}
              loading={priority ? 'eager' : 'lazy'}
              sizes="(max-width: 640px) 140px, (max-width: 1024px) 160px, (max-width: 1280px) 176px, 192px"
            />
            {!imageLoaded && (
              <div className="absolute inset-0 bg-neutral-800 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-neutral-600 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-neutral-800">
            {getIcon()}
          </div>
        )}
        
        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition-all duration-300 flex items-center justify-center">
          <div className="transform scale-75 group-hover:scale-100 transition-all duration-300">
            <div className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
              <Play className="w-6 h-6 text-white ml-0.5" />
            </div>
          </div>
        </div>

        {/* Type Badge */}
        <div className="absolute top-2 right-2">
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${
            type === 'live' ? 'bg-red-600/90 text-white' :
            type === 'movies' ? 'bg-blue-600/90 text-white' :
            'bg-purple-600/90 text-white'
          }`}>
            {type === 'live' ? 'LIVE' : type === 'movies' ? 'MOVIE' : 'SERIES'}
          </span>
        </div>
      </div>
      
      {/* Content Info */}
      <div className="p-3">
        <h4 className="font-medium text-white text-sm line-clamp-2 mb-1 group-hover:text-red-400 transition-colors">
          {item.name}
        </h4>
        {item.categoryName && (
          <p className="text-xs text-neutral-400 line-clamp-1">
            {item.categoryName}
          </p>
        )}
      </div>
    </div>
  );
}