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
                    await handleSubscriptionUpdate(db, subscription);
                    break;
                }
                
                case 'customer.subscription.deleted': {
                    const subscription = event.data.object;
                    await handleSubscriptionDeleted(db, subscription);
                    break;
                }
                
                case 'customer.subscription.trial_will_end': {
                    const subscription = event.data.object;
                    // Send notification email (implement email service)
                    console.log(`Trial ending soon for subscription ${subscription.id}`);
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
async function handleSubscriptionUpdate(db, subscription) {
    const userId = subscription.metadata.user_id;
    const planId = subscription.metadata.plan_id;
    
    if (!userId) {
        console.error('No user_id in subscription metadata');
        return;
    }
    
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
        }
    }
}

async function handleSubscriptionDeleted(db, subscription) {
    // Update subscription status to canceled
    await db.query(
        'UPDATE subscriptions SET status = \'canceled\', updated_at = CURRENT_TIMESTAMP WHERE stripe_subscription_id = $1',
        [subscription.id]
    );
}

async function handleInvoicePaid(db, invoice) {
    // This confirms payment success
    console.log(`Invoice paid: ${invoice.id} for subscription ${invoice.subscription}`);
    
    // If this is for a credit purchase (check metadata)
    if (invoice.metadata && invoice.metadata.credit_package_id) {
        await handleCreditPurchase(db, invoice);
    }
}

async function handlePaymentFailed(db, invoice) {
    const subscriptionId = invoice.subscription;
    
    // Update subscription to indicate payment issue
    await db.query(`
        UPDATE subscriptions 
        SET status = 'past_due', updated_at = CURRENT_TIMESTAMP 
        WHERE stripe_subscription_id = $1
    `, [subscriptionId]);
    
    // TODO: Send email notification about payment failure
    console.log(`Payment failed for subscription ${subscriptionId}`);
}

async function handleCheckoutCompleted(db, session) {
    // This is handled by subscription.created/updated events
    // But we can use it for one-time purchases like credits
    if (session.metadata && session.metadata.credit_package_id) {
        console.log('Credit purchase checkout completed:', session.id);
    }
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
}
