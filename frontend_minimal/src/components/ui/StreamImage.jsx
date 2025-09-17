'use client';

import { useState } from 'react';
import { Image, Radio } from 'lucide-react';

const StreamImage = ({ src, alt, className, isLarge = false }) => {
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  const imageUrl = src;

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
        <div className='h-full flex flex-col items-center justify-center text-gray-300 gap-3 bg-gray-500/30 animate-pulse'>
          <Image className='w-12 h-12 text-gray-400' />
          <div className="flex items-center justify-center gap-1">
            <Radio className="w-6 h-6" />
            <h1 className="text-md font-semibold">Vidoo Player</h1>
          </div>
        </div>
      )}

      {/* Actual image or fallback */}
      <img
        src={imgError ? imageUrl : imageUrl}
        alt={alt}
        className={`w-full h-full object-cover transition-transform duration-300 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
        onError={handleError}
        onLoad={handleLoad}
      />

      {/* Error overlay with gradient fallback */}
      {imgError && (
        <div className={`absolute inset-0 bg-gradient-to-br ${isLarge
          ? 'from-lime-900/80 to-lime-900/80'
          : 'from-lime-900/80 to-lime-900/80'
          } flex items-center justify-center`}>
          <div className="text-center text-lime-400 p-4">
            {/* <div className={`${isLarge ? 'w-16 h-16' : 'w-12 h-12'} mx-auto mb-2 bg-white/20 rounded-full flex items-center justify-center`}>
              <Radio className="w-6 h-6" />
            </div> */}
            <p className="text-xs font-medium truncate">{alt}</p>
          </div>
        </div>
      )}
    </>
  );
};

export default StreamImage;