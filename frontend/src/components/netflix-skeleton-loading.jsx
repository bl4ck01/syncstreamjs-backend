'use client';

import React from 'react';

export default function NetflixContentCardSkeleton() {
  return (
    <div className="flex-shrink-0 relative group cursor-pointer">
      {/* Card with proper Netflix aspect ratio */}
      <div className="relative">
        {/* Thumbnail skeleton - Netflix style */}
        <div className="w-[160px] sm:w-[200px] md:w-[240px] aspect-[2/3] bg-gradient-to-br from-gray-800 via-gray-700 to-gray-800 rounded-sm overflow-hidden">
          {/* Shimmer effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer"></div>
          
          {/* Title overlay skeleton */}
          <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
            <div className="h-3 bg-gray-600 rounded animate-pulse mb-1 w-3/4"></div>
            <div className="h-2 bg-gray-700 rounded animate-pulse w-1/2"></div>
          </div>
          
          {/* Category badge skeleton */}
          <div className="absolute top-2 right-2">
            <div className="h-5 w-12 bg-gray-700 rounded-full animate-pulse"></div>
          </div>
        </div>
        
        {/* Hover overlay skeleton */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition-all duration-300 rounded-sm">
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center">
              <div className="w-0 h-0 border-l-4 border-r-4 border-t-6 border-transparent border-t-white ml-0.5"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function NetflixRowSkeleton() {
  return (
    <div className="space-y-4 mb-8">
      {/* Row header skeleton */}
      <div className="flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className="h-6 w-32 bg-gray-800 rounded animate-pulse"></div>
          <div className="h-4 w-16 bg-gray-700 rounded animate-pulse"></div>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-8 w-20 bg-gray-800 rounded animate-pulse"></div>
        </div>
      </div>
      
      {/* Horizontal scrolling skeleton */}
      <div className="relative">
        <div className="flex gap-3 overflow-x-auto scrollbar-hide px-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <NetflixContentCardSkeleton key={index} />
          ))}
        </div>
        
        {/* Loading indicator skeleton */}
        <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-gray-900 to-transparent flex items-center justify-center">
          <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    </div>
  );
}

export function NetflixHeroSkeleton() {
  return (
    <div className="relative h-[70vh] min-h-[500px] bg-gradient-to-b from-gray-900 to-black">
      {/* Background skeleton */}
      <div className="absolute inset-0 bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800">
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
      </div>
      
      {/* Content overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12">
        <div className="max-w-2xl">
          {/* Title skeleton */}
          <div className="h-12 bg-gray-700 rounded animate-pulse mb-4 w-3/4"></div>
          
          {/* Meta info skeleton */}
          <div className="flex items-center gap-4 mb-4">
            <div className="h-4 w-16 bg-gray-600 rounded animate-pulse"></div>
            <div className="h-4 w-20 bg-gray-600 rounded animate-pulse"></div>
            <div className="h-4 w-24 bg-gray-600 rounded animate-pulse"></div>
          </div>
          
          {/* Description skeleton */}
          <div className="space-y-2 mb-6">
            <div className="h-4 bg-gray-600 rounded animate-pulse"></div>
            <div className="h-4 bg-gray-600 rounded animate-pulse w-5/6"></div>
            <div className="h-4 bg-gray-600 rounded animate-pulse w-4/6"></div>
          </div>
          
          {/* Action buttons skeleton */}
          <div className="flex items-center gap-4">
            <div className="h-12 w-32 bg-gray-700 rounded animate-pulse"></div>
            <div className="h-12 w-32 bg-gray-800 rounded animate-pulse"></div>
            <div className="h-12 w-12 bg-gray-800 rounded-full animate-pulse"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function NetflixHomePageSkeleton() {
  return (
    <div className="min-h-screen bg-black">
      {/* Hero section skeleton */}
      <NetflixHeroSkeleton />
      
      {/* Content rows skeleton */}
      <div className="relative -mt-32 z-10">
        {Array.from({ length: 6 }).map((_, index) => (
          <NetflixRowSkeleton key={index} />
        ))}
      </div>
      
      {/* Loading overlay */}
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg font-medium">Loading your content...</p>
          <p className="text-gray-400 text-sm">This may take a moment with large libraries</p>
        </div>
      </div>
    </div>
  );
}