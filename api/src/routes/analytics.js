import { Elysia, t } from 'elysia';
import { authPlugin } from '../plugins/auth.js';
import { databasePlugin } from '../plugins/database.js';
import { isFeatureEnabled } from '../utils/env.js';
import { AuthorizationError } from '../utils/errors.js';

export const analyticsRoutes = new Elysia({ prefix: '/analytics' })
    .use(authPlugin)
    .use(databasePlugin)
    .guard({
        beforeHandle: async ({ getUser, set }) => {
            if (!isFeatureEnabled('advanced_analytics')) {
                set.status = 503;
                throw new Error('Analytics feature is not enabled');
            }

            const user = await getUser();
            if (!user || user.role !== 'admin') {
                throw new AuthorizationError('Admin access required for analytics');
            }
        }
    })

    // User Analytics
    .get('/users', async ({ db, query }) => {
        const { startDate, endDate, groupBy = 'day' } = query;

        const dateFilter = startDate && endDate
            ? `WHERE created_at BETWEEN $1 AND $2`
            : 'WHERE created_at >= NOW() - INTERVAL \'30 days\'';

        const params = startDate && endDate ? [startDate, endDate] : [];

        // User growth over time
        const userGrowth = await db.query(`
            SELECT 
                DATE_TRUNC('${groupBy}', created_at) as period,
                COUNT(*) as new_users,
                COUNT(CASE WHEN role = 'reseller' THEN 1 END) as new_resellers,
                COUNT(CASE WHEN has_used_trial THEN 1 END) as trial_users
            FROM users
            ${dateFilter}
            GROUP BY period
            ORDER BY period
        `, params);

        // User demographics
        const demographics = await db.query(`
            SELECT 
                role,
                COUNT(*) as count,
                ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
            FROM users
            GROUP BY role
        `);

        // Active users (users created in last 30 days)
        const activeUsers = await db.query(`
            SELECT 
                COUNT(*) as daily_active,
                DATE_TRUNC('day', created_at) as date
            FROM users
            WHERE created_at >= NOW() - INTERVAL '30 days'
            GROUP BY date
            ORDER BY date
        `);

        return {
            growth: userGrowth.rows,
            demographics: demographics.rows,
            activeUsers: activeUsers.rows,
            summary: {
                totalUsers: demographics.rows.reduce((sum, r) => sum + parseInt(r.count), 0),
                period: startDate && endDate ? 'custom' : 'last_30_days'
            }
        };
    }, {
        query: t.Object({
            startDate: t.Optional(t.String()),
            endDate: t.Optional(t.String()),
            groupBy: t.Optional(t.Union([
                t.Literal('day'),
                t.Literal('week'),
                t.Literal('month')
            ]))
        })
    })

    // Revenue Analytics
    .get('/revenue', async ({ db, query }) => {
        const { startDate, endDate, groupBy = 'month' } = query;

        const dateFilter = startDate && endDate
            ? `AND s.created_at BETWEEN $1 AND $2`
            : 'AND s.created_at >= NOW() - INTERVAL \'12 months\'';

        const params = startDate && endDate ? [startDate, endDate] : [];

        // Revenue over time
        const revenueData = await db.query(`
            SELECT 
                DATE_TRUNC('${groupBy}', s.current_period_start) as period,
                COUNT(DISTINCT s.user_id) as subscribers,
                SUM(p.price_monthly) as revenue,
                AVG(p.price_monthly) as avg_revenue_per_user,
                p.name as plan_name
            FROM subscriptions s
            JOIN plans p ON s.plan_id = p.id
            WHERE s.status = 'active' ${dateFilter}
            GROUP BY period, p.name
            ORDER BY period, p.name
        `, params);

        // Subscription distribution
        const planDistribution = await db.query(`
            SELECT 
                p.name as plan,
                COUNT(s.id) as count,
                SUM(p.price_monthly) as monthly_revenue,
                ROUND(COUNT(s.id) * 100.0 / SUM(COUNT(s.id)) OVER(), 2) as percentage
            FROM subscriptions s
            JOIN plans p ON s.plan_id = p.id
            WHERE s.status = 'active'
            GROUP BY p.name
            ORDER BY monthly_revenue DESC
        `);

        // Churn rate
        const churnData = await db.query(`
            SELECT 
                DATE_TRUNC('month', updated_at) as month,
                COUNT(CASE WHEN status = 'canceled' THEN 1 END) as churned,
                COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
                ROUND(
                    COUNT(CASE WHEN status = 'canceled' THEN 1 END) * 100.0 / 
                    NULLIF(COUNT(*), 0), 2
                ) as churn_rate
            FROM subscriptions
            WHERE updated_at >= NOW() - INTERVAL '12 months'
            GROUP BY month
            ORDER BY month
        `);

        // MRR (Monthly Recurring Revenue)
        const mrrData = await db.query(`
            SELECT 
                SUM(p.price_monthly) as current_mrr,
                COUNT(DISTINCT s.user_id) as paying_customers,
                AVG(p.price_monthly) as arpu
            FROM subscriptions s
            JOIN plans p ON s.plan_id = p.id
            WHERE s.status = 'active'
        `);

        return {
            revenue: revenueData.rows,
            planDistribution: planDistribution.rows,
            churn: churnData.rows,
            mrr: mrrData.rows[0],
            summary: {
                totalRevenue: planDistribution.rows.reduce((sum, r) => sum + parseFloat(r.monthly_revenue || 0), 0),
                averageChurnRate: churnData.rows.reduce((sum, r) => sum + parseFloat(r.churn_rate || 0), 0) / churnData.rows.length
            }
        };
    }, {
        query: t.Object({
            startDate: t.Optional(t.String()),
            endDate: t.Optional(t.String()),
            groupBy: t.Optional(t.Union([
                t.Literal('day'),
                t.Literal('week'),
                t.Literal('month'),
                t.Literal('year')
            ]))
        })
    })

    // Content Analytics
    .get('/content', async ({ db }) => {
        // Most favorited items
        const topFavorites = await db.query(`
            SELECT 
                item_type,
                item_name,
                item_id,
                COUNT(*) as favorite_count
            FROM favorites
            GROUP BY item_type, item_name, item_id
            ORDER BY favorite_count DESC
            LIMIT 20
        `);

        // Watch progress statistics
        const watchStats = await db.query(`
            SELECT 
                item_type,
                COUNT(DISTINCT profile_id) as unique_viewers,
                COUNT(*) as total_views,
                AVG(progress_seconds) as avg_watch_time,
                COUNT(CASE WHEN completed THEN 1 END) as completions,
                ROUND(
                    COUNT(CASE WHEN completed THEN 1 END) * 100.0 / 
                    NULLIF(COUNT(*), 0), 2
                ) as completion_rate
            FROM watch_progress
            GROUP BY item_type
        `);

        // Playlist usage
        const playlistStats = await db.query(`
            SELECT 
                COUNT(*) as total_playlists,
                COUNT(DISTINCT user_id) as unique_users,
                COUNT(CASE WHEN is_active THEN 1 END) as active_playlists,
                AVG(
                    EXTRACT(EPOCH FROM (NOW() - created_at)) / 86400
                ) as avg_playlist_age_days
            FROM playlists
        `);

        // Profile usage
        const profileStats = await db.query(`
            SELECT 
                COUNT(*) as total_profiles,
                COUNT(DISTINCT p.user_id) as users_with_profiles,
                COUNT(CASE WHEN p.is_kids_profile THEN 1 END) as kids_profiles,
                COUNT(CASE WHEN p.parental_pin IS NOT NULL THEN 1 END) as protected_profiles,
                AVG(profiles_per_user) as avg_profiles_per_user
            FROM profiles p
            LEFT JOIN (
                SELECT 
                    user_id,
                    COUNT(*) as profiles_per_user
                FROM profiles
                GROUP BY user_id
            ) user_profiles ON p.user_id = user_profiles.user_id
        `);

        return {
            topFavorites: topFavorites.rows,
            watchStatistics: watchStats.rows,
            playlistUsage: playlistStats.rows[0],
            profileUsage: profileStats.rows[0]
        };
    })

    // Reseller Analytics
    .get('/resellers', async ({ db }) => {
        // Reseller performance
        const resellerStats = await db.query(`
            SELECT 
                r.id,
                r.email,
                r.full_name,
                r.credits_balance,
                COUNT(DISTINCT c.id) as total_clients,
                COUNT(DISTINCT CASE WHEN s.status = 'active' THEN c.id END) as active_clients,
                SUM(CASE WHEN ct.transaction_type = 'client_created' THEN ABS(ct.amount) ELSE 0 END) as credits_used,
                SUM(CASE WHEN ct.transaction_type = 'purchase' THEN ct.amount ELSE 0 END) as credits_purchased
            FROM users r
            LEFT JOIN users c ON c.parent_reseller_id = r.id
            LEFT JOIN subscriptions s ON s.user_id = c.id
            LEFT JOIN credits_transactions ct ON ct.user_id = r.id
            WHERE r.role = 'reseller'
            GROUP BY r.id, r.email, r.full_name, r.credits_balance
            ORDER BY total_clients DESC
        `);

        // Credit transactions summary
        const creditStats = await db.query(`
            SELECT 
                transaction_type,
                COUNT(*) as count,
                SUM(ABS(amount)) as total_amount,
                AVG(ABS(amount)) as avg_amount
            FROM credits_transactions
            GROUP BY transaction_type
        `);

        return {
            resellers: resellerStats.rows,
            creditTransactions: creditStats.rows,
            summary: {
                totalResellers: resellerStats.rows.length,
                totalClients: resellerStats.rows.reduce((sum, r) => sum + parseInt(r.total_clients || 0), 0),
                totalCreditsInCirculation: resellerStats.rows.reduce((sum, r) => sum + parseInt(r.credits_balance || 0), 0)
            }
        };
    })

    // System Performance Analytics
    .get('/performance', async ({ db }) => {
        // Database performance
        const dbStats = await db.query(`
            SELECT 
                schemaname,
                tablename,
                n_live_tup as row_count,
                n_dead_tup as dead_rows,
                last_vacuum,
                last_autovacuum
            FROM pg_stat_user_tables
            ORDER BY n_live_tup DESC
        `);

        // Index usage
        const indexStats = await db.query(`
            SELECT 
                schemaname,
                tablename,
                indexname,
                idx_scan as index_scans,
                idx_tup_read as tuples_read,
                idx_tup_fetch as tuples_fetched
            FROM pg_stat_user_indexes
            ORDER BY idx_scan DESC
            LIMIT 20
        `);

        // Slow queries (if pg_stat_statements is enabled)
        let slowQueries = { rows: [] };
        try {
            slowQueries = await db.query(`
                SELECT 
                    query,
                    calls,
                    mean_exec_time,
                    max_exec_time,
                    total_exec_time
                FROM pg_stat_statements
                WHERE query NOT LIKE '%pg_stat%'
                ORDER BY mean_exec_time DESC
                LIMIT 10
            `);
        } catch (e) {
            // pg_stat_statements might not be enabled
        }

        return {
            tables: dbStats.rows,
            indexes: indexStats.rows,
            slowQueries: slowQueries.rows,
            connectionPool: {
                total: db.pool?.totalCount || 0,
                idle: db.pool?.idleCount || 0,
                waiting: db.pool?.waitingCount || 0
            }
        };
    })

    // Export data for reporting
    .get('/export', async ({ db, query, set }) => {
        const { format = 'json', report } = query;

        let data;
        switch (report) {
            case 'users':
                data = await db.query('SELECT * FROM users ORDER BY created_at DESC');
                break;
            case 'subscriptions':
                data = await db.query(`
                    SELECT s.*, u.email, p.name as plan_name 
                    FROM subscriptions s
                    JOIN users u ON s.user_id = u.id
                    JOIN plans p ON s.plan_id = p.id
                    ORDER BY s.created_at DESC
                `);
                break;
            case 'revenue':
                data = await db.query(`
                    SELECT 
                        DATE_TRUNC('month', s.created_at) as month,
                        COUNT(*) as subscriptions,
                        SUM(p.price_monthly) as revenue
                    FROM subscriptions s
                    JOIN plans p ON s.plan_id = p.id
                    WHERE s.status = 'active'
                    GROUP BY month
                    ORDER BY month
                `);
                break;
            default:
                throw new Error('Invalid report type');
        }

        if (format === 'csv') {
            // Convert to CSV
            const headers = Object.keys(data.rows[0] || {});
            const csv = [
                headers.join(','),
                ...data.rows.map(row =>
                    headers.map(h => JSON.stringify(row[h] ?? '')).join(',')
                )
            ].join('\n');

            set.headers['Content-Type'] = 'text/csv';
            set.headers['Content-Disposition'] = `attachment; filename="${report}-${Date.now()}.csv"`;
            return csv;
        }

        return data.rows;
    }, {
        query: t.Object({
            format: t.Optional(t.Union([t.Literal('json'), t.Literal('csv')])),
            report: t.Union([
                t.Literal('users'),
                t.Literal('subscriptions'),
                t.Literal('revenue')
            ])
        })
    });
