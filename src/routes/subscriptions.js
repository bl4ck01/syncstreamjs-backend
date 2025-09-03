import { Elysia, t } from 'elysia';
import { authPlugin } from '../plugins/auth.js';
import { databasePlugin } from '../plugins/database.js';
import { checkoutSchema, changePlanSchema } from '../utils/schemas.js';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const subscriptionRoutes = new Elysia({ prefix: '/subscriptions' })
    .use(authPlugin)
    .use(databasePlugin)

    // Get current subscription
    .get('/current', async ({ getUserId, db, set }) => {
        const userId = await getUserId();

        if (!userId) {
            set.status = 401;
            return {
                success: false,
                message: 'Unauthorized - Invalid or missing authentication token',
                data: null
            };
        }

        const subscription = await db.getOne(`
            SELECT 
                s.*,
                p.name as plan_name,
                p.price_monthly,
                p.max_profiles,
                p.max_playlists,
                p.max_favorites,
                p.features
            FROM subscriptions s
            JOIN plans p ON s.plan_id = p.id
            WHERE s.user_id = $1 AND s.status IN ('active', 'trialing')
            ORDER BY s.created_at DESC
            LIMIT 1
        `, [userId]);

        return {
            success: true,
            message: null,
            data: subscription
        };
    })

    // Get available plans
    .get('/plans', async ({ db }) => {
        const plans = await db.getMany(
            'SELECT * FROM plans WHERE is_active = TRUE ORDER BY price_monthly',
            []
        );

        return {
            success: true,
            message: null,
            data: plans
        };
    })

    // Create checkout session for new subscription or upgrade
    .post('/checkout', async ({ body, getUserId, getUser, db, set }) => {
        const userId = await getUserId();

        if (!userId) {
            set.status = 401;
            return {
                success: false,
                message: 'Unauthorized - Invalid or missing authentication token',
                data: null
            };
        }

        const user = await getUser();

        if (!user) {
            set.status = 401;
            return {
                success: false,
                message: 'Unauthorized - User not found',
                data: null
            };
        }

        const { plan_id } = body;

        // Get the plan by ID or name
        const plan = await getPlanByIdOrName(db, plan_id);
        
        if (!plan) {
            set.status = 400;
            return {
                success: false,
                message: `Plan not found: ${plan_id}. Please provide a valid plan ID or name.`,
                data: null
            };
        }

        // Check if user already has an active or trialing subscription
        const existingSubscription = await db.getOne(
            'SELECT * FROM subscriptions WHERE user_id = $1 AND status IN (\'active\', \'trialing\')',
            [userId]
        );

        if (existingSubscription) {
            set.status = 400;
            return {
                success: false,
                message: 'You already have an active subscription. Please use the change plan endpoint.',
                data: null
            };
        }

        // Create or get Stripe customer
        let stripeCustomerId = user.stripe_customer_id;

        if (!stripeCustomerId) {
            const customer = await stripe.customers.create({
                email: user.email,
                metadata: {
                    user_id: userId
                }
            });

            stripeCustomerId = customer.id;

            // Update user with Stripe customer ID
            await db.query(
                'UPDATE users SET stripe_customer_id = $1 WHERE id = $2',
                [stripeCustomerId, userId]
            );
        }

        // Determine if user is eligible for trial
        const trialEligible = !user.has_used_trial;

        // Use secure, predefined URLs from environment variables
        const successUrl = process.env.STRIPE_SUCCESS_URL || `${process.env.API_URL || 'http://localhost:3000'}/api/v1/webhooks/success?session_id={CHECKOUT_SESSION_ID}`;
        const cancelUrl = process.env.STRIPE_CANCEL_URL || `${process.env.API_URL || 'http://localhost:3000'}/api/v1/webhooks/cancel?session_id={CHECKOUT_SESSION_ID}`;

        // Log checkout started
        console.log(`[SUBSCRIPTION] Checkout started for user ${userId}, plan: ${plan.name}`);

        // Create Stripe checkout session
        const session = await stripe.checkout.sessions.create({
            customer: stripeCustomerId,
            line_items: [
                {
                    price: plan.stripe_price_id,
                    quantity: 1
                }
            ],
            mode: 'subscription',
            success_url: successUrl,
            cancel_url: cancelUrl,
            subscription_data: {
                ...(trialEligible && { trial_period_days: 7 }),
                metadata: {
                    user_id: userId,
                    plan_id: plan.id
                }
            },
            metadata: {
                user_id: userId,
                plan_id: plan.id
            }
        });

        return {
            success: true,
            message: 'Checkout session created successfully',
            data: {
                checkout_url: session.url,
                session_id: session.id
            }
        };
    }, {
        body: checkoutSchema
    })

    // Change subscription plan
    .post('/change-plan', async ({ body, getUserId, getUser, db, set }) => {
        const userId = await getUserId();

        if (!userId) {
            set.status = 401;
            return {
                success: false,
                message: 'Unauthorized - Invalid or missing authentication token',
                data: null
            };
        }

        const user = await getUser();

        if (!user) {
            set.status = 401;
            return {
                success: false,
                message: 'Unauthorized - User not found',
                data: null
            };
        }

        const { new_plan_id } = body;

        // Get current subscription
        const currentSubscription = await db.getOne(
            'SELECT * FROM subscriptions WHERE user_id = $1 AND status IN (\'active\', \'trialing\')',
            [userId]
        );

        if (!currentSubscription || !currentSubscription.stripe_subscription_id) {
            set.status = 400;
            return {
                success: false,
                message: 'No active subscription found',
                data: null
            };
        }

        // Get the new plan by ID or name
        const newPlan = await getPlanByIdOrName(db, new_plan_id);
        
        if (!newPlan) {
            set.status = 400;
            return {
                success: false,
                message: `Plan not found: ${new_plan_id}. Please provide a valid plan ID or name.`,
                data: null
            };
        }
        
        // Get current plan details
        const currentPlan = await db.getOne(
            'SELECT * FROM plans WHERE id = $1',
            [currentSubscription.plan_id]
        );
        
        // Log plan change requested
        console.log(`[SUBSCRIPTION] Plan change requested from ${currentPlan?.name} to ${newPlan.name}`);

        // Get the Stripe subscription
        const stripeSubscription = await stripe.subscriptions.retrieve(
            currentSubscription.stripe_subscription_id
        );

        // Update the subscription in Stripe
        const updatedSubscription = await stripe.subscriptions.update(
            currentSubscription.stripe_subscription_id,
            {
                items: [{
                    id: stripeSubscription.items.data[0].id,
                    price: newPlan.stripe_price_id
                }],
                proration_behavior: 'create_prorations',
                metadata: {
                    user_id: userId,
                    plan_id: newPlan.id
                }
            }
        );

        // Note: The actual database update will happen via webhook
        
        // Log plan change scheduled
        console.log(`[SUBSCRIPTION] Plan change scheduled for subscription: ${currentSubscription.stripe_subscription_id}`);

        return {
            success: true,
            message: 'Plan change initiated',
            data: {
                new_plan: newPlan.name,
                effective_date: new Date(updatedSubscription.current_period_end * 1000).toISOString()
            }
        };
    }, {
        body: changePlanSchema
    })

    // Cancel subscription
    .post('/cancel', async ({ getUserId, db, set }) => {
        const userId = await getUserId();

        if (!userId) {
            set.status = 401;
            return {
                success: false,
                message: 'Unauthorized - Invalid or missing authentication token',
                data: null
            };
        }

        // Get current subscription
        const subscription = await db.getOne(
            'SELECT * FROM subscriptions WHERE user_id = $1 AND status IN (\'active\', \'trialing\')',
            [userId]
        );

        if (!subscription || !subscription.stripe_subscription_id) {
            set.status = 400;
            return {
                success: false,
                message: 'No active subscription found',
                data: null
            };
        }

        // Cancel at period end in Stripe
        const canceledSubscription = await stripe.subscriptions.update(
            subscription.stripe_subscription_id,
            {
                cancel_at_period_end: true
            }
        );

        // Update local database
        await db.query(
            'UPDATE subscriptions SET cancel_at_period_end = TRUE WHERE id = $1',
            [subscription.id]
        );
        
        // Log subscription cancellation scheduled
        console.log(`[SUBSCRIPTION] Subscription canceled: ${subscription.stripe_subscription_id}`);

        return {
            success: true,
            message: 'Subscription will be canceled at the end of the current period',
            data: {
                cancel_date: new Date(canceledSubscription.current_period_end * 1000).toISOString()
            }
        };
    })

    // Reactivate canceled subscription
    .post('/reactivate', async ({ getUserId, db, set }) => {
        const userId = await getUserId();

        if (!userId) {
            set.status = 401;
            return {
                success: false,
                message: 'Unauthorized - Invalid or missing authentication token',
                data: null
            };
        }

        // Get current subscription
        const subscription = await db.getOne(
            'SELECT * FROM subscriptions WHERE user_id = $1 AND status IN (\'active\', \'trialing\') AND cancel_at_period_end = TRUE',
            [userId]
        );

        if (!subscription || !subscription.stripe_subscription_id) {
            set.status = 400;
            return {
                success: false,
                message: 'No canceled subscription found',
                data: null
            };
        }

        // Reactivate in Stripe
        const reactivatedSubscription = await stripe.subscriptions.update(
            subscription.stripe_subscription_id,
            {
                cancel_at_period_end: false
            }
        );

        // Update local database
        await db.query(
            'UPDATE subscriptions SET cancel_at_period_end = FALSE WHERE id = $1',
            [subscription.id]
        );
        
        // Log subscription reactivation
        console.log(`[SUBSCRIPTION] Subscription reactivated: ${subscription.stripe_subscription_id}`);

        return {
            success: true,
            message: 'Subscription reactivated successfully',
            data: {
                next_billing_date: new Date(reactivatedSubscription.current_period_end * 1000).toISOString()
            }
        };
    })

    // Get billing portal URL
    .get('/billing-portal', async ({ getUser, query, set }) => {
        const user = await getUser();
        
        if (!user) {
            set.status = 401;
            return {
                success: false,
                message: 'Unauthorized - User not found',
                data: null
            };
        }

        const { return_url } = query;

        if (!user.stripe_customer_id) {
            set.status = 400;
            return {
                success: false,
                message: 'No billing information found',
                data: null
            };
        }

        const session = await stripe.billingPortal.sessions.create({
            customer: user.stripe_customer_id,
            return_url: return_url || `${process.env.FRONTEND_URL}/account`
        });

        return {
            success: true,
            message: 'Billing portal session created',
            data: {
                portal_url: session.url
            }
        };
    }, {
        query: t.Object({
            return_url: t.Optional(t.String({ format: 'url' }))
        })
    })

    // Get subscription history
    .get('/history', async ({ getUserId, db }) => {
        const userId = await getUserId();

        if (!userId) {
            return {
                success: false,
                message: 'Unauthorized - Invalid or missing authentication token',
                data: null
            };
        }

        const history = await db.getMany(`
            SELECT 
                s.*,
                p.name as plan_name,
                p.price_monthly
            FROM subscriptions s
            JOIN plans p ON s.plan_id = p.id
            WHERE s.user_id = $1
            ORDER BY s.created_at DESC
        `, [userId]);

        return {
            success: true,
            message: null,
            data: history
        };
    });

// Helper function to get plan by ID or name
async function getPlanByIdOrName(db, identifier) {
    // Check if identifier is a UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    if (uuidRegex.test(identifier)) {
        // If it's a UUID, search by ID
        return await db.getOne(
            'SELECT * FROM plans WHERE id = $1 AND is_active = TRUE',
            [identifier]
        );
    } else {
        // If it's not a UUID, search by name (case-insensitive)
        return await db.getOne(
            'SELECT * FROM plans WHERE name ILIKE $1 AND is_active = TRUE',
            [identifier]
        );
    }
}
