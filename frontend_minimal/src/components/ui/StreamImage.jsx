'use client';

import { useState } from 'react';
import { Image, Radio } from 'lucide-react';
import { NoImageIcon } from '../icons';

const StreamImage = ({ src, alt, className, streamType }) => {
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  const imageUrl = src;

  const handleError = () => {
    setImgError(true);
  };

  const handleLoad = () => {
    setImgLoaded(true);
  };

  if (!imageUrl || imgError) {
    return (
      <div className='h-full flex flex-col items-center justify-center gap-4 text-gray-400 bg-gray-500/30 p-1.5'>
        <NoImageIcon className="w-12 h-12" />
        {/* <p className="text-lg font-semibold">No image</p> */}
        <p className='text-sm text-center font-semibold'>{alt}</p>
      </div>
    )
  }

  return (
    <>

      {/* Loading skeleton */}
      {!imgLoaded && !imgError && (
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
        src={imageUrl}
        alt={alt}
        className={`w-full h-full object-cover transition-transform duration-300 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
        onError={handleError}
        onLoad={handleLoad}
      />
      
    </>
  );
};

export default StreamImage;