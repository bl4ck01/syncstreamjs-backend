import { Elysia } from 'elysia';

/**
 * Subscription validation middleware
 * Ensures users have an active subscription before accessing protected resources
 */
export const subscriptionValidatorPlugin = new Elysia({ name: 'subscription-validator' })
    .guard({
        beforeHandle: async ({ getUserId, db, set }) => {
            console.log('[SUBSCRIPTION_VALIDATOR] Middleware called');
            const userId = await getUserId();
            console.log('[SUBSCRIPTION_VALIDATOR] User ID:', userId);
            
            if (!userId) {
                console.log('[SUBSCRIPTION_VALIDATOR] No user ID found');
                set.status = 401;
                return {
                    success: false,
                    message: 'Unauthorized - Invalid or missing authentication token',
                    data: null
                };
            }

            // Check if user has an active or trialing subscription
            const subscription = await db.getOne(
                'SELECT * FROM subscriptions WHERE user_id = $1 AND status IN (\'active\', \'trialing\')',
                [userId]
            );
            console.log('[SUBSCRIPTION_VALIDATOR] Subscription found:', !!subscription);

            if (!subscription) {
                console.log('[SUBSCRIPTION_VALIDATOR] No subscription found, blocking access');
                set.status = 403;
                return {
                    success: false,
                    message: 'Active subscription required. Please subscribe to a plan to access this feature.',
                    data: null
                };
            }
            console.log('[SUBSCRIPTION_VALIDATOR] Subscription found, allowing access');
        }
    });
