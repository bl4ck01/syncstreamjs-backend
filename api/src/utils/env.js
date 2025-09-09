import { z } from 'zod';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Environment variable schema
const envSchema = z.object({
    // Database
    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
    DATABASE_MAX_CONNECTIONS: z.string().transform(Number).default('20'),
    DATABASE_IDLE_TIMEOUT: z.string().transform(Number).default('30000'),
    DATABASE_CONNECTION_TIMEOUT: z.string().transform(Number).default('5000'),

    // JWT
    JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
    JWT_EXPIRY: z.string().default('7d'),

    // Stripe
    STRIPE_SECRET_KEY: z.string().startsWith('sk_', 'Invalid Stripe secret key format'),
    STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_', 'Invalid Stripe webhook secret format'),
    STRIPE_SUCCESS_URL: z.string().url().optional(),
    STRIPE_CANCEL_URL: z.string().url().optional(),
    STRIPE_API_VERSION: z.string().default('2023-10-16'),

    // Server
    PORT: z.string().transform(Number).default('3000'),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    API_VERSION: z.string().default('v1'),
    CORS_ORIGIN: z.string().default('*'),

    // Frontend
    FRONTEND_URL: z.string().url().or(z.string().startsWith('http')),

    // Rate Limiting
    RATE_LIMIT_WINDOW_MS: z.string().transform(Number).default('900000'),
    RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).default('100'),
    RATE_LIMIT_MAX_REQUESTS_PREMIUM: z.string().transform(Number).default('500'),

    // Redis (optional)
    REDIS_URL: z.string().optional(),
    REDIS_TTL: z.string().transform(Number).default('86400'),

    // Email
    EMAIL_SERVICE: z.enum(['sendgrid', 'ses', 'smtp', 'console']).default('console'),
    EMAIL_API_KEY: z.string().optional(),
    EMAIL_FROM: z.string().email().default('noreply@syncstream.tv'),

    // Monitoring
    SENTRY_DSN: z.string().optional(),
    LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),

    // Analytics
    ANALYTICS_ENABLED: z.string().transform(val => val === 'true').default('false'),
    ANALYTICS_BATCH_SIZE: z.string().transform(Number).default('100'),

    // Localization
    DEFAULT_LANGUAGE: z.string().default('en'),
    SUPPORTED_LANGUAGES: z.string().default('en'),

    // Security
    BCRYPT_ROUNDS: z.string().transform(Number).default('12'),
    SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters'),
    TRUSTED_PROXIES: z.string().transform(Number).default('1'),

    // Feature Flags
    FEATURE_WATCH_PARTY: z.string().transform(val => val === 'true').default('false'),
    FEATURE_RECOMMENDATIONS: z.string().transform(val => val === 'true').default('false'),
    FEATURE_ADVANCED_ANALYTICS: z.string().transform(val => val === 'true').default('true'),

    // Performance
    COMPRESSION_ENABLED: z.string().transform(val => val === 'true').default('true'),
    RESPONSE_CACHE_TTL: z.string().transform(Number).default('300'),
    QUERY_TIMEOUT: z.string().transform(Number).default('30000'),

    // Credit System
    DEFAULT_CREDIT_COST_MULTIPLIER: z.string().transform(Number).default('100'),
    RESELLER_COMMISSION_PERCENTAGE: z.string().transform(Number).default('20'),

    // Support configuration
    SUPPORT_EMAIL: z.string().email().optional(),

    // Profile limits
    MAX_PROFILES: z.string().transform(Number).default('5'),

    // Playlist limits
    MAX_PLAYLISTS: z.string().transform(Number).default('3'),
});

// Validate and parse environment variables
let env;
try {
    env = envSchema.parse(process.env);
} catch (error) {
    console.error('❌ Invalid environment variables:');
    console.error(error.errors);

    // In production, exit the process
    if (process.env.NODE_ENV === 'production') {
        process.exit(1);
    }

    // In development, use defaults where possible
    console.warn('⚠️  Using default values for missing environment variables');
    env = envSchema.safeParse(process.env).data || {};
}

// Helper functions
export const isDevelopment = () => env.NODE_ENV === 'development';
export const isProduction = () => env.NODE_ENV === 'production';

// Feature flags
export const isFeatureEnabled = (feature) => {
    switch (feature) {
        case 'watch_party':
            return env.FEATURE_WATCH_PARTY;
        case 'recommendations':
            return env.FEATURE_RECOMMENDATIONS;
        case 'advanced_analytics':
            return env.FEATURE_ADVANCED_ANALYTICS;
        default:
            return false;
    }
};

// Get supported languages as array
export const getSupportedLanguages = () => {
    const raw = (env && env.SUPPORTED_LANGUAGES)
        ? env.SUPPORTED_LANGUAGES
        : (process.env.SUPPORTED_LANGUAGES || 'en');
    return String(raw)
        .split(',')
        .map(lang => lang.trim())
        .filter(Boolean);
};

// Export validated environment variables
export default env;
