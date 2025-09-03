import { Elysia, t } from 'elysia';
import { authPlugin } from '../plugins/auth.js';
import { databasePlugin } from '../plugins/database.js';
import { adminAddCreditsSchema, createPlanSchema, updatePlanSchema, idParamSchema, searchPaginationSchema } from '../utils/schemas.js';
import { createLogger } from '../services/logger.js';

export const adminRoutes = new Elysia({ prefix: '/admin' })
    .use(authPlugin)
    .use(databasePlugin)
    .derive(({ db }) => ({
        logger: createLogger(db)
    }))
    .guard({
        beforeHandle: async ({ getUser, set }) => {
            const user = await getUser();
            if (!user || user.role !== 'admin') {
                set.status = 403;
                throw new Error('Forbidden: Admin access required');
            }
        }
    })

    // Get all users
    .get('/users', async ({ db, query }) => {
        const { page = 1, limit = 20, search } = query;
        const offset = (page - 1) * limit;

        let whereClause = '';
        const params = [limit, offset];

        if (search) {
            whereClause = 'WHERE email ILIKE $3 OR full_name ILIKE $3';
            params.push(`%${search}%`);
        }

        const users = await db.getMany(`
            SELECT 
                id, email, full_name, role,
                has_used_trial, credits_balance, 
                parent_reseller_id, created_at
            FROM users 
            ${whereClause}
            ORDER BY created_at DESC
            LIMIT $1 OFFSET $2
        `, params);

        const totalResult = await db.getOne(`
            SELECT COUNT(*) as total FROM users ${whereClause}
        `, search ? [`%${search}%`] : []);

        return {
            users,
            total: parseInt(totalResult.total),
            page,
            limit,
            pages: Math.ceil(totalResult.total / limit)
        };
    }, {
        query: searchPaginationSchema
    })

    // Get user details with subscription
    .get('/users/:id', async ({ params, db }) => {
        const userId = params.id;

        const user = await db.getOne(`
            SELECT 
                u.*,
                s.status as subscription_status,
                s.current_period_end,
                p.name as plan_name
            FROM users u
            LEFT JOIN subscriptions s ON u.id = s.user_id AND s.status = 'active'
            LEFT JOIN plans p ON s.plan_id = p.id
            WHERE u.id = $1
        `, [userId]);

        if (!user) {
            throw new Error('User not found');
        }

        // Remove sensitive data
        delete user.password_hash;

        return user;
    })

    // Manage plans
    .get('/plans', async ({ db }) => {
        const plans = await db.getMany(
            'SELECT * FROM plans ORDER BY price_monthly',
            []
        );

        return plans;
    })

    // Create new plan
    .post('/plans', async ({ body, db }) => {
        const plan = await db.insert('plans', body);
        return plan;
    }, {
        body: createPlanSchema
    })

    // Update plan
    .patch('/plans/:id', async ({ params, body, db }) => {
        const plan = await db.update('plans', params.id, body);
        if (!plan) {
            throw new Error('Plan not found');
        }
        return plan;
    }, {
        params: idParamSchema,
        body: updatePlanSchema
    })

    // Add credits to user (manual)
    .post('/credits/add', async ({ body, db, getUser }) => {
        const admin = await getUser();
        const { user_id, amount, description } = body;

        const result = await db.transaction(async (tx) => {
            // Lock user row and get current balance
            const user = await tx.query(
                'SELECT id, credits_balance FROM users WHERE id = $1 FOR UPDATE',
                [user_id]
            );

            if (user.rows.length === 0) {
                throw new Error('User not found');
            }

            const currentBalance = user.rows[0].credits_balance;
            const newBalance = currentBalance + amount;

            // Update balance
            await tx.query(
                'UPDATE users SET credits_balance = $1 WHERE id = $2',
                [newBalance, user_id]
            );

            // Record transaction
            const transaction = await tx.query(`
                INSERT INTO credits_transactions 
                (user_id, amount, balance_after, transaction_type, description, metadata)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING *
            `, [
                user_id,
                amount,
                newBalance,
                'admin_add',
                description || `Admin (${admin.email}) added ${amount} credits`,
                { admin_id: admin.id, admin_email: admin.email }
            ]);

            return {
                transaction: transaction.rows[0],
                new_balance: newBalance
            };
        });

        return result;
    }, {
        body: adminAddCreditsSchema
    })

    // Get system statistics
    .get('/stats', async ({ db }) => {
        const stats = {};

        // User stats
        const userStats = await db.getOne(`
            SELECT 
                COUNT(*) as total_users,
                COUNT(CASE WHEN role = 'reseller' THEN 1 END) as total_resellers,
                COUNT(CASE WHEN role = 'admin' THEN 1 END) as total_admins,
                COUNT(CASE WHEN has_used_trial = TRUE THEN 1 END) as trials_used
            FROM users
        `);

        // Subscription stats
        const subStats = await db.getOne(`
            SELECT 
                COUNT(CASE WHEN status = 'active' THEN 1 END) as active_subscriptions,
                COUNT(CASE WHEN status = 'trialing' THEN 1 END) as trial_subscriptions,
                COUNT(CASE WHEN status = 'past_due' THEN 1 END) as past_due_subscriptions
            FROM subscriptions
        `);

        // Revenue stats (simplified)
        const revenueStats = await db.getOne(`
            SELECT 
                COUNT(DISTINCT s.user_id) as paying_users,
                SUM(p.price_monthly) as mrr
            FROM subscriptions s
            JOIN plans p ON s.plan_id = p.id
            WHERE s.status = 'active' AND p.price_monthly > 0
        `);

        return {
            users: {
                total: parseInt(userStats.total_users),
                resellers: parseInt(userStats.total_resellers),
                admins: parseInt(userStats.total_admins),
                trials_used: parseInt(userStats.trials_used)
            },
            subscriptions: {
                active: parseInt(subStats.active_subscriptions),
                trialing: parseInt(subStats.trial_subscriptions),
                past_due: parseInt(subStats.past_due_subscriptions)
            },
            revenue: {
                paying_users: parseInt(revenueStats.paying_users),
                mrr: parseFloat(revenueStats.mrr || 0)
            }
        };
    })

    // Update user role
    .patch('/users/:id/role', async ({ params, body, db }) => {
        const { role } = body;

        await db.query(
            'UPDATE users SET role = $1 WHERE id = $2',
            [role, params.id]
        );

        return { message: `User role updated to ${role}` };
    }, {
        params: idParamSchema,
        body: t.Object({
            role: t.Union([
                t.Literal('user'),
                t.Literal('reseller'),
                t.Literal('admin')
            ])
        })
<<<<<<< Current (Your changes)
=======
    })

    // Get security events
    .get('/logs/security', async ({ query, db, logger }) => {
        const { 
            page = 1, 
            limit = 50, 
            user_id, 
            email, 
            event_type,
            success,
            start_date,
            end_date,
            ip_address
        } = query;
        
        const offset = (page - 1) * limit;
        let conditions = [];
        let params = [];
        let paramCount = 0;

        if (user_id) {
            conditions.push(`user_id = $${++paramCount}`);
            params.push(user_id);
        }
        
        if (email) {
            conditions.push(`email ILIKE $${++paramCount}`);
            params.push(`%${email}%`);
        }
        
        if (event_type) {
            conditions.push(`event_type = $${++paramCount}`);
            params.push(event_type);
        }
        
        if (success !== undefined) {
            conditions.push(`success = $${++paramCount}`);
            params.push(success === 'true');
        }
        
        if (start_date) {
            conditions.push(`created_at >= $${++paramCount}`);
            params.push(new Date(start_date));
        }
        
        if (end_date) {
            conditions.push(`created_at <= $${++paramCount}`);
            params.push(new Date(end_date));
        }
        
        if (ip_address) {
            conditions.push(`ip_address = $${++paramCount}`);
            params.push(ip_address);
        }
        
        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        
        // Get total count
        const countResult = await db.getOne(
            `SELECT COUNT(*) as total FROM security_events ${whereClause}`,
            params
        );
        
        // Get events
        params.push(limit);
        params.push(offset);
        
        const events = await db.query(`
            SELECT 
                se.*,
                u.email as user_email,
                u.full_name as user_name
            FROM security_events se
            LEFT JOIN users u ON se.user_id = u.id
            ${whereClause}
            ORDER BY se.created_at DESC
            LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
        `, params);
        
        return {
            success: true,
            data: {
                events: events.rows,
                total: parseInt(countResult.total),
                page,
                limit,
                total_pages: Math.ceil(countResult.total / limit)
            }
        };
    })

    // Get subscription events
    .get('/logs/subscriptions', async ({ query, db, logger }) => {
        const { 
            page = 1, 
            limit = 50, 
            user_id,
            subscription_id,
            event_type,
            plan_id,
            start_date,
            end_date
        } = query;
        
        const offset = (page - 1) * limit;
        let conditions = [];
        let params = [];
        let paramCount = 0;

        if (user_id) {
            conditions.push(`se.user_id = $${++paramCount}`);
            params.push(user_id);
        }
        
        if (subscription_id) {
            conditions.push(`se.subscription_id = $${++paramCount}`);
            params.push(subscription_id);
        }
        
        if (event_type) {
            conditions.push(`se.event_type = $${++paramCount}`);
            params.push(event_type);
        }
        
        if (plan_id) {
            conditions.push(`(se.plan_id = $${++paramCount} OR se.previous_plan_id = $${paramCount})`);
            params.push(plan_id);
        }
        
        if (start_date) {
            conditions.push(`se.created_at >= $${++paramCount}`);
            params.push(new Date(start_date));
        }
        
        if (end_date) {
            conditions.push(`se.created_at <= $${++paramCount}`);
            params.push(new Date(end_date));
        }
        
        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        
        // Get total count
        const countResult = await db.getOne(
            `SELECT COUNT(*) as total FROM subscription_events se ${whereClause}`,
            params
        );
        
        // Get events
        params.push(limit);
        params.push(offset);
        
        const events = await db.query(`
            SELECT 
                se.*,
                u.email as user_email,
                u.full_name as user_name,
                p.name as plan_name,
                pp.name as previous_plan_name
            FROM subscription_events se
            LEFT JOIN users u ON se.user_id = u.id
            LEFT JOIN plans p ON se.plan_id = p.id
            LEFT JOIN plans pp ON se.previous_plan_id = pp.id
            ${whereClause}
            ORDER BY se.created_at DESC
            LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
        `, params);
        
        return {
            success: true,
            data: {
                events: events.rows,
                total: parseInt(countResult.total),
                page,
                limit,
                total_pages: Math.ceil(countResult.total / limit)
            }
        };
    })

    // Get security analytics
    .get('/analytics/security', async ({ query, logger }) => {
        const { days = 7 } = query;
        
        const analytics = await logger.getSecurityAnalytics(days);
        
        // Group by event type and calculate success rates
        const summary = {};
        analytics.rows.forEach(row => {
            if (!summary[row.event_type]) {
                summary[row.event_type] = {
                    total: 0,
                    success: 0,
                    failed: 0
                };
            }
            
            summary[row.event_type].total += parseInt(row.count);
            if (row.success) {
                summary[row.event_type].success += parseInt(row.count);
            } else {
                summary[row.event_type].failed += parseInt(row.count);
            }
        });
        
        // Calculate success rates
        Object.keys(summary).forEach(eventType => {
            const s = summary[eventType];
            s.success_rate = s.total > 0 ? (s.success / s.total * 100).toFixed(2) : 0;
        });
        
        return {
            success: true,
            data: {
                summary,
                daily_breakdown: analytics.rows,
                period_days: days
            }
        };
    })

    // Get subscription analytics
    .get('/analytics/subscriptions', async ({ query, logger }) => {
        const { days = 7 } = query;
        
        const analytics = await logger.getSubscriptionAnalytics(days);
        
        // Calculate revenue and event summaries
        const summary = {
            total_revenue: 0,
            total_events: 0,
            events_by_type: {}
        };
        
        analytics.rows.forEach(row => {
            summary.total_events += parseInt(row.count);
            summary.total_revenue += parseFloat(row.total_amount || 0);
            
            if (!summary.events_by_type[row.event_type]) {
                summary.events_by_type[row.event_type] = {
                    count: 0,
                    revenue: 0
                };
            }
            
            summary.events_by_type[row.event_type].count += parseInt(row.count);
            summary.events_by_type[row.event_type].revenue += parseFloat(row.total_amount || 0);
        });
        
        return {
            success: true,
            data: {
                summary,
                daily_breakdown: analytics.rows,
                period_days: days
            }
        };
    })

    // Get user activity logs
    .get('/users/:id/activity', async ({ params, query, db, logger }) => {
        const userId = params.id;
        const { type = 'all', limit = 100 } = query;
        
        let securityEvents = [];
        let subscriptionEvents = [];
        
        if (type === 'all' || type === 'security') {
            const security = await logger.getUserSecurityEvents(userId, { limit });
            securityEvents = security.rows.map(e => ({ ...e, log_type: 'security' }));
        }
        
        if (type === 'all' || type === 'subscription') {
            const subscription = await logger.getUserSubscriptionEvents(userId, { limit });
            subscriptionEvents = subscription.rows.map(e => ({ ...e, log_type: 'subscription' }));
        }
        
        // Merge and sort by created_at
        const allEvents = [...securityEvents, ...subscriptionEvents]
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .slice(0, limit);
        
        return {
            success: true,
            data: {
                user_id: userId,
                events: allEvents,
                total: allEvents.length
            }
        };
>>>>>>> Incoming (Background Agent changes)
    });
