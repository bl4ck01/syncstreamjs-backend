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
      {/* Netflix Header skeleton */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-black border-b border-gray-800">
        <div className="flex items-center justify-between h-16 px-4 sm:px-8">
          <div className="flex items-center gap-8">
            <div className="h-8 w-24 bg-red-600 rounded-sm animate-pulse"></div>
            <div className="hidden md:flex items-center gap-6">
              <div className="h-4 w-12 bg-gray-700 rounded-sm animate-pulse"></div>
              <div className="h-4 w-16 bg-gray-700 rounded-sm animate-pulse"></div>
              <div className="h-4 w-14 bg-gray-700 rounded-sm animate-pulse"></div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 bg-gray-700 rounded-full animate-pulse"></div>
          </div>
        </div>
      </div>
      
      {/* Hero section skeleton */}
      <div className="pt-16">
        <NetflixHeroSkeleton />
      </div>
      
      {/* Content rows skeleton */}
      <div className="relative -mt-32 z-10">
        {Array.from({ length: 6 }).map((_, index) => (
          <NetflixRowSkeleton key={index} />
        ))}
      </div>
    </div>
  );
}

// Minimal Netflix-style skeleton for pages
export function MinimalNetflixSkeleton() {
  return (
    <div className="min-h-screen bg-black">
      {/* Header skeleton - matches NetflixHeader height */}
      <div className="h-16 bg-black border-b border-gray-800">
        <div className="flex items-center justify-between h-full px-4 sm:px-6">
          <div className="flex items-center gap-8">
            <div className="h-8 w-16 bg-red-600 rounded-sm animate-pulse"></div>
            <div className="flex items-center gap-6">
              <div className="h-4 w-12 bg-gray-700 rounded-sm animate-pulse"></div>
              <div className="h-4 w-16 bg-gray-700 rounded-sm animate-pulse"></div>
              <div className="h-4 w-14 bg-gray-700 rounded-sm animate-pulse"></div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 bg-gray-700 rounded-full animate-pulse"></div>
          </div>
        </div>
      </div>
      
      {/* Featured hero section */}
      <div className="relative h-[60vh] min-h-[400px] bg-gradient-to-br from-gray-900 via-black to-gray-900">
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12">
          <div className="max-w-2xl">
            {/* Title skeleton */}
            <div className="h-8 bg-gray-700 rounded-sm animate-pulse mb-4 w-2/3"></div>
            
            {/* Meta info skeleton */}
            <div className="flex items-center gap-4 mb-4">
              <div className="h-3 bg-gray-600 rounded-sm animate-pulse w-12"></div>
              <div className="h-3 bg-gray-600 rounded-sm animate-pulse w-16"></div>
              <div className="h-3 bg-gray-600 rounded-sm animate-pulse w-20"></div>
            </div>
            
            {/* Description skeleton */}
            <div className="space-y-2 mb-6">
              <div className="h-3 bg-gray-600 rounded-sm animate-pulse"></div>
              <div className="h-3 bg-gray-600 rounded-sm animate-pulse w-4/5"></div>
            </div>
            
            {/* Action buttons skeleton */}
            <div className="flex items-center gap-4">
              <div className="h-10 w-24 bg-gray-700 rounded-sm animate-pulse"></div>
              <div className="h-10 w-20 bg-gray-700 rounded-sm animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Content rows skeleton */}
      <div className="relative -mt-32 z-10">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="mb-8">
            {/* Row header skeleton */}
            <div className="flex items-center justify-between px-4 mb-4">
              <div className="h-5 bg-gray-700 rounded-sm animate-pulse w-32"></div>
              <div className="h-3 bg-gray-600 rounded-sm animate-pulse w-16"></div>
            </div>
            
            {/* Cards skeleton */}
            <div className="flex gap-3 overflow-x-auto scrollbar-hide px-4">
              {Array.from({ length: 6 }).map((_, cardIndex) => (
                <div key={cardIndex} className="flex-shrink-0">
                  <div className="w-[160px] sm:w-[200px] aspect-[2/3] bg-gradient-to-br from-gray-800 via-gray-700 to-gray-800 rounded-sm overflow-hidden relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer"></div>
                    <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
                      <div className="h-3 bg-gray-600 rounded-sm animate-pulse mb-1 w-3/4"></div>
                      <div className="h-2 bg-gray-700 rounded-sm animate-pulse w-1/2"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}