import { Elysia } from 'elysia';
import env from '../utils/env.js';

// Mobile optimization and data serialization plugin
export const optimizationPlugin = new Elysia({ name: 'optimization' })
    // Compression middleware
    .onBeforeHandle(({ request, set }) => {
        // Check if client supports compression
        const acceptEncoding = request.headers.get('accept-encoding') || '';

        if (env.COMPRESSION_ENABLED) {
            if (acceptEncoding.includes('gzip')) {
                set.headers['Content-Encoding'] = 'gzip';
            } else if (acceptEncoding.includes('deflate')) {
                set.headers['Content-Encoding'] = 'deflate';
            }
        }

        // Add cache headers for static responses
        const path = new URL(request.url).pathname;
        if (path.startsWith('/api/v1/plans') || path.startsWith('/api/v1/languages')) {
            set.headers['Cache-Control'] = `public, max-age=${env.RESPONSE_CACHE_TTL}`;
        }
    })

    // Mobile detection and optimization
    .derive({ as: 'global' }, ({ request }) => {
        const userAgent = request.headers.get('user-agent') || '';
        const isMobile = /Mobile|Android|iPhone|iPad/i.test(userAgent);
        const isTablet = /iPad|Android.*Tablet/i.test(userAgent);
        const isIOS = /iPhone|iPad|iPod/i.test(userAgent);
        const isAndroid = /Android/i.test(userAgent);

        // API version detection
        const apiVersion = request.headers.get('x-api-version') || env.API_VERSION;

        // Pagination helpers
        const getPageParams = (query) => {
            const page = parseInt(query.page) || 1;
            const limit = Math.min(parseInt(query.limit) || (isMobile ? 10 : 20), 100);
            const offset = (page - 1) * limit;

            return { page, limit, offset };
        };

        // Field selection for bandwidth optimization
        const getFields = (query) => {
            if (query.fields) {
                return query.fields.split(',').map(f => f.trim());
            }

            // Default fields for mobile to reduce payload
            if (isMobile && !query.full) {
                return ['id', 'name', 'created_at', 'updated_at'];
            }

            return null; // Return all fields
        };

        return {
            device: {
                isMobile,
                isTablet,
                isIOS,
                isAndroid,
                isDesktop: !isMobile && !isTablet
            },
            apiVersion,
            pagination: getPageParams,
            fields: getFields,

            // Optimize response based on device
            optimizeResponse: (data, options = {}) => {
                const {
                    fields = null,
                    exclude = [],
                    maxDepth = 3,
                    maxArrayLength = isMobile ? 50 : 100
                } = options;

                // Helper to filter object fields
                const filterFields = (obj, depth = 0) => {
                    if (depth > maxDepth) return '...';

                    if (Array.isArray(obj)) {
                        return obj.slice(0, maxArrayLength).map(item => filterFields(item, depth + 1));
                    }

                    if (obj && typeof obj === 'object') {
                        const filtered = {};

                        for (const [key, value] of Object.entries(obj)) {
                            // Skip excluded fields
                            if (exclude.includes(key)) continue;

                            // Include only specified fields if provided
                            if (fields && !fields.includes(key)) continue;

                            // Skip large fields for mobile
                            if (isMobile && typeof value === 'string' && value.length > 1000) {
                                filtered[key] = value.substring(0, 1000) + '...';
                            } else {
                                filtered[key] = filterFields(value, depth + 1);
                            }
                        }

                        return filtered;
                    }

                    return obj;
                };

                return filterFields(data);
            },

            // Paginated response helper
            paginatedResponse: (data, total, pagination) => {
                const { page, limit } = pagination;
                const totalPages = Math.ceil(total / limit);

                return {
                    success: true,
                    data,
                    pagination: {
                        page,
                        limit,
                        total,
                        totalPages,
                        hasNext: page < totalPages,
                        hasPrev: page > 1
                    }
                };
            }
        };
    })

    // Response transformation for mobile optimization
    .onTransform(({ response, device, apiVersion }) => {
        if (!response) return;

        // Add device info header
        if (device.isMobile) {
            response.headers = response.headers || {};
            response.headers['X-Device-Type'] = 'mobile';
        }

        // Add API version header
        response.headers = response.headers || {};
        response.headers['X-API-Version'] = apiVersion;
    })

    // ETag support for caching
    .derive({ as: 'global' }, () => ({
        generateETag: (data) => {
            const hash = crypto
                .createHash('md5')
                .update(JSON.stringify(data))
                .digest('hex');
            return `"${hash}"`;
        },

        checkETag: (request, etag) => {
            const ifNoneMatch = request.headers.get('if-none-match');
            return ifNoneMatch === etag;
        }
    }));

// Data serialization utilities
export const serializers = {
    // User serializer
    user: (user, options = {}) => {
        const { includePrivate = false, device = {} } = options;

        const serialized = {
            id: user.id,
            email: user.email,
            fullName: user.full_name,
            role: user.role,
            createdAt: user.created_at,
            ...(includePrivate && {
                hasUsedTrial: user.has_used_trial,
                creditsBalance: user.credits_balance,
                stripeCustomerId: user.stripe_customer_id,
                parentResellerId: user.parent_reseller_id
            })
        };

        // Reduce data for mobile
        if (device.isMobile && !includePrivate) {
            delete serialized.createdAt;
        }

        return serialized;
    },

    // Profile serializer
    profile: (profile, options = {}) => {
        const { device = {} } = options;

        return {
            id: profile.id,
            name: profile.name,
            avatarUrl: profile.avatar_url,
            isKidsProfile: profile.is_kids_profile,
            isActive: profile.is_active,
            hasPin: !!profile.parental_pin,
            ...(device.isDesktop && {
                createdAt: profile.created_at,
                updatedAt: profile.updated_at
            })
        };
    },

    // Playlist serializer
    playlist: (playlist, options = {}) => {
        const { includeCredentials = false, device = {} } = options;

        return {
            id: playlist.id,
            name: playlist.name,
            url: playlist.url,
            isActive: playlist.is_active,
            ...(includeCredentials && {
                username: playlist.username,
                password: playlist.password
            }),
            ...(device.isDesktop && {
                createdAt: playlist.created_at,
                updatedAt: playlist.updated_at
            })
        };
    },

    // Subscription serializer
    subscription: (subscription, plan, options = {}) => {
        const { device = {} } = options;

        return {
            id: subscription.id,
            status: subscription.status,
            plan: {
                id: plan.id,
                name: plan.name,
                price: plan.price_monthly,
                features: plan.features
            },
            currentPeriodEnd: subscription.current_period_end,
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
            ...(device.isDesktop && {
                stripeSubscriptionId: subscription.stripe_subscription_id,
                stripePriceId: subscription.stripe_price_id,
                trialEnd: subscription.trial_end,
                createdAt: subscription.created_at
            })
        };
    },

    // Batch serializer for arrays
    collection: (items, serializer, options = {}) => {
        return items.map(item => serializer(item, options));
    }
};

// Response formatter for consistent API responses
export const formatResponse = (data, options = {}) => {
    const {
        success = true,
        message = null,
        pagination = null,
        device = {},
        fields = null
    } = options;

    const response = {
        success,
        ...(message && { message }),
        data
    };

    if (pagination) {
        response.pagination = pagination;
    }

    // Add mobile-specific metadata
    if (device.isMobile) {
        response.device = 'mobile';

        // Add data size for mobile monitoring
        const dataSize = JSON.stringify(data).length;
        response.dataSize = `${Math.round(dataSize / 1024)}KB`;
    }

    return response;
};

export default optimizationPlugin;
