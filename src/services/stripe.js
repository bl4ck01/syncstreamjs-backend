import Stripe from 'stripe';
import env, { isDevelopment } from '../utils/env.js';
import { StripeError, handleStripeError } from '../utils/errors.js';

// Validate Stripe configuration
const validateStripeConfig = () => {
    if (!env.STRIPE_SECRET_KEY) {
        throw new Error('STRIPE_SECRET_KEY is not configured');
    }

    if (!env.STRIPE_SECRET_KEY.startsWith('sk_')) {
        throw new Error('Invalid STRIPE_SECRET_KEY format');
    }

    if (env.NODE_ENV === 'production' && env.STRIPE_SECRET_KEY.startsWith('sk_test_')) {
        console.warn('⚠️  Using test Stripe key in production environment');
    }

    if (!env.STRIPE_WEBHOOK_SECRET) {
        console.warn('⚠️  STRIPE_WEBHOOK_SECRET is not configured - webhooks will fail');
    }
};

// Initialize Stripe client
let stripe;
try {
    validateStripeConfig();

    stripe = new Stripe(env.STRIPE_SECRET_KEY, {
        apiVersion: env.STRIPE_API_VERSION,
        typescript: false,
        maxNetworkRetries: 3,
        timeout: 30000, // 30 seconds
        telemetry: !isDevelopment(), // Disable telemetry in development
        appInfo: {
            name: 'SyncStream TV',
            version: '1.0.0',
            url: 'https://syncstream.tv'
        }
    });

    console.log('✅ Stripe client initialized');
} catch (error) {
    console.error('❌ Failed to initialize Stripe:', error.message);

    if (env.NODE_ENV === 'production') {
        process.exit(1);
    }
}

// Stripe service wrapper with error handling
export const stripeService = {
    // Customer operations
    async createCustomer(email, metadata = {}) {
        try {
            return await stripe.customers.create({
                email,
                metadata: {
                    ...metadata,
                    created_via: 'api',
                    timestamp: new Date().toISOString()
                }
            });
        } catch (error) {
            handleStripeError(error);
        }
    },

    async getCustomer(customerId) {
        try {
            return await stripe.customers.retrieve(customerId);
        } catch (error) {
            handleStripeError(error);
        }
    },

    async updateCustomer(customerId, updates) {
        try {
            return await stripe.customers.update(customerId, updates);
        } catch (error) {
            handleStripeError(error);
        }
    },

    // Subscription operations
    async createSubscription(customerId, priceId, options = {}) {
        try {
            const subscription = await stripe.subscriptions.create({
                customer: customerId,
                items: [{ price: priceId }],
                payment_behavior: 'default_incomplete',
                payment_settings: {
                    save_default_payment_method: 'on_subscription'
                },
                expand: ['latest_invoice.payment_intent'],
                ...options
            });

            return subscription;
        } catch (error) {
            handleStripeError(error);
        }
    },

    async getSubscription(subscriptionId) {
        try {
            return await stripe.subscriptions.retrieve(subscriptionId, {
                expand: ['customer', 'default_payment_method']
            });
        } catch (error) {
            handleStripeError(error);
        }
    },

    async updateSubscription(subscriptionId, updates) {
        try {
            return await stripe.subscriptions.update(subscriptionId, updates);
        } catch (error) {
            handleStripeError(error);
        }
    },

    async cancelSubscription(subscriptionId, cancelAtPeriodEnd = true) {
        try {
            if (cancelAtPeriodEnd) {
                return await stripe.subscriptions.update(subscriptionId, {
                    cancel_at_period_end: true
                });
            } else {
                return await stripe.subscriptions.cancel(subscriptionId);
            }
        } catch (error) {
            handleStripeError(error);
        }
    },

    // Checkout session
    async createCheckoutSession(options) {
        try {
            const session = await stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                mode: 'subscription',
                allow_promotion_codes: true,
                billing_address_collection: 'auto',
                customer_update: {
                    address: 'auto'
                },
                ...options
            });

            return session;
        } catch (error) {
            handleStripeError(error);
        }
    },

    async getCheckoutSession(sessionId) {
        try {
            return await stripe.checkout.sessions.retrieve(sessionId, {
                expand: ['customer', 'subscription']
            });
        } catch (error) {
            handleStripeError(error);
        }
    },

    // Billing portal
    async createBillingPortalSession(customerId, returnUrl) {
        try {
            return await stripe.billingPortal.sessions.create({
                customer: customerId,
                return_url: returnUrl
            });
        } catch (error) {
            handleStripeError(error);
        }
    },

    // Payment methods
    async listPaymentMethods(customerId) {
        try {
            return await stripe.paymentMethods.list({
                customer: customerId,
                type: 'card'
            });
        } catch (error) {
            handleStripeError(error);
        }
    },

    async detachPaymentMethod(paymentMethodId) {
        try {
            return await stripe.paymentMethods.detach(paymentMethodId);
        } catch (error) {
            handleStripeError(error);
        }
    },

    // Invoices
    async getInvoice(invoiceId) {
        try {
            return await stripe.invoices.retrieve(invoiceId);
        } catch (error) {
            handleStripeError(error);
        }
    },

    async listInvoices(customerId, limit = 10) {
        try {
            return await stripe.invoices.list({
                customer: customerId,
                limit
            });
        } catch (error) {
            handleStripeError(error);
        }
    },

    // Webhook validation
    constructWebhookEvent(payload, signature) {
        try {
            if (!env.STRIPE_WEBHOOK_SECRET) {
                throw new Error('Webhook secret not configured');
            }

            return stripe.webhooks.constructEvent(
                payload,
                signature,
                env.STRIPE_WEBHOOK_SECRET
            );
        } catch (error) {
            throw new StripeError('Webhook signature verification failed', error);
        }
    },

    // Price/Product operations
    async listPrices(options = {}) {
        try {
            return await stripe.prices.list({
                active: true,
                expand: ['data.product'],
                ...options
            });
        } catch (error) {
            handleStripeError(error);
        }
    },

    async getPrice(priceId) {
        try {
            return await stripe.prices.retrieve(priceId, {
                expand: ['product']
            });
        } catch (error) {
            handleStripeError(error);
        }
    },

    // Usage records (for metered billing)
    async createUsageRecord(subscriptionItemId, quantity, timestamp = null) {
        try {
            return await stripe.subscriptionItems.createUsageRecord(
                subscriptionItemId,
                {
                    quantity,
                    timestamp: timestamp || Math.floor(Date.now() / 1000)
                }
            );
        } catch (error) {
            handleStripeError(error);
        }
    },

    // Refunds
    async createRefund(chargeId, amount = null, reason = 'requested_by_customer') {
        try {
            const refundData = {
                charge: chargeId,
                reason
            };

            if (amount) {
                refundData.amount = amount;
            }

            return await stripe.refunds.create(refundData);
        } catch (error) {
            handleStripeError(error);
        }
    }
};

// Health check for Stripe connection
export const checkStripeHealth = async () => {
    try {
        // Try to retrieve account details
        const account = await stripe.account.retrieve();

        return {
            healthy: true,
            account: {
                id: account.id,
                country: account.country,
                default_currency: account.default_currency,
                charges_enabled: account.charges_enabled,
                payouts_enabled: account.payouts_enabled
            }
        };
    } catch (error) {
        return {
            healthy: false,
            error: error.message
        };
    }
};

export default stripeService;
