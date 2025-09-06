import { Elysia, t } from 'elysia';
import { authPlugin } from '../plugins/auth.js';
import { databasePlugin } from '../plugins/database.js';
import { authMiddleware, userContextMiddleware } from '../middleware/auth.js';
import { checkoutSchema, changePlanSchema } from '../utils/schemas.js';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const subscriptionRoutes = new Elysia({ prefix: '/subscriptions' })
    .use(authPlugin)
    .use(databasePlugin)

    // Get current subscription - OPTIMIZED using middleware
    .use(authMiddleware)
    .use(userContextMiddleware)
    .get('/current', async ({ user }) => {
        // Subscription data is already loaded in userContextMiddleware
        if (!user.subscription) {
            return {
                success: true,
                message: null,
                data: null
            };
        }

        // Format response with subscription and plan details
        const subscription = {
            id: user.subscription.id,
            user_id: user.id,
            plan_id: user.subscription.plan_id,
            status: user.subscription.status,
            stripe_subscription_id: user.subscription.stripe_subscription_id,
            current_period_start: user.subscription.current_period_start,
            current_period_end: user.subscription.current_period_end,
            cancel_at_period_end: user.subscription.cancel_at_period_end,
            trial_start: user.subscription.trial_start,
            trial_end: user.subscription.trial_end,
            created_at: user.subscription.created_at,
            // Plan details from the joined data
            plan_name: user.subscription.plan_name,
            price_monthly: user.subscription.plan.price_monthly,
            price_annual: user.subscription.plan.price_annual,
            max_profiles: user.subscription.plan.max_profiles,
            trial_days: user.subscription.plan.trial_days,
            cine_party: user.subscription.plan.features.cine_party,
            sync_data_across_devices: user.subscription.plan.features.sync_data_across_devices,
            record_live_tv: user.subscription.plan.features.record_live_tv,
            download_offline_viewing: user.subscription.plan.features.download_offline_viewing,
            parental_controls: user.subscription.plan.features.parental_controls,
            support_level: user.subscription.plan.support_level
        };

        return {
            success: true,
            message: null,
            data: subscription
        };
    })

    // Get available plans (authenticated)
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

    // Get public plans (no authentication required, no Stripe info)
    .get('/plans/public', async ({ db }) => {
        const plans = await db.getMany(`
            SELECT 
                id,
                name,
                price_monthly,
                price_annual,
                price_lifetime,
                max_profiles,
                trial_days,
                cine_party,
                sync_data_across_devices,
                record_live_tv,
                download_offline_viewing,
                parental_controls,
                support_level,
                is_lifetime,
                is_limited_offer
            FROM plans 
            WHERE is_active = TRUE 
            ORDER BY price_monthly
        `, []);

        return {
            success: true,
            message: null,
            data: plans
        };
    })

    // Create checkout session for new subscription or upgrade - OPTIMIZED
    .use(authMiddleware)
    .use(userContextMiddleware)
    .post('/checkout', async ({ body, user, db, set }) => {
        const { plan_id, billing_period } = body;

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

        // Check if user already has an active or trialing subscription (already loaded in middleware)
        if (user.subscription && ['active', 'trialing'].includes(user.subscription.status)) {
            set.status = 400;
            return {
                success: false,
                message: 'You already have an active subscription. Please use the change your plan instead.',
                data: null
            };
        }

        // Create or get Stripe customer
        let stripeCustomerId = user.stripe_customer_id;

        if (!stripeCustomerId) {
            const customer = await stripe.customers.create({
                email: user.email,
                metadata: {
                    user_id: user.id
                }
            });

            stripeCustomerId = customer.id;

            // Update user with Stripe customer ID
            await db.query(
                'UPDATE users SET stripe_customer_id = $1 WHERE id = $2',
                [stripeCustomerId, user.id]
            );
        }

        // Determine if user is eligible for trial
        const trialEligible = !user.has_used_trial;

        // Use frontend URLs for success and cancel pages
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
        const successUrl = process.env.STRIPE_SUCCESS_URL || `${frontendUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`;
        const cancelUrl = process.env.STRIPE_CANCEL_URL || `${frontendUrl}/payment/cancel?session_id={CHECKOUT_SESSION_ID}`;

        // Determine the correct Stripe price ID based on billing period
        const stripePriceId = billing_period === 'annually' ? plan.stripe_price_id_annual : plan.stripe_price_id;

        if (!stripePriceId) {
            set.status = 400;
            return {
                success: false,
                message: `No ${billing_period} pricing available for plan: ${plan.name}`,
                data: null
            };
        }

        // Log checkout started
        console.log(`[SUBSCRIPTION] Checkout started for user ${user.id}, plan: ${plan.name}, billing: ${billing_period}`);

        // Create Stripe checkout session
        const sessionConfig = {
            customer: stripeCustomerId,
            line_items: [
                {
                    price: stripePriceId,
                    quantity: 1
                }
            ],
            success_url: successUrl,
            cancel_url: cancelUrl,
            metadata: {
                user_id: user.id,
                plan_id: plan.id
            }
        };

        // For lifetime plans, use payment mode; for regular plans, use subscription mode
        if (plan.is_lifetime) {
            sessionConfig.mode = 'payment';
        } else {
            sessionConfig.mode = 'subscription';
            sessionConfig.subscription_data = {
                ...(trialEligible && { trial_period_days: 3 }),
                metadata: {
                    user_id: user.id,
                    plan_id: plan.id
                }
            };
        }

        const session = await stripe.checkout.sessions.create(sessionConfig);

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

    // Change subscription plan - OPTIMIZED
    .post('/change-plan', async ({ body, user, db, set }) => {
        const { new_plan_id, billing_period } = body;

        // Check current subscription (already loaded in middleware)
        if (!user.subscription || !['active', 'trialing'].includes(user.subscription.status)) {
            set.status = 400;
            return {
                success: false,
                message: 'No active subscription found. Please create a new subscription first.',
                data: null
            };
        }

        // Get new plan
        const newPlan = await getPlanByIdOrName(db, new_plan_id);

        if (!newPlan) {
            set.status = 400;
            return {
                success: false,
                message: `Plan not found: ${new_plan_id}. Please provide a valid plan ID or name.`,
                data: null
            };
        }

        // Determine the correct Stripe price ID
        const newStripePriceId = billing_period === 'annually' ? newPlan.stripe_price_id_annual : newPlan.stripe_price_id;

        if (!newStripePriceId) {
            set.status = 400;
            return {
                success: false,
                message: `No ${billing_period} pricing available for plan: ${newPlan.name}`,
                data: null
            };
        }

        try {
            // Get Stripe subscription
            const stripeSubscription = await stripe.subscriptions.retrieve(user.subscription.stripe_subscription_id);

            // Update the subscription with new plan
            const updatedSubscription = await stripe.subscriptions.update(stripeSubscription.id, {
                items: [{
                    id: stripeSubscription.items.data[0].id,
                    price: newStripePriceId
                }],
                proration_behavior: 'create_prorations',
                metadata: {
                    plan_id: newPlan.id,
                    previous_plan_id: user.subscription.plan_id
                }
            });

            // Don't update database here - let webhook handle it
            console.log(`[SUBSCRIPTION] Plan change initiated for user ${user.id}: ${user.subscription.plan_name} -> ${newPlan.name}`);

            return {
                success: true,
                message: 'Plan change initiated successfully. You will receive an email confirmation.',
                data: {
                    new_plan: newPlan.name,
                    status: updatedSubscription.status,
                    effective_date: new Date(updatedSubscription.current_period_end * 1000)
                }
            };
        } catch (error) {
            console.error('[SUBSCRIPTION] Plan change error:', error);
            throw new Error('Failed to change plan. Please try again or contact support.');
        }
    }, {
        body: changePlanSchema
    })

    // Cancel subscription - OPTIMIZED
    .post('/cancel', async ({ user, set }) => {
        // Check current subscription (already loaded in middleware)
        if (!user.subscription || !['active', 'trialing'].includes(user.subscription.status)) {
            set.status = 400;
            return {
                success: false,
                message: 'No active subscription found to cancel.',
                data: null
            };
        }

        try {
            // Cancel at period end
            const canceledSubscription = await stripe.subscriptions.update(
                user.subscription.stripe_subscription_id,
                {
                    cancel_at_period_end: true,
                    metadata: {
                        canceled_by: user.id,
                        canceled_at: new Date().toISOString()
                    }
                }
            );

            console.log(`[SUBSCRIPTION] Subscription canceled for user ${user.id}`);

            return {
                success: true,
                message: 'Subscription canceled successfully. You will have access until the end of your billing period.',
                data: {
                    cancel_at: new Date(canceledSubscription.current_period_end * 1000),
                    status: 'canceled'
                }
            };
        } catch (error) {
            console.error('[SUBSCRIPTION] Cancellation error:', error);
            throw new Error('Failed to cancel subscription. Please try again or contact support.');
        }
    })

    // Reactivate canceled subscription - OPTIMIZED
    .post('/reactivate', async ({ user, set }) => {
        // Check current subscription (already loaded in middleware)
        if (!user.subscription) {
            set.status = 400;
            return {
                success: false,
                message: 'No subscription found to reactivate.',
                data: null
            };
        }

        if (user.subscription.status !== 'active' || !user.subscription.cancel_at_period_end) {
            set.status = 400;
            return {
                success: false,
                message: 'Only canceled subscriptions that are still active can be reactivated.',
                data: null
            };
        }

        try {
            // Remove cancellation
            const reactivatedSubscription = await stripe.subscriptions.update(
                user.subscription.stripe_subscription_id,
                {
                    cancel_at_period_end: false,
                    metadata: {
                        reactivated_by: user.id,
                        reactivated_at: new Date().toISOString()
                    }
                }
            );

            console.log(`[SUBSCRIPTION] Subscription reactivated for user ${user.id}`);

            return {
                success: true,
                message: 'Subscription reactivated successfully.',
                data: {
                    status: 'active',
                    cancel_at_period_end: false
                }
            };
        } catch (error) {
            console.error('[SUBSCRIPTION] Reactivation error:', error);
            throw new Error('Failed to reactivate subscription. Please try again or contact support.');
        }
    })

    // Get subscription history - OPTIMIZED
    .get('/history', async ({ userId, db }) => {
        const history = await db.getMany(`
            SELECT 
                s.*,
                p.name as plan_name,
                p.price_monthly,
                p.price_annual
            FROM subscriptions s
            LEFT JOIN plans p ON s.plan_id = p.id
            WHERE s.user_id = $1
            ORDER BY s.created_at DESC
        `, [userId]);

        return {
            success: true,
            message: null,
            data: history
        };
    })

    // Create portal session for billing management - OPTIMIZED
    .post('/portal', async ({ user, set }) => {
        if (!user.stripe_customer_id) {
            set.status = 400;
            return {
                success: false,
                message: 'No billing information found for this account.',
                data: null
            };
        }

        try {
            const returnUrl = process.env.FRONTEND_URL || 'http://localhost:3001';

            const session = await stripe.billingPortal.sessions.create({
                customer: user.stripe_customer_id,
                return_url: `${returnUrl}/account`
            });

            return {
                success: true,
                message: 'Billing portal session created',
                data: {
                    url: session.url
                }
            };
        } catch (error) {
            console.error('[SUBSCRIPTION] Portal session error:', error);
            throw new Error('Failed to create billing portal session. Please try again.');
        }
    });

// Helper function to get plan by ID or name
async function getPlanByIdOrName(db, identifier) {
    // First try as UUID
    let plan = await db.getOne(
        'SELECT * FROM plans WHERE id = $1 AND is_active = TRUE',
        [identifier]
    );

    // If not found and not a valid UUID, try as name
    if (!plan && !identifier.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        plan = await db.getOne(
            'SELECT * FROM plans WHERE LOWER(name) = LOWER($1) AND is_active = TRUE',
            [identifier]
        );
    }

    return plan;
}
