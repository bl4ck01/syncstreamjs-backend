'use client';

import { useState, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import ContentCard from './content-card.jsx';

const ContentRow = ({ title, streams, isLarge = false, onLoadMore, hasMore = false, isLoadingMore = false }) => {
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const scrollContainerRef = useRef(null);

  const scroll = (direction) => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const scrollAmount = container.clientWidth * 0.8;
    const newScrollLeft = container.scrollLeft + (direction === 'left' ? -scrollAmount : scrollAmount);

    container.scrollTo({
      left: newScrollLeft,
      behavior: 'smooth'
    });
  };

  const handleScroll = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    setCanScrollLeft(container.scrollLeft > 0);
    setCanScrollRight(
      container.scrollLeft < container.scrollWidth - container.clientWidth
    );
  };

  if (!streams || streams.length === 0) {
    return null;
  }

  return (
    <div className="relative group mb-8">
      {/* Row title */}
      <h2 className="text-white text-xl md:text-2xl font-bold mb-4 px-4 md:px-16">
        {title}
      </h2>

      {/* Scroll container */}
      <div className="relative">
        {/* Left scroll button */}
        {canScrollLeft && (
          <button
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-all duration-300"
            onClick={() => scroll('left')}
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}

        {/* Right scroll button */}
        {canScrollRight && (
          <button
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-all duration-300"
            onClick={() => scroll('right')}
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        )}

        {/* Content container */}
        <div
          ref={scrollContainerRef}
          className="flex space-x-4 overflow-x-auto scrollbar-hide px-4 md:px-16 pb-4"
          onScroll={handleScroll}
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {streams.map((stream, index) => (
            <ContentCard
              key={stream.stream_id || stream.id || index}
              stream={stream}
              isLarge={isLarge}
            />
          ))}
          
          {/* Load More Button */}
          {hasMore && onLoadMore && (
            <div className={`flex-shrink-0 flex items-center justify-center ${
              isLarge ? 'w-[300px] h-[169px]' : 'w-[200px] h-[300px]'
            } bg-gray-800 rounded-md border-2 border-dashed border-gray-600 hover:border-gray-400 transition-colors`}>
              <button
                onClick={onLoadMore}
                disabled={isLoadingMore}
                className="text-white hover:text-gray-300 transition-colors text-center p-4"
              >
                {isLoadingMore ? (
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                ) : (
                  <div className="text-4xl mb-2">+</div>
                )}
                <div className="text-sm">
                  {isLoadingMore ? 'Loading...' : 'Load More'}
                </div>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContentRow;
