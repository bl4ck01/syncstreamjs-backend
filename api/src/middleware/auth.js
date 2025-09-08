import { Elysia } from 'elysia';

/**
 * Auth middleware that automatically validates JWT tokens and attaches userId to context.
 * This middleware replaces manual getUserId() checks in routes.
 * 
 * Usage:
 * - Apply to routes that require authentication
 * - Automatically returns 401 if no valid token
 * - Attaches userId to context for downstream use
 */
export const authMiddleware = new Elysia({ name: 'auth-middleware' })
    .derive({ as: 'scoped' }, async ({ getUserId, set }) => {
        const userId = await getUserId();
        
        if (!userId) {
            set.status = 401;
            throw new Error('Unauthorized - Invalid or missing authentication token');
        }
        
        return { userId };
    });

/**
 * Profile selection middleware that validates the 'profile' JWT cookie and
 * attaches the current profileId to the context.
 */
export const profileSelectionMiddleware = new Elysia({ name: 'profile-selection-middleware' })
    .derive({ as: 'scoped' }, async ({ headers, request, verifyAnyToken, userId, set }) => {
        let raw = request?.headers?.get('x-profile-token');
        if (!raw && headers) {
            raw = headers['x-profile-token'] || headers['X-Profile-Token'];
        }
        if (!raw) {
            set.status = 401;
            throw new Error('Profile not selected');
        }

        const payload = await verifyAnyToken(raw);
        if (!payload || payload.type !== 'profile' || payload.userId !== userId) {
            set.status = 401;
            throw new Error('Invalid profile session');
        }

        return { profileId: payload.profileId };
    });

/**
 * User context middleware that fetches complete user data including subscription info.
 * This middleware eliminates N+1 queries by using a single optimized JOIN.
 * 
 * Dependencies: Must be used after authMiddleware
 * 
 * Usage:
 * - Apply to routes that need full user object with subscription data
 * - Provides complete user context in a single query
 * - Includes plan details if user has active subscription
 */
export const userContextMiddleware = new Elysia({ name: 'user-context-middleware' })
    .derive({ as: 'scoped' }, async ({ userId, db, set }) => {
        if (!userId) {
            set.status = 401;
            throw new Error('Unauthorized - userId not found in context');
        }
        
        // Single optimized query to get user with subscription and plan details
        const user = await db.getOne(`
            WITH latest_subscription AS (
                SELECT 
                    s.*,
                    p.name as plan_name,
                    p.price_monthly,
                    p.price_annual,
                    p.price_lifetime,
                    p.max_profiles,
                    p.trial_days,
                    p.cine_party,
                    p.sync_data_across_devices,
                    p.record_live_tv,
                    p.download_offline_viewing,
                    p.parental_controls,
                    p.support_level,
                    p.is_lifetime,
                    p.is_limited_offer
                FROM subscriptions s
                LEFT JOIN plans p ON s.plan_id = p.id
                WHERE s.user_id = $1 
                    AND s.status IN ('active', 'trialing', 'canceled', 'past_due')
                ORDER BY s.created_at DESC
                LIMIT 1
            )
            SELECT 
                u.*,
                ls.status as subscription_status,
                ls.plan_id as subscription_plan_id,
                ls.stripe_subscription_id,
                ls.current_period_start,
                ls.current_period_end,
                ls.cancel_at_period_end,
                ls.trial_end,
                ls.created_at as subscription_created_at,
                ls.plan_name,
                ls.price_monthly,
                ls.price_annual,
                ls.price_lifetime,
                ls.max_profiles,
                ls.trial_days,
                ls.cine_party,
                ls.sync_data_across_devices,
                ls.record_live_tv,
                ls.download_offline_viewing,
                ls.parental_controls,
                ls.support_level,
                ls.is_lifetime,
                ls.is_limited_offer
            FROM users u
            LEFT JOIN latest_subscription ls ON true
            WHERE u.id = $1
        `, [userId]);
        
        if (!user) {
            set.status = 401;
            throw new Error('Unauthorized - User not found');
        }
        
        // Structure the user object with subscription details
        const structuredUser = {
            id: user.id,
            email: user.email,
            full_name: user.full_name,
            role: user.role,
            has_used_trial: user.has_used_trial,
            credits_balance: user.credits_balance,
            stripe_customer_id: user.stripe_customer_id,
            parent_reseller_id: user.parent_reseller_id,
            created_at: user.created_at,
            updated_at: user.updated_at,
            subscription: user.subscription_status ? {
                status: user.subscription_status,
                plan_id: user.subscription_plan_id,
                plan_name: user.plan_name,
                stripe_subscription_id: user.stripe_subscription_id,
                current_period_start: user.current_period_start,
                current_period_end: user.current_period_end,
                cancel_at_period_end: user.cancel_at_period_end,
                trial_end: user.trial_end,
                created_at: user.subscription_created_at,
                plan: {
                    name: user.plan_name,
                    price_monthly: user.price_monthly,
                    price_annual: user.price_annual,
                    price_lifetime: user.price_lifetime,
                    max_profiles: user.max_profiles,
                    trial_days: user.trial_days,
                    features: {
                        cine_party: user.cine_party,
                        sync_data_across_devices: user.sync_data_across_devices,
                        record_live_tv: user.record_live_tv,
                        download_offline_viewing: user.download_offline_viewing,
                        parental_controls: user.parental_controls
                    },
                    support_level: user.support_level,
                    is_lifetime: user.is_lifetime,
                    is_limited_offer: user.is_limited_offer
                }
            } : null
        };
        
        return { user: structuredUser };
    });

/**
 * Role-based access control middleware.
 * 
 * Dependencies: Must be used after userContextMiddleware
 * 
 * @param {string[]} allowedRoles - Array of roles that can access the route
 */
export const roleMiddleware = (allowedRoles) => {
    return new Elysia({ name: 'role-middleware' })
        .derive({ as: 'scoped' }, async ({ user, set }) => {
            if (!user) {
                set.status = 401;
                throw new Error('Unauthorized - User context not found');
            }
            
            if (!allowedRoles.includes(user.role)) {
                set.status = 403;
                throw new Error(`Forbidden: ${allowedRoles.join(' or ')} access required`);
            }
            
            return {};
        });
};

/**
 * Active subscription middleware that ensures user has an active or trialing subscription.
 * 
 * Dependencies: Must be used after userContextMiddleware
 * 
 * Usage:
 * - Apply to routes that require an active subscription
 * - Automatically returns 403 if no active subscription
 */
export const activeSubscriptionMiddleware = new Elysia({ name: 'active-subscription-middleware' })
    .derive({ as: 'scoped' }, async ({ user, set }) => {
        if (!user) {
            set.status = 401;
            throw new Error('Unauthorized - User context not found');
        }
        
        if (!user.subscription || !['active', 'trialing'].includes(user.subscription.status)) {
            set.status = 403;
            throw new Error('Active subscription required. Please subscribe to a plan to access this feature.');
        }
        
        return {};
    });

