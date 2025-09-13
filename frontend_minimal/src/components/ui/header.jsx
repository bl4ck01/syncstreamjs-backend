'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search, Bell, User } from 'lucide-react';

const Header = () => {
  const pathname = usePathname();

  const navItems = [
    { name: 'Home', href: '/' },
    { name: 'TV Shows', href: '/series' },
    { name: 'Movies', href: '/movies' },
    { name: 'Live TV', href: '/live' },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-black via-black/90 to-transparent transition-all duration-300">
      <div className="flex items-center justify-between px-4 md:px-16 py-6">
        {/* Logo */}
        <div className="flex items-center md:space-x-12">
          <Link href="/" className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-700 rounded-lg shadow-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-red-500 to-red-600 bg-clip-text text-transparent">
                STREAMFLIX
              </h1>
              <p className="text-xs text-gray-400 -mt-1">Watch Anywhere</p>
            </div>
          </Link>

          {/* Navigation - Hidden on mobile */}
          <nav className="hidden lg:flex items-center space-x-8">
            {navItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`text-sm font-semibold transition-all duration-200 hover:text-white ${pathname === item.href
                    ? 'text-white scale-105'
                    : 'text-gray-300'
                  }`}
              >
                {item.name}
              </Link>
            ))}
          </nav>
        </div>

        {/* Right side */}
        <div className="flex items-center space-x-2 md:space-x-4">
          <button className="p-3 hover:bg-white/10 rounded-full transition-all duration-200 hover:scale-110">
            <Search className="h-4 w-4 md:h-5 md:w-5 text-white" />
          </button>
          <button className="hidden md:flex p-3 hover:bg-white/10 rounded-full transition-all duration-200 hover:scale-110 items-center space-x-2">
            <Bell className="h-5 w-5 text-white" />
            <span className="text-xs bg-red-500 text-white rounded-full px-1.5 py-0.5">3</span>
          </button>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
              <User className="h-4 w-4 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Navigation - Shown on smaller screens */}
      <div className="lg:hidden bg-black/40 backdrop-blur-sm border-t border-white/10">
        <nav className="flex overflow-x-auto px-4 py-3 space-x-8 scrollbar-hide">
          {navItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={`text-sm font-semibold whitespace-nowrap py-1 transition-colors hover:text-white ${pathname === item.href
                  ? 'text-white border-b-2 border-red-500'
                  : 'text-gray-300'
                }`}
            >
              {item.name}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
};

export default Header;