'use client';

import React from 'react';

export default function ContentCardSkeleton() {
  return (
    <div className="flex-shrink-0 snap-start" style={{ width: '192px' }}>
      <div className="bg-neutral-800 rounded-lg overflow-hidden">
        {/* Thumbnail skeleton */}
        <div className="aspect-video bg-neutral-700 animate-pulse relative">
          <div className="absolute inset-0 bg-gradient-to-t from-neutral-900/50 to-transparent" />
          <div className="absolute bottom-2 left-2 right-2">
            <div className="h-4 bg-neutral-600 rounded animate-pulse mb-1" />
            <div className="h-3 bg-neutral-600 rounded animate-pulse w-3/4" />
          </div>
        </div>
        
        {/* Title skeleton */}
        <div className="p-3">
          <div className="h-4 bg-neutral-600 rounded animate-pulse mb-2" />
          <div className="h-3 bg-neutral-600 rounded animate-pulse w-2/3" />
        </div>
      </div>
    </div>
  );
}

export function CategoryRowSkeleton() {
  return (
    <div className="px-4 sm:px-6 py-4 space-y-4">
      {/* Category header skeleton */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-6 w-32 bg-neutral-700 rounded animate-pulse" />
          <div className="h-4 w-16 bg-neutral-600 rounded animate-pulse" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 bg-neutral-700 rounded-full animate-pulse" />
          <div className="h-8 w-8 bg-neutral-700 rounded-full animate-pulse" />
        </div>
      </div>
      
      {/* Content cards skeleton */}
      <div className="flex gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory">
        {Array.from({ length: 6 }).map((_, index) => (
          <ContentCardSkeleton key={index} />
        ))}
      </div>
    </div>
  );
}

export function HomePageSkeleton() {
  return (
    <div className="h-screen flex flex-col bg-neutral-950">
      {/* Header skeleton */}
      <div className="flex-shrink-0 bg-black/95 backdrop-blur-sm border-b border-neutral-800">
        <div className="flex items-center justify-between px-4 sm:px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="h-8 w-16 bg-neutral-700 rounded animate-pulse" />
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 bg-neutral-600 rounded-full animate-pulse" />
              <div className="h-4 w-24 bg-neutral-600 rounded animate-pulse" />
            </div>
          </div>
          
          <div className="flex-1 max-w-md mx-8">
            <div className="h-10 bg-neutral-800 rounded-lg animate-pulse" />
          </div>
        </div>
        
        {/* Tab navigation skeleton */}
        <div className="flex items-center px-4 sm:px-6 pb-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="flex items-center gap-2 px-4 py-2 rounded-full mr-4">
              <div className="h-4 w-4 bg-neutral-600 rounded animate-pulse" />
              <div className="h-4 w-12 bg-neutral-600 rounded animate-pulse" />
              <div className="h-5 w-8 bg-neutral-700 rounded-full animate-pulse" />
            </div>
          ))}
        </div>
      </div>
      
      {/* Content skeleton */}
      <div className="flex-1 overflow-hidden">
        {Array.from({ length: 5 }).map((_, index) => (
          <CategoryRowSkeleton key={index} />
        ))}
      </div>
    </div>
  );
}