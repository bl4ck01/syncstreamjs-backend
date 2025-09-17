'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import ContentCard from './content-card.jsx';

const ContentRow = ({ title, streams, streamType, onLoadMore, hasMore = false, isLoadingMore = false }) => {
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [isRowHovered, setIsRowHovered] = useState(false);
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

  // Update scroll state when streams change or component mounts
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    // Small delay to ensure DOM is updated
    setTimeout(() => {
      setCanScrollLeft(container.scrollLeft > 0);
      setCanScrollRight(
        container.scrollLeft < container.scrollWidth - container.clientWidth
      );
    }, 100);
  }, [streams, hasMore]);

  // Initial mount effect
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    // Check if content overflows initially
    const checkOverflow = () => {
      setCanScrollRight(container.scrollWidth > container.clientWidth);
    };

    // Small delay to ensure DOM is fully rendered
    setTimeout(checkOverflow, 200);
    
    // Add resize observer to handle window resizing
    const resizeObserver = new ResizeObserver(checkOverflow);
    resizeObserver.observe(container);
    
    return () => resizeObserver.disconnect();
  }, []);

  if (!streams || streams.length === 0) {
    return null;
  }

  return (
    <div className="relative group mb-8 overflow-hidden">
      {/* Row title */}
      <h2 className="text-white text-xl md:text-2xl font-bold mb-4 px-4 md:px-16">
        {title}
      </h2>

      {/* Scroll container */}
      <div className="relative">
        {/* Left scroll area */}
        {canScrollLeft && (
          <div 
            className="absolute left-[-32px] top-0 bottom-0 w-32 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 cursor-pointer"
            onClick={() => scroll('left')}
          >
            <div className="absolute left-8 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-3 shadow-lg shadow-black/50">
              <ChevronLeft className="h-6 w-6" />
            </div>
          </div>
        )}

        {/* Right scroll area */}
        {canScrollRight && (
          <div 
            className="absolute right-[-32px] top-0 bottom-0 w-32 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 cursor-pointer"
            onClick={() => scroll('right')}
          >
            <div className="absolute right-8 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-3 shadow-lg shadow-black/50">
              <ChevronRight className="h-6 w-6" />
            </div>
          </div>
        )}

        {/* Content container */}
        <div
          ref={scrollContainerRef}
          className="flex space-x-4 overflow-x-auto scrollbar-hide px-4 md:px-16 pb-4"
          onScroll={handleScroll}
          onMouseEnter={() => setIsRowHovered(true)}
          onMouseLeave={() => setIsRowHovered(false)}
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {/* Left scroll indicator shadow */}
          {canScrollLeft && (
            <div className="absolute left-[-32px] top-0 bottom-0 w-32 bg-gradient-to-r from-black/70 via-black/40 to-transparent z-15 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          )}
          
          {/* Right scroll indicator shadow */}
          {canScrollRight && (
            <div className="absolute right-[-32px] top-0 bottom-0 w-32 bg-gradient-to-l from-black/70 via-black/40 to-transparent z-15 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          )}
          {streams.map((stream, index) => (
            <ContentCard
              key={stream.stream_id || stream.id || index}
              stream={stream}
              streamType={streamType}
              isRowHovered={isRowHovered}
            />
          ))}
          
          {/* Load More Button */}
          {hasMore && onLoadMore && (
            <div className={`flex-shrink-0 flex items-center justify-center ${
              streamType === 'live' ? 'w-[200px]' : 'w-[200px] aspect-[2/3]'
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
