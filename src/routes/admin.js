import { Elysia, t } from 'elysia';
import { authPlugin } from '../plugins/auth.js';
import { databasePlugin } from '../plugins/database.js';
import { adminAddCreditsSchema, createPlanSchema, updatePlanSchema, idParamSchema, searchPaginationSchema } from '../utils/schemas.js';

export const adminRoutes = new Elysia({ prefix: '/admin' })
    .use(authPlugin)
    .use(databasePlugin)
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
    });
