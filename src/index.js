import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import plugins
import { formatPlugin } from './plugins/format.js';
import { authPlugin } from './plugins/auth.js';
import { databasePlugin } from './plugins/database.js';

// Import routes
import { healthRoutes } from './routes/health.js';
import { authRoutes } from './routes/auth.js';
import { profileRoutes } from './routes/profiles.js';
import { playlistRoutes } from './routes/playlists.js';
import { favoritesRoutes } from './routes/favorites.js';
import { progressRoutes } from './routes/progress.js';

const app = new Elysia()
  // Global plugins
  .use(cors({
    origin: true,
    credentials: true
  }))
  .use(formatPlugin)
  .use(authPlugin)
  .use(databasePlugin)
  
  // Routes
  .use(healthRoutes)
  .use(authRoutes)
  .use(profileRoutes)
  .use(playlistRoutes)
  .use(favoritesRoutes)
  .use(progressRoutes)
  
  // Root endpoint
  .get('/', () => ({
    name: 'SyncStream TV API',
    version: '1.0.0',
    description: 'Cloud-based IPTV management hub'
  }))
  
  // Start server
  .listen(process.env.PORT || 3000);

console.log(
  `🦊 SyncStream TV API is running at ${app.server?.hostname}:${app.server?.port}`
);