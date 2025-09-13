'use client';

import { useState } from 'react';
import { Play, Plus, ThumbsUp, ChevronDown } from 'lucide-react';

const ContentCard = ({ stream, isLarge = false }) => {
  const [isHovered, setIsHovered] = useState(false);

  // Generate a placeholder image URL based on stream name
  const getImageUrl = (name) => {
    const encodedName = encodeURIComponent(name);
    return `https://ui-avatars.com/api/?name=${encodedName}&size=400&background=1f2937&color=ffffff&format=png`;
  };

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
        <img
          src={stream.cover || stream.stream_icon || getImageUrl(stream.name)}
          alt={stream.name}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
          onError={(e) => {
            e.target.src = getImageUrl(stream.name);
          }}
        />
        
        {/* Rating badge for series */}
        {stream.rating && (
          <div className="absolute top-2 right-2 bg-yellow-500 text-black text-xs font-bold px-2 py-1 rounded">
            ⭐ {stream.rating}
          </div>
        )}
        
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* Play button overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <button className="bg-white/20 backdrop-blur-sm rounded-full p-3 hover:bg-white/30 transition-colors">
            <Play className="h-6 w-6 text-white fill-white" />
          </button>
        </div>
      </div>

      {/* Simple hover overlay with title */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <h3 className="text-white font-semibold text-sm line-clamp-2 mb-1">{stream.name}</h3>
        {stream.genre && (
          <p className="text-gray-300 text-xs line-clamp-1">{stream.genre}</p>
        )}
      </div>
    </div>
  );
};

export default ContentCard;
