import { databasePlugin } from '../plugins/database.js';

// Security Event Types
export const SECURITY_EVENTS = {
    LOGIN_ATTEMPT: 'login_attempt',
    LOGIN_SUCCESS: 'login_success',
    LOGIN_FAILED: 'login_failed',
    LOGIN_BLOCKED: 'login_blocked', // Too many attempts
    LOGOUT: 'logout',
    REGISTER_ATTEMPT: 'register_attempt',
    REGISTER_SUCCESS: 'register_success',
    REGISTER_FAILED: 'register_failed',
    PASSWORD_RESET_REQUEST: 'password_reset_request',
    PASSWORD_RESET_SUCCESS: 'password_reset_success',
    PASSWORD_RESET_FAILED: 'password_reset_failed',
    TOKEN_EXPIRED: 'token_expired',
    TOKEN_INVALID: 'token_invalid',
    UNAUTHORIZED_ACCESS: 'unauthorized_access',
    PROFILE_PIN_FAILED: 'profile_pin_failed',
    PROFILE_ACCESS_DENIED: 'profile_access_denied',
    SUSPICIOUS_ACTIVITY: 'suspicious_activity',
    API_KEY_CREATED: 'api_key_created',
    API_KEY_REVOKED: 'api_key_revoked'
};

// Subscription Event Types
export const SUBSCRIPTION_EVENTS = {
    // Checkout & Purchase
    CHECKOUT_STARTED: 'checkout_started',
    CHECKOUT_COMPLETED: 'checkout_completed',
    CHECKOUT_FAILED: 'checkout_failed',
    CHECKOUT_ABANDONED: 'checkout_abandoned',
    
    // Subscription Lifecycle
    SUBSCRIPTION_CREATED: 'subscription_created',
    SUBSCRIPTION_ACTIVATED: 'subscription_activated',
    SUBSCRIPTION_UPDATED: 'subscription_updated',
    SUBSCRIPTION_UPGRADED: 'subscription_upgraded',
    SUBSCRIPTION_DOWNGRADED: 'subscription_downgraded',
    SUBSCRIPTION_CANCELED: 'subscription_canceled',
    SUBSCRIPTION_REACTIVATED: 'subscription_reactivated',
    SUBSCRIPTION_EXPIRED: 'subscription_expired',
    SUBSCRIPTION_PAUSED: 'subscription_paused',
    SUBSCRIPTION_RESUMED: 'subscription_resumed',
    
    // Trial
    TRIAL_STARTED: 'trial_started',
    TRIAL_ENDING_SOON: 'trial_ending_soon',
    TRIAL_ENDED: 'trial_ended',
    TRIAL_CONVERTED: 'trial_converted',
    
    // Payment
    PAYMENT_SUCCESS: 'payment_success',
    PAYMENT_FAILED: 'payment_failed',
    PAYMENT_RETRY: 'payment_retry',
    PAYMENT_METHOD_UPDATED: 'payment_method_updated',
    PAYMENT_METHOD_FAILED: 'payment_method_failed',
    REFUND_ISSUED: 'refund_issued',
    CHARGEBACK_CREATED: 'chargeback_created',
    
    // Credits
    CREDITS_PURCHASED: 'credits_purchased',
    CREDITS_APPLIED: 'credits_applied',
    CREDITS_REFUNDED: 'credits_refunded',
    
    // Plan Changes
    PLAN_CHANGE_REQUESTED: 'plan_change_requested',
    PLAN_CHANGE_SCHEDULED: 'plan_change_scheduled',
    PLAN_CHANGE_COMPLETED: 'plan_change_completed',
    PLAN_CHANGE_FAILED: 'plan_change_failed'
};

class Logger {
    constructor(db) {
        this.db = db;
        // In-memory store for rate limiting (since we're not using DB for security events)
        this.failedLogins = new Map(); // email -> { count, firstAttempt }
    }

    /**
     * Extract client info from request
     */
    extractClientInfo(request) {
        const headers = request.headers;
        return {
            ip_address: request.ip || headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                       headers.get('x-real-ip') || 
                       request.ip || 
                       'unknown',
            user_agent: headers.get('user-agent') || 'unknown'
        };
    }

    /**
     * Log security event (console only - non-blocking)
     */
    async logSecurityEvent({
        event_type,
        user_id = null,
        email = null,
        success,
        failure_reason = null,
        metadata = {},
        request = null
    }) {
        // Non-blocking console logging
        setImmediate(() => {
            try {
                const clientInfo = request ? this.extractClientInfo(request) : {};
                const timestamp = new Date().toISOString();
                
                const logData = {
                    timestamp,
                    event_type,
                    user_id,
                    email,
                    success,
                    failure_reason,
                    ip_address: clientInfo.ip_address || metadata.ip_address || null,
                    user_agent: clientInfo.user_agent || metadata.user_agent || null,
                    metadata: {
                        ...metadata,
                        environment: process.env.NODE_ENV || 'development'
                    }
                };

                // Always log security events
                console.log(`[SECURITY] ${event_type}:`, JSON.stringify(logData, null, 2));
            } catch (error) {
                console.error('[SECURITY] Failed to log event:', error);
            }
        });

        // Alert on suspicious activities
        if (event_type === SECURITY_EVENTS.SUSPICIOUS_ACTIVITY || 
            event_type === SECURITY_EVENTS.LOGIN_BLOCKED) {
            setImmediate(() => {
                console.error(`[SECURITY ALERT] ${event_type}:`, {
                    user_id,
                    email,
                    metadata
                });
                // TODO: Send alert email to admins
            });
        }
    }

    /**
     * Log subscription event
     */
    async logSubscriptionEvent({
        event_type,
        user_id,
        subscription_id = null,
        stripe_subscription_id = null,
        stripe_event_id = null,
        plan_id = null,
        previous_plan_id = null,
        amount = null,
        currency = null,
        metadata = {}
    }) {
        try {
            await this.db.insert('subscription_events', {
                event_type,
                user_id,
                subscription_id,
                stripe_subscription_id,
                stripe_event_id,
                plan_id,
                previous_plan_id,
                amount,
                currency,
                metadata: JSON.stringify({
                    ...metadata,
                    timestamp: new Date().toISOString(),
                    environment: process.env.NODE_ENV || 'development'
                })
            });

            // Log to console in development
            if (process.env.NODE_ENV === 'development') {
                console.log(`[SUBSCRIPTION] ${event_type}:`, {
                    user_id,
                    subscription_id,
                    plan_id,
                    amount,
                    currency
                });
            }

            // Alert on critical events
            const criticalEvents = [
                SUBSCRIPTION_EVENTS.PAYMENT_FAILED,
                SUBSCRIPTION_EVENTS.CHARGEBACK_CREATED,
                SUBSCRIPTION_EVENTS.SUBSCRIPTION_CANCELED
            ];

            if (criticalEvents.includes(event_type)) {
                console.warn(`[SUBSCRIPTION ALERT] ${event_type}:`, {
                    user_id,
                    subscription_id,
                    metadata
                });
                // TODO: Send alert email to admins
            }
        } catch (error) {
            console.error('Failed to log subscription event:', error);
            // Don't throw - logging should not break the application
        }
    }

    /**
     * Get security events for a user (returns empty since we don't store in DB)
     */
    async getUserSecurityEvents(user_id, options = {}) {
        // Return empty result since we're only logging to console
        return { rows: [] };
    }

    /**
     * Get subscription events for a user
     */
    async getUserSubscriptionEvents(user_id, options = {}) {
        const { limit = 50, offset = 0, event_type = null } = options;
        
        let query = `
            SELECT * FROM subscription_events 
            WHERE user_id = $1
        `;
        const params = [user_id];
        
        if (event_type) {
            query += ` AND event_type = $${params.length + 1}`;
            params.push(event_type);
        }
        
        query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limit, offset);
        
        return await this.db.query(query, params);
    }

    /**
     * Get recent failed login attempts for rate limiting (in-memory)
     */
    async getRecentFailedLogins(email, minutes = 15) {
        const now = Date.now();
        const windowMs = minutes * 60 * 1000;
        
        // Clean up old entries
        for (const [key, data] of this.failedLogins.entries()) {
            if (now - data.firstAttempt > windowMs) {
                this.failedLogins.delete(key);
            }
        }
        
        const data = this.failedLogins.get(email);
        if (!data) return 0;
        
        // Check if the window has expired
        if (now - data.firstAttempt > windowMs) {
            this.failedLogins.delete(email);
            return 0;
        }
        
        return data.count;
    }
    
    /**
     * Track failed login attempt (in-memory)
     */
    trackFailedLogin(email) {
        const now = Date.now();
        const data = this.failedLogins.get(email);
        
        if (data) {
            data.count++;
        } else {
            this.failedLogins.set(email, { count: 1, firstAttempt: now });
        }
    }

    /**
     * Check for suspicious activity patterns (simplified - no DB dependency)
     */
    async checkSuspiciousActivity(user_id, ip_address) {
        // Since we're not storing IPs in DB, we'll just log the check
        // In production, you might want to use Redis or similar for this
        console.log(`[SECURITY] Suspicious activity check for user ${user_id} from IP ${ip_address}`);
        return false;
    }

    /**
     * Get analytics data for admin dashboard (returns empty since no DB storage)
     */
    async getSecurityAnalytics(days = 7) {
        // Return empty result since we're only logging to console
        return { rows: [] };
    }

    async getSubscriptionAnalytics(days = 7) {
        const query = `
            SELECT 
                event_type,
                COUNT(*) as count,
                SUM(amount) as total_amount,
                DATE(created_at) as date
            FROM subscription_events
            WHERE created_at > NOW() - INTERVAL '${days} days'
            GROUP BY event_type, DATE(created_at)
            ORDER BY date DESC, count DESC
        `;
        
        return await this.db.query(query);
    }
}

// Export a factory function to create logger instances
export function createLogger(db) {
    return new Logger(db);
}

// Export the logger instance for singleton use
let loggerInstance = null;

export function getLogger(db) {
    if (!loggerInstance) {
        loggerInstance = createLogger(db);
    }
    return loggerInstance;
}
