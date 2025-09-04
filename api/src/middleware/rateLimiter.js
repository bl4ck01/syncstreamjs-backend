import { Elysia } from 'elysia';
import env from '../utils/env.js';
import { RateLimitError } from '../utils/errors.js';

// In-memory store for development
// In production, use Redis
class RateLimitStore {
    constructor() {
        this.requests = new Map();
        this.cleanupInterval = setInterval(() => this.cleanup(), 60000); // Cleanup every minute
    }

    increment(key) {
        const now = Date.now();
        const windowStart = now - env.RATE_LIMIT_WINDOW_MS;

        if (!this.requests.has(key)) {
            this.requests.set(key, []);
        }

        const timestamps = this.requests.get(key);

        // Remove old timestamps outside the window
        const validTimestamps = timestamps.filter(ts => ts > windowStart);
        validTimestamps.push(now);

        this.requests.set(key, validTimestamps);

        return validTimestamps.length;
    }

    cleanup() {
        const now = Date.now();
        const windowStart = now - env.RATE_LIMIT_WINDOW_MS;

        for (const [key, timestamps] of this.requests.entries()) {
            const validTimestamps = timestamps.filter(ts => ts > windowStart);

            if (validTimestamps.length === 0) {
                this.requests.delete(key);
            } else {
                this.requests.set(key, validTimestamps);
            }
        }
    }

    destroy() {
        clearInterval(this.cleanupInterval);
        this.requests.clear();
    }
}

// Redis store for production
class RedisRateLimitStore {
    constructor(redisClient) {
        this.redis = redisClient;
    }

    async increment(key) {
        const multi = this.redis.multi();
        const now = Date.now();
        const windowStart = now - env.RATE_LIMIT_WINDOW_MS;

        // Remove old entries
        multi.zremrangebyscore(key, '-inf', windowStart);

        // Add current timestamp
        multi.zadd(key, now, `${now}-${Math.random()}`);

        // Count entries in window
        multi.zcount(key, windowStart, '+inf');

        // Set expiry
        multi.expire(key, Math.ceil(env.RATE_LIMIT_WINDOW_MS / 1000));

        const results = await multi.exec();
        return results[2][1]; // Return count
    }
}

// Create store based on environment
let store;
if (env.REDIS_URL && env.NODE_ENV === 'production') {
    // Import Redis client dynamically
    import('redis').then(({ createClient }) => {
        const client = createClient({ url: env.REDIS_URL });
        client.connect().then(() => {
            store = new RedisRateLimitStore(client);
            console.log('✅ Redis rate limiter initialized');
        }).catch(err => {
            console.error('❌ Redis connection failed, falling back to in-memory store:', err.message);
            store = new RateLimitStore();
        });
    }).catch(() => {
        store = new RateLimitStore();
    });
} else {
    store = new RateLimitStore();
}

// Rate limiting plugin
export const rateLimiterPlugin = new Elysia({ name: 'rateLimiter' })
    .derive({ as: 'global' }, ({ request, getUser }) => ({
        checkRateLimit: async (multiplier = 1) => {
            // Skip rate limiting in test environment
            if (env.NODE_ENV === 'test') return true;

            // Get user identifier
            const user = await getUser?.();
            const isPremium = user?.role === 'admin' || user?.role === 'reseller';

            // Use IP address as fallback
            const identifier = user?.id ||
                request.headers.get('x-forwarded-for')?.split(',')[0] ||
                request.headers.get('x-real-ip') ||
                'unknown';

            const key = `rate_limit:${identifier}`;

            // Get limit based on user type
            const limit = isPremium
                ? env.RATE_LIMIT_MAX_REQUESTS_PREMIUM
                : env.RATE_LIMIT_MAX_REQUESTS;

            // Apply multiplier for expensive operations
            const effectiveLimit = Math.floor(limit / multiplier);

            // Check rate limit
            const count = await store.increment(key);

            if (count > effectiveLimit) {
                const retryAfter = Math.ceil(env.RATE_LIMIT_WINDOW_MS / 1000);

                throw new RateLimitError(
                    `Rate limit exceeded. Please retry after ${retryAfter} seconds`
                );
            }

            return {
                limit: effectiveLimit,
                remaining: effectiveLimit - count,
                reset: new Date(Date.now() + env.RATE_LIMIT_WINDOW_MS)
            };
        }
    }))
    .onBeforeHandle(async ({ checkRateLimit, set, path }) => {
        // Skip rate limiting for certain paths
        const skipPaths = ['/health', '/health/db', '/webhooks/stripe'];
        if (skipPaths.includes(path)) return;

        try {
            const rateLimit = await checkRateLimit();

            // Add rate limit headers
            set.headers['X-RateLimit-Limit'] = rateLimit.limit.toString();
            set.headers['X-RateLimit-Remaining'] = rateLimit.remaining.toString();
            set.headers['X-RateLimit-Reset'] = rateLimit.reset.toISOString();
        } catch (error) {
            if (error instanceof RateLimitError) {
                set.status = 429;
                set.headers['Retry-After'] = Math.ceil(env.RATE_LIMIT_WINDOW_MS / 1000).toString();
                throw error;
            }
            throw error;
        }
    });

// Cleanup on process exit
process.on('SIGTERM', () => {
    if (store instanceof RateLimitStore) {
        store.destroy();
    }
});

export default rateLimiterPlugin;
