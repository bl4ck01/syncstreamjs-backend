'use client';

import { useState } from 'react';
import { Play, Plus, ThumbsUp, ChevronDown } from 'lucide-react';
import StreamImage from './StreamImage.jsx';

const ContentCard = ({ stream, isLarge = false, isRowHovered = false }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={`relative group cursor-pointer transition-all duration-300 flex-shrink-0 ${
        isLarge ? 'w-[300px]' : 'w-[200px]'
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Main Image */}
      <div className={`relative overflow-hidden rounded-md ${
        isLarge ? 'aspect-video' : 'aspect-[2/3]'
      }`}>
        <div className={`w-full h-full transition-transform duration-300 ${
          isHovered ? 'scale-110' : 'scale-100'
        }`}>
          <StreamImage
            src={stream.cover || stream.stream_icon}
            alt={stream.name}
            isLarge={isLarge}
          />
        </div>
        
        {/* Rating badge for series */}
        {stream.rating && (
          <div className="absolute top-2 right-2 bg-yellow-500 text-black text-xs font-bold px-2 py-1 rounded z-10">
            ⭐ {stream.rating}
          </div>
        )}
        
        {/* Gradient overlay */}
        <div className={`absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent transition-opacity duration-300 z-5 ${
          isHovered ? 'opacity-100' : 'opacity-0'
        }`} />
        
        {/* Play button overlay */}
        <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 z-10 ${
          isHovered ? 'opacity-100' : 'opacity-0'
        }`}>
          <button className="bg-white/20 backdrop-blur-sm rounded-full p-3 hover:bg-white/30 transition-colors">
            <Play className="h-6 w-6 text-white fill-white" />
          </button>
        </div>
      </div>

      {/* Simple hover overlay with title */}
      <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 transition-opacity duration-300 ${
        isRowHovered || isHovered ? 'opacity-100' : 'opacity-0'
      }`}>
        <h3 className="text-white font-semibold text-sm line-clamp-2 mb-1">{stream.name}</h3>
        {stream.genre && (
          <p className="text-gray-300 text-xs line-clamp-1">{stream.genre}</p>
        )}
      </div>
    </div>
  );
};

export default ContentCard;
