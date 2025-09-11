'use client';

import { useCallback, useEffect, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Image from 'next/image';

export default function HorizontalCarousel({ 
  category, 
  streams, 
  onStreamClick,
  loading = false 
}) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: 'start',
    skipSnaps: false,
    dragFree: true,
    containScroll: 'trimSnaps',
  });

  const [prevBtnEnabled, setPrevBtnEnabled] = useState(false);
  const [nextBtnEnabled, setNextBtnEnabled] = useState(false);

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setPrevBtnEnabled(emblaApi.canScrollPrev());
    setNextBtnEnabled(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);
  }, [emblaApi, onSelect]);

  if (loading) {
    return (
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-white mb-4 px-4">
          <div className="h-6 bg-gray-700 rounded w-48 animate-pulse"></div>
        </h2>
        <div className="flex space-x-4 overflow-hidden">
          {[...Array(6)].map((_, index) => (
            <div key={index} className="flex-shrink-0 w-48">
              <div className="aspect-video bg-gray-700 rounded-lg animate-pulse"></div>
              <div className="mt-2 h-4 bg-gray-700 rounded animate-pulse"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mb-8 relative group">
      <h2 className="text-xl font-semibold text-white mb-4 px-4">
        {category.category_name || category.name} ({streams.length})
      </h2>
      
      <div className="relative">
        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex">
            {streams.map((stream, index) => (
              <div
                key={`${category.category_id || category.id}_${stream.id || stream.stream_id || stream.name}_${index}`}
                className="flex-shrink-0 w-48 px-2 cursor-pointer transform transition-transform hover:scale-105"
                onClick={() => onStreamClick(stream)}
              >
                <div className="relative aspect-video bg-gray-800 rounded-lg overflow-hidden">
                  <Image
                    src={stream.logo || `https://ui-avatars.com/api/?name=${encodeURIComponent(stream.name)}&background=1f2937&color=fff&size=200x200`}
                    alt={stream.name}
                    fill
                    className="object-cover"
                    sizes="192px"
                    placeholder="blur"
                    blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTkyIiBoZWlnaHQ9IjEwOCIgdmlld0JveD0iMCAwIDE5MiAxMDgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxOTIiIGhlaWdodD0iMTA4IiBmaWxsPSIjMUYyOTM3Ii8+Cjwvc3ZnPg=="
                    loading="lazy"
                    quality={75}
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-20 transition-all duration-200"></div>
                </div>
                <h3 className="mt-2 text-sm text-white font-medium line-clamp-2">
                  {stream.name}
                </h3>
              </div>
            ))}
          </div>
        </div>

        {/* Navigation Buttons */}
        {prevBtnEnabled && (
          <button
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-black bg-opacity-70 hover:bg-opacity-90 text-white p-2 rounded-r-lg transition-all duration-200 opacity-0 group-hover:opacity-100"
            onClick={scrollPrev}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}

        {nextBtnEnabled && (
          <button
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-black bg-opacity-70 hover:bg-opacity-90 text-white p-2 rounded-l-lg transition-all duration-200 opacity-0 group-hover:opacity-100"
            onClick={scrollNext}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
}