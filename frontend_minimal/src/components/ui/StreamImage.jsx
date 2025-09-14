'use client';

import { useState } from 'react';

const StreamImage = ({ src, alt, className, isLarge = false }) => {
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  // Generate a high-quality placeholder based on stream name
  const generatePlaceholder = (name) => {
    // Use a consistent seed for the same name
    const seed = name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

    // Use picsum with consistent seed for same content
    return `https://picsum.photos/seed/${seed}/${isLarge ? '400' : '300'}/${isLarge ? '225' : '450'}.jpg`;
  };

  const imageUrl = src || generatePlaceholder(alt);

  const handleError = () => {
    setImgError(true);
  };

  const handleLoad = () => {
    setImgLoaded(true);
  };

  return (
    <>
      {/* Loading skeleton */}
      {!imgLoaded && (
        <div className={`h-full flex items-center justify-center text-white absolute inset-0 bg-gray-700/30 animate-pulse`}
        >
          <div className="w-7 h-7 bg-red-600 rounded text-2xl flex items-center justify-end font-bold pr-0.5">S</div>
          <h1 className="text-2xl text-red-600 font-bold">yncPlayer</h1>
        </div>
      )}

      {/* Actual image or fallback */}
      <img
        src={imgError ? generatePlaceholder(alt) : imageUrl}
        alt={alt}
        className={`w-full h-full object-cover transition-transform duration-300 ${imgLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        onError={handleError}
        onLoad={handleLoad}
      />

      {/* Error overlay with gradient fallback */}
      {imgError && (
        <div className={`absolute inset-0 bg-gradient-to-br ${isLarge
          ? 'from-blue-900/80 to-purple-900/80'
          : 'from-red-900/80 to-orange-900/80'
          } flex items-center justify-center`}>
          <div className="text-center text-white p-4">
            <div className={`${isLarge ? 'w-16 h-16' : 'w-12 h-12'
              } mx-auto mb-2 bg-white/20 rounded-full flex items-center justify-center`}>
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
            <p className="text-xs font-medium truncate">{alt}</p>
          </div>
        </div>
      )}
    </>
  );
};

export default StreamImage;