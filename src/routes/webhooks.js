import { Elysia, t } from 'elysia';
import { databasePlugin } from '../plugins/database.js';
import Stripe from 'stripe';
import { createLogger, SUBSCRIPTION_EVENTS } from '../services/logger.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const webhookRoutes = new Elysia({ prefix: '/webhooks' })
    .use(databasePlugin)
    .derive(({ db }) => ({
        logger: createLogger(db)
    }))

    // Stripe webhook handler
    .post('/stripe', async ({ request, db, set, logger }) => {
        const sig = request.headers.get('stripe-signature');
        const body = await request.text();

        if (!sig) {
            set.status = 400;
            throw new Error('No signature provided');
        }

        let event;

        try {
            event = stripe.webhooks.constructEvent(
                body,
                sig,
                process.env.STRIPE_WEBHOOK_SECRET
            );
        } catch (err) {
            set.status = 400;
            throw new Error(`Webhook signature verification failed: ${err.message}`);
        }

        // Handle the event
        try {
            switch (event.type) {
                case 'customer.subscription.created':
                case 'customer.subscription.updated': {
                    const subscription = event.data.object;
                    await handleSubscriptionUpdate(db, subscription, event, logger);
                    break;
                }

                case 'customer.subscription.deleted': {
                    const subscription = event.data.object;
                    await handleSubscriptionDeleted(db, subscription, event, logger);
                    break;
                }

                case 'customer.subscription.trial_will_end': {
                    const subscription = event.data.object;
                    await handleTrialWillEnd(db, subscription, event, logger);
                    break;
                }

                case 'invoice.paid': {
                    const invoice = event.data.object;
                    await handleInvoicePaid(db, invoice, event, logger);
                    break;
                }

                case 'invoice.payment_failed': {
                    const invoice = event.data.object;
                    await handlePaymentFailed(db, invoice, event, logger);
                    break;
                }

                case 'checkout.session.completed': {
                    const session = event.data.object;
                    await handleCheckoutCompleted(db, session, event, logger);
                    break;
                }

                default:
                    console.log(`Unhandled event type ${event.type}`);
            }

            return { received: true };
        } catch (error) {
            console.error('Webhook processing error:', error);
            set.status = 500;
            throw new Error('Webhook processing failed');
        }
    }, {
        type: 'text'  // Important: receive raw body for signature verification
    });

// Helper functions for webhook handling
async function handleSubscriptionUpdate(db, subscription, event, logger) {
    const userId = subscription.metadata.user_id;
    const planId = subscription.metadata.plan_id;

    if (!userId) {
        console.error('No user_id in subscription metadata');
        return;
    }

    // Get plan details for logging
    const plan = planId ? await db.getOne('SELECT * FROM plans WHERE id = $1', [planId]) : null;

    // Check if subscription exists
    const existing = await db.getOne(
        'SELECT id FROM subscriptions WHERE stripe_subscription_id = $1',
        [subscription.id]
    );

    if (existing) {
        // Update existing subscription
        await db.query(`
            UPDATE subscriptions SET
                status = $1,
                stripe_price_id = $2,
                current_period_start = $3,
                current_period_end = $4,
                cancel_at_period_end = $5,
                trial_end = $6,
                plan_id = $7,
                updated_at = CURRENT_TIMESTAMP
            WHERE stripe_subscription_id = $8
        `, [
            subscription.status,
            subscription.items.data[0].price.id,
            new Date(subscription.current_period_start * 1000),
            new Date(subscription.current_period_end * 1000),
            subscription.cancel_at_period_end,
            subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
            planId,
            subscription.id
        ]);
    } else {
        // Create new subscription record
        await db.insert('subscriptions', {
            user_id: userId,
            stripe_subscription_id: subscription.id,
            stripe_price_id: subscription.items.data[0].price.id,
            status: subscription.status,
            current_period_start: new Date(subscription.current_period_start * 1000),
            current_period_end: new Date(subscription.current_period_end * 1000),
            cancel_at_period_end: subscription.cancel_at_period_end,
            trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
            plan_id: planId
        });

        // Mark trial as used if this is a trial subscription
        if (subscription.trial_end) {
            await db.query(
                'UPDATE users SET has_used_trial = TRUE WHERE id = $1',
                [userId]
            );

            // Log trial started
            await logger.logSubscriptionEvent({
                event_type: SUBSCRIPTION_EVENTS.TRIAL_STARTED,
                user_id: userId,
                subscription_id: existing ? existing.id : null,
                stripe_subscription_id: subscription.id,
                stripe_event_id: event.id,
                plan_id: planId,
                metadata: {
                    trial_end: subscription.trial_end,
                    plan_name: plan?.name
                }
            });
        }

        // Log subscription created
        await logger.logSubscriptionEvent({
            event_type: SUBSCRIPTION_EVENTS.SUBSCRIPTION_CREATED,
            user_id: userId,
            subscription_id: existing ? existing.id : null,
            stripe_subscription_id: subscription.id,
            stripe_event_id: event.id,
            plan_id: planId,
            amount: subscription.items.data[0].price.unit_amount / 100,
            currency: subscription.items.data[0].price.currency,
            metadata: {
                status: subscription.status,
                plan_name: plan?.name,
                billing_interval: subscription.items.data[0].price.recurring?.interval
            }
        });
    } else {
        // Check if this is an upgrade/downgrade
        const oldSubscription = await db.getOne(
            'SELECT plan_id, stripe_price_id FROM subscriptions WHERE stripe_subscription_id = $1',
            [subscription.id]
        );

        if (oldSubscription && oldSubscription.stripe_price_id !== subscription.items.data[0].price.id) {
            const oldPlan = await db.getOne('SELECT * FROM plans WHERE id = $1', [oldSubscription.plan_id]);
            const newPlan = plan;

            const eventType = (newPlan?.price_monthly || 0) > (oldPlan?.price_monthly || 0)
                ? SUBSCRIPTION_EVENTS.SUBSCRIPTION_UPGRADED
                : SUBSCRIPTION_EVENTS.SUBSCRIPTION_DOWNGRADED;

            await logger.logSubscriptionEvent({
                event_type: eventType,
                user_id: userId,
                subscription_id: existing.id,
                stripe_subscription_id: subscription.id,
                stripe_event_id: event.id,
                plan_id: planId,
                previous_plan_id: oldSubscription.plan_id,
                amount: subscription.items.data[0].price.unit_amount / 100,
                currency: subscription.items.data[0].price.currency,
                metadata: {
                    old_plan: oldPlan?.name,
                    new_plan: newPlan?.name,
                    status: subscription.status
                }
            });
        } else {
            // Regular update
            await logger.logSubscriptionEvent({
                event_type: SUBSCRIPTION_EVENTS.SUBSCRIPTION_UPDATED,
                user_id: userId,
                subscription_id: existing.id,
                stripe_subscription_id: subscription.id,
                stripe_event_id: event.id,
                plan_id: planId,
                metadata: {
                    status: subscription.status,
                    cancel_at_period_end: subscription.cancel_at_period_end
                }
            });
        }
    }
}

async function handleSubscriptionDeleted(db, subscription, event, logger) {
    const userId = subscription.metadata.user_id;

    // Get subscription record
    const sub = await db.getOne(
        'SELECT id, plan_id FROM subscriptions WHERE stripe_subscription_id = $1',
        [subscription.id]
    );

    // Update subscription status to canceled
    await db.query(
        'UPDATE subscriptions SET status = \'canceled\', updated_at = CURRENT_TIMESTAMP WHERE stripe_subscription_id = $1',
        [subscription.id]
    );

    // Log subscription canceled
    await logger.logSubscriptionEvent({
        event_type: SUBSCRIPTION_EVENTS.SUBSCRIPTION_CANCELED,
        user_id: userId,
        subscription_id: sub?.id,
        stripe_subscription_id: subscription.id,
        stripe_event_id: event.id,
        plan_id: sub?.plan_id,
        metadata: {
            reason: subscription.cancellation_details?.reason,
            feedback: subscription.cancellation_details?.feedback,
            canceled_at: subscription.canceled_at
        }
    });
}

async function handleInvoicePaid(db, invoice, event, logger) {
    // This confirms payment success
    console.log(`Invoice paid: ${invoice.id} for subscription ${invoice.subscription}`);

    const userId = invoice.metadata?.user_id || invoice.customer_details?.email;

    // If this is for a credit purchase (check metadata)
    if (invoice.metadata && invoice.metadata.credit_package_id) {
        await handleCreditPurchase(db, invoice, event, logger);
    } else if (invoice.subscription) {
        // Regular subscription payment
        const sub = await db.getOne(
            'SELECT id, plan_id FROM subscriptions WHERE stripe_subscription_id = $1',
            [invoice.subscription]
        );

        await logger.logSubscriptionEvent({
            event_type: SUBSCRIPTION_EVENTS.PAYMENT_SUCCESS,
            user_id: userId,
            subscription_id: sub?.id,
            stripe_subscription_id: invoice.subscription,
            stripe_event_id: event.id,
            plan_id: sub?.plan_id,
            amount: invoice.amount_paid / 100,
            currency: invoice.currency,
            metadata: {
                invoice_number: invoice.number,
                billing_reason: invoice.billing_reason,
                period_start: invoice.period_start,
                period_end: invoice.period_end
            }
        });
    }
}

async function handlePaymentFailed(db, invoice, event, logger) {
    const subscriptionId = invoice.subscription;
    const userId = invoice.metadata?.user_id;

    // Get subscription record
    const sub = await db.getOne(
        'SELECT id, plan_id, user_id FROM subscriptions WHERE stripe_subscription_id = $1',
        [subscriptionId]
    );

    // Update subscription to indicate payment issue
    await db.query(`
        UPDATE subscriptions 
        SET status = 'past_due', updated_at = CURRENT_TIMESTAMP 
        WHERE stripe_subscription_id = $1
    `, [subscriptionId]);

    // Log payment failure
    await logger.logSubscriptionEvent({
        event_type: SUBSCRIPTION_EVENTS.PAYMENT_FAILED,
        user_id: userId || sub?.user_id,
        subscription_id: sub?.id,
        stripe_subscription_id: subscriptionId,
        stripe_event_id: event.id,
        plan_id: sub?.plan_id,
        amount: invoice.amount_due / 100,
        currency: invoice.currency,
        metadata: {
            invoice_number: invoice.number,
            attempt_count: invoice.attempt_count,
            next_payment_attempt: invoice.next_payment_attempt,
            error: invoice.last_finalization_error?.message
        }
    });

    // TODO: Send email notification about payment failure
    console.log(`Payment failed for subscription ${subscriptionId}`);
}

async function handleCheckoutCompleted(db, session, event, logger) {
    const userId = session.metadata?.user_id;

    // Log checkout completed
    await logger.logSubscriptionEvent({
        event_type: SUBSCRIPTION_EVENTS.CHECKOUT_COMPLETED,
        user_id: userId,
        stripe_event_id: event.id,
        amount: session.amount_total / 100,
        currency: session.currency,
        metadata: {
            session_id: session.id,
            mode: session.mode,
            payment_status: session.payment_status,
            customer_email: session.customer_details?.email,
            subscription: session.subscription,
            credit_package_id: session.metadata?.credit_package_id
        }
    });

    // This is handled by subscription.created/updated events
    // But we can use it for one-time purchases like credits
    if (session.metadata && session.metadata.credit_package_id) {
        console.log('Credit purchase checkout completed:', session.id);
    }
}

async function handleTrialWillEnd(db, subscription, event, logger) {
    const userId = subscription.metadata.user_id;

    // Get subscription record
    const sub = await db.getOne(
        'SELECT id, plan_id FROM subscriptions WHERE stripe_subscription_id = $1',
        [subscription.id]
    );

    // Log trial ending soon
    await logger.logSubscriptionEvent({
        event_type: SUBSCRIPTION_EVENTS.TRIAL_ENDING_SOON,
        user_id: userId,
        subscription_id: sub?.id,
        stripe_subscription_id: subscription.id,
        stripe_event_id: event.id,
        plan_id: sub?.plan_id,
        metadata: {
            trial_end: subscription.trial_end,
            days_remaining: 3 // Stripe sends this 3 days before trial end
        }
    });

    // TODO: Send notification email
    console.log(`Trial ending soon for subscription ${subscription.id}`);
}

async function handleCreditPurchase(db, invoice, event, logger) {
    const userId = invoice.metadata.user_id;
    const creditAmount = parseInt(invoice.metadata.credit_amount);

    if (!userId || !creditAmount) {
        console.error('Invalid credit purchase metadata');
        return;
    }

    await db.transaction(async (tx) => {
        // Get current balance
        const user = await tx.query(
            'SELECT credits_balance FROM users WHERE id = $1 FOR UPDATE',
            [userId]
        );

        const currentBalance = user.rows[0].credits_balance;
        const newBalance = currentBalance + creditAmount;

        // Update balance
        await tx.query(
            'UPDATE users SET credits_balance = $1 WHERE id = $2',
            [newBalance, userId]
        );

        // Record transaction
        await tx.query(`
            INSERT INTO credits_transactions 
            (user_id, amount, balance_after, transaction_type, description, stripe_invoice_id)
            VALUES ($1, $2, $3, $4, $5, $6)
        `, [
            userId,
            creditAmount,
            newBalance,
            'purchase',
            `Purchased ${creditAmount} credits`,
            invoice.id
        ]);
    });

    // Log credit purchase
    await logger.logSubscriptionEvent({
        event_type: SUBSCRIPTION_EVENTS.CREDITS_PURCHASED,
        user_id: userId,
        stripe_event_id: event?.id,
        amount: invoice.amount_paid / 100,
        currency: invoice.currency,
        metadata: {
            credit_amount: creditAmount,
            new_balance: newBalance,
            invoice_id: invoice.id,
            package_id: invoice.metadata.credit_package_id
        }
    });
}
