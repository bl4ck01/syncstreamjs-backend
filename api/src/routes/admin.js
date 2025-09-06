import { Elysia, t } from 'elysia';
import { authPlugin } from '../plugins/auth.js';
import { databasePlugin } from '../plugins/database.js';
import { authMiddleware, userContextMiddleware, roleMiddleware } from '../middleware/auth.js';
import { adminAddCreditsSchema, createPlanSchema, updatePlanSchema, idParamSchema, searchPaginationSchema } from '../utils/schemas.js';

export const adminRoutes = new Elysia({ prefix: '/admin' })
    .use(authPlugin)
    .use(databasePlugin)
    .use(authMiddleware)
    .use(userContextMiddleware)
    .use(roleMiddleware(['admin'])) // Apply role check to all admin routes

    // Get all users - OPTIMIZED with better pagination
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

    // Get user details with subscription - OPTIMIZED with single query
    .get('/users/:id', async ({ params, db }) => {
        const userId = params.id;

        // Single query to get user with subscription and profiles
        const user = await db.getOne(`
            WITH user_subscription AS (
                SELECT 
                    u.*,
                    s.status as subscription_status,
                    s.current_period_end,
                    s.current_period_start,
                    s.cancel_at_period_end,
                    s.trial_end,
                    s.stripe_subscription_id,
                    s.stripe_price_id,
                    p.name as plan_name,
                    p.max_profiles,
                    p.price_monthly
                FROM users u
                LEFT JOIN subscriptions s ON u.id = s.user_id 
                    AND s.status IN ('active', 'trialing', 'canceled', 'past_due')
                LEFT JOIN plans p ON s.plan_id = p.id
                WHERE u.id = $1
            ),
            profile_stats AS (
                SELECT 
                    user_id,
                    COUNT(*) as profile_count,
                    json_agg(json_build_object(
                        'id', id,
                        'name', name,
                        'avatar_url', avatar_url,
                        'is_kids_profile', is_kids_profile,
                        'created_at', created_at
                    ) ORDER BY created_at) as profiles
                FROM profiles
                WHERE user_id = $1 AND is_active = true
                GROUP BY user_id
            ),
            playlist_stats AS (
                SELECT 
                    user_id,
                    COUNT(*) as playlist_count,
                    json_agg(json_build_object(
                        'id', id,
                        'name', name,
                        'url', url,
                        'is_active', is_active,
                        'created_at', created_at
                    ) ORDER BY created_at) as playlists
                FROM playlists
                WHERE user_id = $1 AND is_active = true
                GROUP BY user_id
            ),
            favorite_stats AS (
                SELECT 
                    p.user_id,
                    COUNT(DISTINCT f.id) as favorite_count,
                    json_object_agg(
                        p.name, 
                        COALESCE((
                            SELECT COUNT(*) 
                            FROM favorites f2 
                            WHERE f2.profile_id = p.id
                        ), 0)
                    ) as favorites_by_profile
                FROM profiles p
                LEFT JOIN favorites f ON p.id = f.profile_id
                WHERE p.user_id = $1 AND p.is_active = true
                GROUP BY p.user_id
            )
            SELECT 
                us.*,
                COALESCE(ps.profile_count, 0) as profile_count,
                COALESCE(ps.profiles, '[]'::json) as profiles,
                COALESCE(pls.playlist_count, 0) as playlist_count,
                COALESCE(pls.playlists, '[]'::json) as playlists,
                COALESCE(fs.favorite_count, 0) as favorite_count,
                COALESCE(fs.favorites_by_profile, '{}'::json) as favorites_by_profile
            FROM user_subscription us
            LEFT JOIN profile_stats ps ON us.id = ps.user_id
            LEFT JOIN playlist_stats pls ON us.id = pls.user_id
            LEFT JOIN favorite_stats fs ON us.id = fs.user_id
        `, [userId]);

        if (!user) {
            throw new Error('User not found');
        }

        // Remove sensitive data
        delete user.password_hash;

        return {
            success: true,
            data: user
        };
    }, {
        params: idParamSchema
    })

    // Plans management - Get all plans
    .get('/plans', async ({ db }) => {
        const plans = await db.getMany(
            'SELECT * FROM plans ORDER BY price_monthly',
            []
        );

        return {
            success: true,
            data: plans
        };
    })

    // Create new plan
    .post('/plans', async ({ body, db }) => {
        const plan = await db.insert('plans', body);

        return {
            success: true,
            message: 'Plan created successfully',
            data: plan
        };
    }, {
        body: createPlanSchema
    })

    // Update plan
    .put('/plans/:id', async ({ params, body, db }) => {
        const plan = await db.update('plans', params.id, body);

        if (!plan) {
            throw new Error('Plan not found');
        }

        return {
            success: true,
            message: 'Plan updated successfully',
            data: plan
        };
    }, {
        params: idParamSchema,
        body: updatePlanSchema
    })

    // Delete plan (soft delete)
    .delete('/plans/:id', async ({ params, db }) => {
        const plan = await db.update('plans', params.id, { is_active: false });

        if (!plan) {
            throw new Error('Plan not found');
        }

        return {
            success: true,
            message: 'Plan deleted successfully'
        };
    }, {
        params: idParamSchema
    })

    // Add credits to reseller - OPTIMIZED with transaction
    .post('/credits/add', async ({ body, db }) => {
        const { user_id, amount, description } = body;

        const result = await db.transaction(async (client) => {
            // Lock user row and get current balance
            const userResult = await client.query(
                'SELECT credits_balance, role FROM users WHERE id = $1 FOR UPDATE',
                [user_id]
            );

            if (!userResult.rows[0]) {
                throw new Error('User not found');
            }

            if (userResult.rows[0].role !== 'reseller') {
                throw new Error('Credits can only be added to reseller accounts');
            }

            const currentBalance = userResult.rows[0].credits_balance;
            const newBalance = currentBalance + amount;

            // Update balance
            await client.query(
                'UPDATE users SET credits_balance = $1 WHERE id = $2',
                [newBalance, user_id]
            );

            // Record transaction
            const transaction = await client.query(
                `INSERT INTO credits_transactions 
                 (user_id, amount, type, description, balance_after)
                 VALUES ($1, $2, $3, $4, $5)
                 RETURNING *`,
                [
                    user_id,
                    amount,
                    amount > 0 ? 'credit' : 'debit',
                    description || `Manual ${amount > 0 ? 'credit' : 'debit'} by admin`,
                    newBalance
                ]
            );

            return {
                transaction: transaction.rows[0],
                previous_balance: currentBalance,
                new_balance: newBalance
            };
        });

        return {
            success: true,
            message: 'Credits added successfully',
            data: result
        };
    }, {
        body: adminAddCreditsSchema
    })

    // Dashboard stats - OPTIMIZED with single query
    .get('/dashboard', async ({ db }) => {
        const stats = await db.getOne(`
            WITH user_stats AS (
                SELECT 
                    COUNT(*) as total_users,
                    COUNT(CASE WHEN role = 'reseller' THEN 1 END) as total_resellers,
                    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as new_users_30d,
                    COUNT(CASE WHEN has_used_trial THEN 1 END) as trial_users
                FROM users
            ),
            subscription_stats AS (
                SELECT 
                    COUNT(*) as active_subscriptions,
                    COUNT(CASE WHEN status = 'trialing' THEN 1 END) as trial_subscriptions,
                    COUNT(CASE WHEN status = 'past_due' THEN 1 END) as past_due_subscriptions,
                    SUM(CASE 
                        WHEN p.price_monthly IS NOT NULL AND s.status = 'active' 
                        THEN p.price_monthly 
                        ELSE 0 
                    END) as mrr
                FROM subscriptions s
                LEFT JOIN plans p ON s.plan_id = p.id
                WHERE s.status IN ('active', 'trialing', 'past_due')
            ),
            revenue_stats AS (
                SELECT 
                    COUNT(*) as total_transactions,
                    SUM(amount) as total_revenue_30d
                FROM credits_transactions
                WHERE created_at >= NOW() - INTERVAL '30 days' AND type = 'credit'
            )
            SELECT 
                us.total_users,
                us.total_resellers,
                us.new_users_30d,
                us.trial_users,
                COALESCE(ss.active_subscriptions, 0) as active_subscriptions,
                COALESCE(ss.trial_subscriptions, 0) as trial_subscriptions,
                COALESCE(ss.past_due_subscriptions, 0) as past_due_subscriptions,
                COALESCE(ss.mrr, 0) as mrr,
                COALESCE(rs.total_transactions, 0) as total_transactions,
                COALESCE(rs.total_revenue_30d, 0) as total_revenue_30d
            FROM user_stats us
            CROSS JOIN subscription_stats ss
            CROSS JOIN revenue_stats rs
        `);

        // Get recent activities
        const recentActivities = await db.getMany(`
            SELECT 
                'subscription' as type,
                s.created_at,
                u.email,
                p.name as plan_name,
                s.status
            FROM subscriptions s
            JOIN users u ON s.user_id = u.id
            JOIN plans p ON s.plan_id = p.id
            ORDER BY s.created_at DESC
            LIMIT 10
        `);

        return {
            success: true,
            data: {
                stats,
                recent_activities: recentActivities
            }
        };
    })

    // Impersonate user (generate token)
    .post('/users/:id/impersonate', async ({ params, db, signToken }) => {
        const userId = params.id;

        const user = await db.getOne(
            'SELECT id, email FROM users WHERE id = $1',
            [userId]
        );

        if (!user) {
            throw new Error('User not found');
        }

        // Generate token for the user
        const token = await signToken(user.id, user.email);

        return {
            success: true,
            message: 'Impersonation token generated',
            data: {
                token,
                user_id: user.id,
                email: user.email
            }
        };
    }, {
        params: idParamSchema
    });
