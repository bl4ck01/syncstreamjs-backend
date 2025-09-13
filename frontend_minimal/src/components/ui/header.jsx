'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search, Bell, User } from 'lucide-react';

const Header = () => {
  const pathname = usePathname();

  const navItems = [
    { name: 'Home', href: '/' },
    { name: 'TV Shows', href: '/iptv?type=series' },
    { name: 'Movies', href: '/iptv?type=vod' },
    { name: 'New & Popular', href: '/iptv?type=live' },
    { name: 'My List', href: '/my-list' },
    { name: 'Browse by Languages', href: '/languages' },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-sm transition-all duration-300">
      <div className="flex items-center justify-between px-4 md:px-16 py-4">
        {/* Logo */}
        <div className="flex items-center space-x-4 md:space-x-8">
          <Link href="/" className="text-red-600 text-xl md:text-2xl font-bold">
            NETFLIX
          </Link>
          
          {/* Navigation - Hidden on mobile */}
          <nav className="hidden lg:flex items-center space-x-6">
            {navItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`text-sm font-medium transition-colors hover:text-gray-300 ${
                  pathname === item.href
                    ? 'text-white'
                    : 'text-gray-400'
                }`}
              >
                {item.name}
              </Link>
            ))}
          </nav>
        </div>

        {/* Right side */}
        <div className="flex items-center space-x-2 md:space-x-4">
          <button className="p-2 hover:bg-gray-800 rounded-full transition-colors">
            <Search className="h-4 w-4 md:h-5 md:w-5 text-white" />
          </button>
          <button className="hidden md:block p-2 hover:bg-gray-800 rounded-full transition-colors">
            <Bell className="h-5 w-5 text-white" />
          </button>
          <button className="p-2 hover:bg-gray-800 rounded-full transition-colors">
            <User className="h-4 w-4 md:h-5 md:w-5 text-white" />
          </button>
        </div>
      </div>
      
      {/* Mobile Navigation - Shown on smaller screens */}
      <div className="lg:hidden bg-black/90 border-t border-gray-800">
        <nav className="flex overflow-x-auto px-4 py-2 space-x-6 scrollbar-hide">
          {navItems.slice(0, 4).map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={`text-sm font-medium whitespace-nowrap py-2 transition-colors hover:text-gray-300 ${
                pathname === item.href
                  ? 'text-white border-b-2 border-red-600'
                  : 'text-gray-400'
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
