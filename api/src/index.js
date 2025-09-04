import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';

// Import environment configuration
import env, { isDevelopment } from './utils/env.js';

// Import plugins
import { formatPlugin } from './plugins/format.js';
import { authPlugin } from './plugins/auth.js';
import { databasePlugin } from './plugins/database.js';
import { errorHandlerPlugin } from './plugins/errorHandler.js';

// Import middleware
import { rateLimiterPlugin } from './middleware/rateLimiter.js';
import { optimizationPlugin } from './middleware/optimization.js';
import { i18nPlugin, getAvailableLanguages } from './i18n/index.js';

// Import routes
import { healthRoutes } from './routes/health.js';
import { authRoutes } from './routes/auth.js';
import { profileRoutes } from './routes/profiles.js';
import { playlistRoutes } from './routes/playlists.js';
import { favoritesRoutes } from './routes/favorites.js';
import { progressRoutes } from './routes/progress.js';
import { subscriptionRoutes } from './routes/subscriptions.js';
import { webhookRoutes } from './routes/webhooks.js';
import { adminRoutes } from './routes/admin.js';
import { resellerRoutes } from './routes/resellers.js';
import { analyticsRoutes } from './routes/analytics.js';
import { parseValidationError } from './utils/errors.js';

// Create and configure the app
const app = new Elysia()
  // Error handling (must be first)
  .use(errorHandlerPlugin)

  // Global middleware
  .use(cors({
    origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'X-API-Version', 'Idempotency-Key', 'Accept-Language'],
    exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset', 'X-Request-ID', 'Content-Language']
  }))

  // Core plugins
  .use(formatPlugin)
  .use(authPlugin)
  .use(databasePlugin)

  // Enhancement middleware
  .use(rateLimiterPlugin)
  .use(optimizationPlugin)
  .use(i18nPlugin)

  // API versioning group
  .group(`/api/${env.API_VERSION}`, app => app
    // Routes
    .use(healthRoutes)
    .use(authRoutes)
    .use(profileRoutes)
    .use(playlistRoutes)
    .use(favoritesRoutes)
    .use(progressRoutes)
    .use(subscriptionRoutes)
    .use(webhookRoutes)
    .use(adminRoutes)
    .use(resellerRoutes)
    .use(analyticsRoutes)

    // Language endpoint
    .get('/languages', () => getAvailableLanguages())
  )

  // Root endpoint (outside API versioning)
  .get('/', ({ device, language }) => ({
    name: 'SyncStream TV API',
    version: env.API_VERSION,
    description: 'Cloud-based IPTV management hub',
    environment: env.NODE_ENV,
    language,
    device: device?.isMobile ? 'mobile' : 'desktop',
    endpoints: {
      api: `/api/${env.API_VERSION}`,
      health: `/api/${env.API_VERSION}/health`,
      documentation: '/docs'
    }
  }))

  // Test page for subscription flow (development only)
  .get('/test-subscription', () => {
    return Bun.file('public/test-subscription.html');
  })

  // Global error handler to ensure all errors follow standard format
  .onError(({ code, error, set }) => {
    // Let the errorHandlerPlugin handle most errors
    // This is just a fallback to ensure standard format
    if (code === 'VALIDATION') {
      set.status = 400;
      return {
        success: false,
        message: parseValidationError(error),
        data: null
      };
    }

    if (code === 'PARSE') {
      set.status = 400;
      return {
        success: false,
        message: 'Invalid request format - malformed JSON',
        data: null
      };
    }

    if (code === 'NOT_FOUND') {
      set.status = 404;
      return {
        success: false,
        message: 'Endpoint not found',
        data: null
      };
    }

    // For any other errors, return standard format
    set.status = error.statusCode || 500;
    return {
      success: false,
      message: error.message || 'An unexpected error occurred',
      data: null
    };
  })

  // Start server
  .listen({
    port: env.PORT,
    hostname: '0.0.0.0',
    development: isDevelopment()
  });


// Startup messages
console.log('🚀 SyncStream TV Backend Starting...');
console.log(`📍 Environment: ${env.NODE_ENV}`);
console.log(`🌐 API Version: ${env.API_VERSION}`);
console.log(`🗣️  Languages: ${env.SUPPORTED_LANGUAGES}`);
console.log(`🔒 Rate Limiting: ${env.RATE_LIMIT_MAX_REQUESTS} requests per ${env.RATE_LIMIT_WINDOW_MS / 60000} minutes`);
console.log(`💾 Database: ${env.DATABASE_URL.split('@')[1]?.split('/')[0] || 'configured'}`);
console.log(`💳 Stripe: ${env.STRIPE_SECRET_KEY.startsWith('sk_test') ? 'Test Mode' : 'Live Mode'}`);
console.log(`✅ Server running at http://${app.server?.hostname}:${app.server?.port}`);

// Graceful shutdown
let isShuttingDown = false;

const gracefulShutdown = async (signal) => {
  if (isShuttingDown) {
    console.log(`\n📛 ${signal} received, but shutdown already in progress...`);
    return;
  }

  isShuttingDown = true;
  console.log(`\n📛 ${signal} received, starting graceful shutdown...`);

  try {
    // Close database connections
    const { closePool } = await import('./db/connection.js');
    await closePool();

    // Close server
    app.stop();

    console.log('✅ Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
