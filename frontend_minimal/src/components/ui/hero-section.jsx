'use client';

import { Play, Info } from 'lucide-react';

const HeroSection = ({ featuredContent }) => {
  const getImageUrl = (name) => {
    const encodedName = encodeURIComponent(name || 'Featured Content');
    return `https://ui-avatars.com/api/?name=${encodedName}&size=800&background=1f2937&color=ffffff&format=png`;
  };

  const content = featuredContent || {
    name: 'Young Sheldon',
    plot: 'Brilliant yet awkward 9-year-old Sheldon Cooper lands in high school where his smarts leave everyone stumped in this "The Big Bang Theory" spin-off.',
    rating: 'TV-PG',
    genre: 'Comedy'
  };

  return (
    <div className="relative h-screen flex items-center">
      {/* Background image */}
      <div className="absolute inset-0">
        <img
          src={content.stream_icon || getImageUrl(content.name)}
          alt={content.name}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.target.src = getImageUrl(content.name);
          }}
        />
        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
      </div>

      {/* Content */}
      <div className="relative z-10 px-4 md:px-16 max-w-2xl">
        {/* Title */}
        <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
          {content.name}
        </h1>

        {/* Description */}
        {content.plot && (
          <p className="text-lg md:text-xl text-white mb-6 leading-relaxed">
            {content.plot}
          </p>
        )}

        {/* Metadata */}
        <div className="flex items-center space-x-4 mb-8">
          {content.rating && (
            <span className="bg-gray-700 text-white px-2 py-1 rounded text-sm">
              {content.rating}
            </span>
          )}
          {content.genre && (
            <span className="text-white text-sm">{content.genre}</span>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center space-x-4">
          <button className="bg-white text-black px-8 py-3 rounded font-semibold text-lg hover:bg-gray-200 transition-colors flex items-center space-x-2">
            <Play className="h-6 w-6 fill-current" />
            <span>Play</span>
          </button>
          <button className="bg-gray-600/70 text-white px-8 py-3 rounded font-semibold text-lg hover:bg-gray-600/90 transition-colors flex items-center space-x-2">
            <Info className="h-6 w-6" />
            <span>More Info</span>
          </button>
        </div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black to-transparent" />
    </div>
  );
};

export default HeroSection;
