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
    }

    /**
     * Extract client info from request
     */
    extractClientInfo(request) {
        const headers = request.headers;
        return {
            ip_address: headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                       headers.get('x-real-ip') || 
                       request.ip || 
                       'unknown',
            user_agent: headers.get('user-agent') || 'unknown'
        };
    }

    /**
     * Log security event
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
        try {
            const clientInfo = request ? this.extractClientInfo(request) : {};
            
            await this.db.insert('security_events', {
                event_type,
                user_id,
                email,
                ip_address: clientInfo.ip_address || metadata.ip_address || null,
                user_agent: clientInfo.user_agent || metadata.user_agent || null,
                success,
                failure_reason,
                metadata: JSON.stringify({
                    ...metadata,
                    timestamp: new Date().toISOString(),
                    environment: process.env.NODE_ENV || 'development'
                })
            });

            // Log to console in development
            if (process.env.NODE_ENV === 'development') {
                console.log(`[SECURITY] ${event_type}:`, {
                    user_id,
                    email,
                    success,
                    failure_reason,
                    ip: clientInfo.ip_address
                });
            }

            // Alert on suspicious activities
            if (event_type === SECURITY_EVENTS.SUSPICIOUS_ACTIVITY || 
                event_type === SECURITY_EVENTS.LOGIN_BLOCKED) {
                console.error(`[SECURITY ALERT] ${event_type}:`, {
                    user_id,
                    email,
                    ip: clientInfo.ip_address,
                    metadata
                });
                // TODO: Send alert email to admins
            }
        } catch (error) {
            console.error('Failed to log security event:', error);
            // Don't throw - logging should not break the application
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
     * Get security events for a user
     */
    async getUserSecurityEvents(user_id, options = {}) {
        const { limit = 50, offset = 0, event_type = null } = options;
        
        let query = `
            SELECT * FROM security_events 
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
     * Get recent failed login attempts for rate limiting
     */
    async getRecentFailedLogins(email, minutes = 15) {
        const query = `
            SELECT COUNT(*) as count
            FROM security_events
            WHERE email = $1
            AND event_type IN ($2, $3)
            AND success = false
            AND created_at > NOW() - INTERVAL '${minutes} minutes'
        `;
        
        const result = await this.db.query(query, [
            email,
            SECURITY_EVENTS.LOGIN_FAILED,
            SECURITY_EVENTS.LOGIN_BLOCKED
        ]);
        
        return parseInt(result.rows[0]?.count || 0);
    }

    /**
     * Check for suspicious activity patterns
     */
    async checkSuspiciousActivity(user_id, ip_address) {
        // Check for multiple IPs in short time
        const recentIPs = await this.db.query(`
            SELECT DISTINCT ip_address
            FROM security_events
            WHERE user_id = $1
            AND created_at > NOW() - INTERVAL '1 hour'
            AND ip_address IS NOT NULL
        `, [user_id]);

        if (recentIPs.rows.length > 5) {
            await this.logSecurityEvent({
                event_type: SECURITY_EVENTS.SUSPICIOUS_ACTIVITY,
                user_id,
                success: false,
                failure_reason: 'Multiple IP addresses detected',
                metadata: {
                    ip_count: recentIPs.rows.length,
                    current_ip: ip_address,
                    recent_ips: recentIPs.rows.map(r => r.ip_address)
                }
            });
            return true;
        }

        return false;
    }

    /**
     * Get analytics data for admin dashboard
     */
    async getSecurityAnalytics(days = 7) {
        const query = `
            SELECT 
                event_type,
                success,
                COUNT(*) as count,
                DATE(created_at) as date
            FROM security_events
            WHERE created_at > NOW() - INTERVAL '${days} days'
            GROUP BY event_type, success, DATE(created_at)
            ORDER BY date DESC, count DESC
        `;
        
        return await this.db.query(query);
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
