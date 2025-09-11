/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'logo.ottcst.info',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'logo.ottcst.info',
        port: '',
        pathname: '/**',
      },
      // Common IPTV logo domains
      {
        protocol: 'http',
        hostname: '*.ottcst.info',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.ottcst.info',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: '*.logo.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.logo.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: '*.logo.net',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.logo.net',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: '*.logo.org',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.logo.org',
        port: '',
        pathname: '/**',
      },
      // TMDB (The Movie Database) images
      {
        protocol: 'https',
        hostname: 'image.tmdb.org',
        port: '',
        pathname: '/**',
      },
      // UI Avatars for fallback images
      {
        protocol: 'https',
        hostname: 'ui-avatars.com',
        port: '',
        pathname: '/**',
      },
    ],
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
  },
};

export default nextConfig;
