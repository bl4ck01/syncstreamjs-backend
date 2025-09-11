'use client';

import React, { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Search, Bell, ChevronDown, User, Settings, HelpCircle, LogOut, Home, Tv, Film, MonitorSpeaker } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import Link from 'next/link';

export default function NetflixHeader({ profile, onSearch }) {
  const router = useRouter();
  const pathname = usePathname();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const handleSearch = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (onSearch) {
      onSearch(query);
    }
  };

  const navigateTo = (path) => {
    router.push(path);
  };

  const isActive = (path) => {
    return pathname === path;
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-black/90 via-black/60 to-transparent">
      <div className="flex items-center justify-between px-4 sm:px-8 py-4">
        {/* Logo */}
        <div className="flex items-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-red-600 cursor-pointer" onClick={() => navigateTo('/')}>
            SYNCSTREAM
          </h1>
        </div>

        {/* Navigation */}
        <nav className="hidden md:flex items-center space-x-6">
          <Link
            href="/"
            className={`flex items-center gap-2 transition-colors font-medium ${isActive('/')
                ? 'text-white'
                : 'text-gray-400 hover:text-white'
              }`}
          >
            <Home className="w-4 h-4" />
            Home
          </Link>
          <Link
            href="/live"
            className={`flex items-center gap-2 transition-colors font-medium ${isActive('/live')
                ? 'text-white'
                : 'text-gray-400 hover:text-white'
              }`}
          >
            <Tv className="w-4 h-4" />
            Live TV
          </Link>
          <Link
            href="/movies"
            className={`flex items-center gap-2 transition-colors font-medium ${isActive('/movies')
                ? 'text-white'
                : 'text-gray-400 hover:text-white'
              }`}
          >
            <Film className="w-4 h-4" />
            Movies
          </Link>
          <Link
            href="/series"
            className={`flex items-center gap-2 transition-colors font-medium ${isActive('/series')
                ? 'text-white'
                : 'text-gray-400 hover:text-white'
              }`}
          >
            <MonitorSpeaker className="w-4 h-4" />
            Series
          </Link>
        </nav>

        {/* Mobile Navigation */}
        <nav className="md:hidden flex items-center space-x-4">
          <Link
            href="/live"
            className={`p-2 rounded transition-colors ${isActive('/live')
                ? 'bg-red-600 text-white'
                : 'text-gray-400 hover:text-white'
              }`}
          >
            <Tv className="w-5 h-5" />
          </Link>
          <Link
            href="/movies"
            className={`p-2 rounded transition-colors ${isActive('/movies')
                ? 'bg-red-600 text-white'
                : 'text-gray-400 hover:text-white'
              }`}
          >
            <Film className="w-5 h-5" />
          </Link>
          <Link
            href="/series"
            className={`p-2 rounded transition-colors ${isActive('/series')
                ? 'bg-red-600 text-white'
                : 'text-gray-400 hover:text-white'
              }`}
          >
            <MonitorSpeaker className="w-5 h-5" />
          </Link>
        </nav>

        {/* Search and User Actions */}
        <div className="flex items-center space-x-4">
          {/* Search Bar */}
          <div className={`relative transition-all duration-300 ${isSearchFocused ? 'w-64' : 'w-48'}`}>
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={handleSearch}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
              className="w-full pl-10 pr-4 py-2 bg-black/50 border border-gray-700 rounded text-white placeholder-gray-400 focus:outline-none focus:border-white transition-all"
            />
          </div>

          {/* Notifications */}
          <Link href="#" className="relative p-2 text-gray-400 hover:text-white transition-colors">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-600 rounded-full"></span>
          </Link>

          {/* User Profile */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={profile?.avatar} alt={profile?.name} />
                  <AvatarFallback className="bg-red-600 text-white">
                    {profile?.name?.charAt(0) || <User className="w-4 h-4" />}
                  </AvatarFallback>
                </Avatar>
                <ChevronDown className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-black/95 border-gray-800 text-white">
              <div className="px-2 py-3 border-b border-gray-800">
                <p className="font-medium">{profile?.name || 'Guest User'}</p>
                <p className="text-sm text-gray-400">{profile?.email || 'guest@example.com'}</p>
              </div>
              <DropdownMenuItem className="hover:bg-gray-800 cursor-pointer">
                <User className="w-4 h-4 mr-2" />
                Manage Profiles
              </DropdownMenuItem>
              <DropdownMenuItem className="hover:bg-gray-800 cursor-pointer">
                <Settings className="w-4 h-4 mr-2" />
                Account Settings
              </DropdownMenuItem>
              <DropdownMenuItem className="hover:bg-gray-800 cursor-pointer">
                <HelpCircle className="w-4 h-4 mr-2" />
                Help Center
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-gray-800" />
              <DropdownMenuItem className="hover:bg-gray-800 cursor-pointer text-red-500">
                <LogOut className="w-4 h-4 mr-2" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}