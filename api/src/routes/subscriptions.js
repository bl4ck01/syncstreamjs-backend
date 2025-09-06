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
                p.price_annual,
                p.max_profiles,
                p.trial_days,
                p.cine_party,
                p.sync_data_across_devices,
                p.record_live_tv,
                p.download_offline_viewing,
                p.parental_controls,
                p.support_level
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

        // Check if user already has an active or trialing subscription
        const existingSubscription = await db.getOne(
            'SELECT * FROM subscriptions WHERE user_id = $1 AND status IN (\'active\', \'trialing\')',
            [userId]
        );

        if (existingSubscription) {
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
        console.log(`[SUBSCRIPTION] Checkout started for user ${userId}, plan: ${plan.name}, billing: ${billing_period}`);

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
                user_id: userId,
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
                    user_id: userId,
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

        // Validate that the subscription has items
        if (!stripeSubscription.items || !stripeSubscription.items.data || stripeSubscription.items.data.length === 0) {
            set.status = 400;
            return {
                success: false,
                message: 'Invalid subscription structure from Stripe',
                data: null
            };
        }

        // Update the subscription in Stripe
        const updatedSubscription = await stripe.subscriptions.update(
            currentSubscription.stripe_subscription_id,
            {
                items: [{
                    id: stripeSubscription.items.data[0].id,
                    price: newPlan.stripe_price_id
                }],
                proration_behavior: 'create_prorations',
                billing_cycle_anchor: 'now', // Force immediate billing
                metadata: {
                    user_id: userId,
                    plan_id: newPlan.id
                }
            }
        );

        // Log the updated subscription response for debugging
        console.log(`[SUBSCRIPTION] Stripe response - current_period_end: ${updatedSubscription.current_period_end}, type: ${typeof updatedSubscription.current_period_end}`);
        console.log(`[SUBSCRIPTION] New plan price: ${newPlan.stripe_price_id}, Old plan price: ${currentPlan?.stripe_price_id}`);

        // Note: The actual database update will happen via webhook

        // Log plan change scheduled
        console.log(`[SUBSCRIPTION] Plan change scheduled for subscription: ${currentSubscription.stripe_subscription_id}`);

        // Safely handle the effective date
        let effectiveDate = null;
        if (updatedSubscription.current_period_end) {
            try {
                effectiveDate = new Date(updatedSubscription.current_period_end * 1000).toISOString();
            } catch (error) {
                console.log(`[SUBSCRIPTION] Error converting effective date: ${error.message}`);
                // Fallback to current date + 1 month if conversion fails
                effectiveDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
            }
        } else {
            // If no current_period_end, use current date + 1 month as fallback
            effectiveDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        }

        return {
            success: true,
            message: 'Plan change initiated',
            data: {
                new_plan: newPlan.name,
                effective_date: effectiveDate
            }
        };
    }, {
        body: changePlanSchema
    })

    // Preview plan change proration
    .post('/preview-plan-change', async ({ body, getUserId, getUser, db, set }) => {
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

        if (!currentPlan) {
            set.status = 400;
            return {
                success: false,
                message: 'Current plan not found',
                data: null
            };
        }

        try {
            // Get the Stripe subscription
            const stripeSubscription = await stripe.subscriptions.retrieve(
                currentSubscription.stripe_subscription_id
            );

            // Use Stripe's native subscription preview to get accurate proration details
            const preview = await stripe.subscriptions.retrieve(
                currentSubscription.stripe_subscription_id,
                {
                    expand: ['latest_invoice', 'items.data.price']
                }
            );

            // Create a preview of the subscription update using Stripe's preview method
            const prorationPreview = await stripe.invoices.retrieveUpcoming({
                customer: stripeSubscription.customer,
                subscription: currentSubscription.stripe_subscription_id,
                subscription_items: [{
                    id: stripeSubscription.items.data[0].id,
                    price: newPlan.stripe_price_id
                }],
                subscription_proration_behavior: 'create_prorations'
            });

            // Get detailed proration breakdown from Stripe
            const prorationItems = prorationPreview.lines.data.filter(line =>
                line.proration && line.proration.type === 'invoice_item'
            );

            // Calculate total proration amount
            const totalProration = prorationItems.reduce((sum, item) => {
                return sum + Math.abs(item.amount);
            }, 0);

            // Get current period info
            const now = Math.floor(Date.now() / 1000);
            const periodEnd = stripeSubscription.current_period_end;
            const periodStart = stripeSubscription.current_period_start;
            const daysRemaining = Math.ceil((periodEnd - now) / (24 * 60 * 60));
            const totalPeriodDays = Math.ceil((periodEnd - periodStart) / (24 * 60 * 60));

            return {
                success: true,
                message: 'Plan change preview generated',
                data: {
                    current_plan: {
                        name: currentPlan.name,
                        price_monthly: currentPlan.price_monthly,
                        stripe_price_id: currentPlan.stripe_price_id
                    },
                    new_plan: {
                        name: newPlan.name,
                        price_monthly: newPlan.price_monthly,
                        stripe_price_id: newPlan.stripe_price_id
                    },
                    proration_details: {
                        amount: totalProration / 100, // Convert from cents
                        currency: prorationPreview.currency,
                        days_remaining: daysRemaining,
                        total_period_days: totalPeriodDays,
                        effective_date: new Date().toISOString()
                    },
                    billing_period: {
                        current_period_start: new Date(periodStart * 1000).toISOString(),
                        current_period_end: new Date(periodEnd * 1000).toISOString()
                    },
                    preview_invoice: {
                        subtotal: prorationPreview.subtotal / 100,
                        total: prorationPreview.total / 100,
                        amount_due: prorationPreview.amount_due / 100,
                        next_payment_attempt: prorationPreview.next_payment_attempt ? new Date(prorationPreview.next_payment_attempt * 1000).toISOString() : null
                    },
                    stripe_proration_breakdown: {
                        total_proration_amount: totalProration / 100,
                        proration_items: prorationItems.map(item => ({
                            description: item.description,
                            amount: item.amount / 100,
                            currency: item.currency,
                            proration_type: item.proration.type,
                            period_start: item.period?.start ? new Date(item.period.start * 1000).toISOString() : null,
                            period_end: item.period?.end ? new Date(item.period.end * 1000).toISOString() : null
                        }))
                    }
                }
            };

        } catch (error) {
            console.error('[SUBSCRIPTION] Error previewing plan change:', error);

            // Handle specific Stripe errors
            if (error.type === 'StripeError') {
                console.error('[SUBSCRIPTION] Stripe error details:', {
                    code: error.code,
                    message: error.message,
                    decline_code: error.decline_code
                });

                set.status = 400;
                return {
                    success: false,
                    message: `Stripe error: ${error.message}`,
                    data: null
                };
            }

            set.status = 500;
            return {
                success: false,
                message: 'Failed to generate plan change preview',
                data: null
            };
        }
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

        // Safely handle the cancel date
        let cancelDate = null;
        if (canceledSubscription.current_period_end) {
            try {
                cancelDate = new Date(canceledSubscription.current_period_end * 1000).toISOString();
            } catch (error) {
                console.log(`[SUBSCRIPTION] Error converting cancel date: ${error.message}`);
                // Fallback to current date + 1 month if conversion fails
                cancelDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
            }
        } else {
            // If no current_period_end, use current date + 1 month as fallback
            cancelDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        }

        return {
            success: true,
            message: 'Subscription will be canceled at the end of the current period',
            data: {
                cancel_date: cancelDate
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

        // Safely handle the next billing date
        let nextBillingDate = null;
        if (reactivatedSubscription.current_period_end) {
            try {
                nextBillingDate = new Date(reactivatedSubscription.current_period_end * 1000).toISOString();
            } catch (error) {
                console.log(`[SUBSCRIPTION] Error converting next billing date: ${error.message}`);
                // Fallback to current date + 1 month if conversion fails
                nextBillingDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
            }
        } else {
            // If no current_period_end, use current date + 1 month as fallback
            nextBillingDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        }

        return {
            success: true,
            message: 'Subscription reactivated successfully',
            data: {
                next_billing_date: nextBillingDate
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
                p.price_monthly,
                p.price_annual
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
