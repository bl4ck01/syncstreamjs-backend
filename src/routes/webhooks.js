import { Elysia, t } from 'elysia';
import { databasePlugin } from '../plugins/database.js';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const webhookRoutes = new Elysia({ prefix: '/webhooks' })
    .use(databasePlugin)

    // Stripe webhook handler
    .post('/stripe', async ({ request, db, set }) => {
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
                    await handleSubscriptionUpdate(db, subscription, event);
                    break;
                }

                case 'customer.subscription.deleted': {
                    const subscription = event.data.object;
                    await handleSubscriptionDeleted(db, subscription);
                    break;
                }

                case 'customer.subscription.trial_will_end': {
                    const subscription = event.data.object;
                    await handleTrialWillEnd(db, subscription);
                    break;
                }

                case 'invoice.paid': {
                    const invoice = event.data.object;
                    await handleInvoicePaid(db, invoice);
                    break;
                }

                case 'invoice.payment_failed': {
                    const invoice = event.data.object;
                    await handlePaymentFailed(db, invoice);
                    break;
                }

                case 'checkout.session.completed': {
                    const session = event.data.object;
                    await handleCheckoutCompleted(db, session);
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
async function handleSubscriptionUpdate(db, subscription, event) {
    const userId = subscription.metadata.user_id;
    const planId = subscription.metadata.plan_id;

    if (!userId) {
        console.error('No user_id in subscription metadata');
        return;
    }

    // Simple logging
    console.log(`[WEBHOOK] Subscription update: ${subscription.id} for user: ${userId}`);

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

            console.log(`[WEBHOOK] Trial started for user: ${userId}`);
        }

        console.log(`[WEBHOOK] Subscription created: ${subscription.id}`);
        
        // Check if this is an upgrade/downgrade
        const oldSubscription = await db.getOne(
            'SELECT plan_id, stripe_price_id FROM subscriptions WHERE stripe_subscription_id = $1',
            [subscription.id]
        );

        if (oldSubscription && oldSubscription.stripe_price_id !== subscription.items.data[0].price.id) {
            const oldPlan = await db.getOne('SELECT * FROM plans WHERE id = $1', [oldSubscription.plan_id]);
            const newPlan = plan;

            const isUpgrade = (newPlan?.price_monthly || 0) > (oldPlan?.price_monthly || 0);
            console.log(`[WEBHOOK] Plan ${isUpgrade ? 'upgraded' : 'downgraded'} for subscription: ${subscription.id}`);
        } else {
            // Regular update
            console.log(`[WEBHOOK] Subscription updated: ${subscription.id}, status: ${subscription.status}`);
        }
    }
}

async function handleSubscriptionDeleted(db, subscription) {
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
    console.log(`[WEBHOOK] Subscription canceled: ${subscription.id}`);
}

async function handleInvoicePaid(db, invoice) {
    // This confirms payment success
    console.log(`Invoice paid: ${invoice.id} for subscription ${invoice.subscription}`);

    const userId = invoice.metadata?.user_id || invoice.customer_details?.email;

    // If this is for a credit purchase (check metadata)
    if (invoice.metadata && invoice.metadata.credit_package_id) {
        await handleCreditPurchase(db, invoice);
    } else if (invoice.subscription) {
        // Regular subscription payment
        const sub = await db.getOne(
            'SELECT id, plan_id FROM subscriptions WHERE stripe_subscription_id = $1',
            [invoice.subscription]
        );

        console.log(`[WEBHOOK] Payment successful for subscription: ${invoice.subscription}, amount: ${invoice.amount_paid / 100} ${invoice.currency}`);
    }
}

async function handlePaymentFailed(db, invoice) {
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
    console.log(`[WEBHOOK] Payment failed for subscription: ${subscriptionId}, amount: ${invoice.amount_due / 100} ${invoice.currency}`);

    // TODO: Send email notification about payment failure
    console.log(`Payment failed for subscription ${subscriptionId}`);
}

async function handleCheckoutCompleted(db, session) {
    const userId = session.metadata?.user_id;

    // Log checkout completed
    console.log(`[WEBHOOK] Checkout completed: ${session.id}, amount: ${session.amount_total / 100} ${session.currency}`);

    // This is handled by subscription.created/updated events
    // But we can use it for one-time purchases like credits
    if (session.metadata && session.metadata.credit_package_id) {
        console.log('Credit purchase checkout completed:', session.id);
    }
}

async function handleTrialWillEnd(db, subscription) {
    const userId = subscription.metadata.user_id;

    // Get subscription record
    const sub = await db.getOne(
        'SELECT id, plan_id FROM subscriptions WHERE stripe_subscription_id = $1',
        [subscription.id]
    );

    // Log trial ending soon
    console.log(`[WEBHOOK] Trial ending soon for subscription: ${subscription.id}`);

    // TODO: Send notification email
    console.log(`Trial ending soon for subscription ${subscription.id}`);
}

async function handleCreditPurchase(db, invoice) {
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
    console.log(`[WEBHOOK] Credits purchased: ${creditAmount} credits for user ${userId}, new balance: ${newBalance}`);
}
