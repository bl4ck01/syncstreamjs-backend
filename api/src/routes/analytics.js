import { Elysia, t } from 'elysia';
import { authPlugin } from '../plugins/auth.js';
import { databasePlugin } from '../plugins/database.js';
import { authMiddleware, userContextMiddleware, roleMiddleware } from '../middleware/auth.js';
import { isFeatureEnabled } from '../utils/env.js';

export const analyticsRoutes = new Elysia({ prefix: '/analytics' })
    .use(authPlugin)
    .use(databasePlugin)
    .guard({
        beforeHandle: ({ set }) => {
            if (!isFeatureEnabled('advanced_analytics')) {
                set.status = 503;
                throw new Error('Analytics feature is not enabled');
            }
        }
    })
    .use(authMiddleware)
    .use(userContextMiddleware)
    .use(roleMiddleware(['admin'])) // Apply role check to all analytics routes

    // User Analytics - OPTIMIZED with single query
    .get('/users', async ({ db, query }) => {
        const { startDate, endDate, groupBy = 'day' } = query;

        const dateFilter = startDate && endDate
            ? `WHERE created_at BETWEEN $1 AND $2`
            : 'WHERE created_at >= NOW() - INTERVAL \'30 days\'';

        const params = startDate && endDate ? [startDate, endDate] : [];

        // All user analytics in one query
        const analyticsData = await db.getOne(`
            WITH user_growth AS (
                SELECT 
                    DATE_TRUNC('${groupBy}', created_at) as period,
                    COUNT(*) as new_users,
                    COUNT(CASE WHEN role = 'reseller' THEN 1 END) as new_resellers,
                    COUNT(CASE WHEN has_used_trial THEN 1 END) as trial_users
                FROM users
                ${dateFilter}
                GROUP BY period
            ),
            demographics AS (
                SELECT 
                    role,
                    COUNT(*) as count,
                    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
                FROM users
                GROUP BY role
            ),
            daily_active AS (
                SELECT 
                    COUNT(*) as daily_active,
                    DATE_TRUNC('day', created_at) as date
                FROM users
                WHERE created_at >= NOW() - INTERVAL '30 days'
                GROUP BY date
            )
            SELECT 
                (SELECT json_agg(row_to_json(ug.*) ORDER BY period) FROM user_growth ug) as growth,
                (SELECT json_agg(row_to_json(d.*)) FROM demographics d) as demographics,
                (SELECT json_agg(row_to_json(da.*) ORDER BY date) FROM daily_active da) as active_users,
                (SELECT COUNT(*) FROM users) as total_users
        `, params);

        return {
            growth: analyticsData.growth || [],
            demographics: analyticsData.demographics || [],
            activeUsers: analyticsData.active_users || [],
            summary: {
                totalUsers: analyticsData.total_users,
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

    // Revenue Analytics - OPTIMIZED
    .get('/revenue', async ({ db, query }) => {
        const { startDate, endDate, groupBy = 'month' } = query;

        const dateFilter = startDate && endDate
            ? `AND s.created_at BETWEEN $1 AND $2`
            : 'AND s.created_at >= NOW() - INTERVAL \'12 months\'';

        const params = startDate && endDate ? [startDate, endDate] : [];

        // Comprehensive revenue analytics in one query
        const revenueData = await db.getOne(`
            WITH revenue_over_time AS (
                SELECT 
                    DATE_TRUNC('${groupBy}', s.created_at) as period,
                    SUM(CASE 
                        WHEN p.billing_interval = 'month' THEN p.price_monthly
                        WHEN p.billing_interval = 'year' THEN p.price_annual / 12
                        ELSE 0 
                    END) as revenue,
                    COUNT(DISTINCT s.user_id) as subscribers,
                    AVG(CASE 
                        WHEN p.billing_interval = 'month' THEN p.price_monthly
                        WHEN p.billing_interval = 'year' THEN p.price_annual / 12
                        ELSE 0 
                    END) as arpu
                FROM subscriptions s
                JOIN plans p ON s.plan_id = p.id
                WHERE s.status IN ('active', 'trialing') ${dateFilter}
                GROUP BY period
            ),
            plan_breakdown AS (
                SELECT 
                    p.name as plan_name,
                    COUNT(s.id) as subscriber_count,
                    SUM(CASE 
                        WHEN p.billing_interval = 'month' THEN p.price_monthly
                        WHEN p.billing_interval = 'year' THEN p.price_annual / 12
                        ELSE 0 
                    END) as mrr
                FROM subscriptions s
                JOIN plans p ON s.plan_id = p.id
                WHERE s.status = 'active'
                GROUP BY p.name, p.price_monthly
            ),
            churn_metrics AS (
                SELECT 
                    DATE_TRUNC('month', s.updated_at) as month,
                    COUNT(CASE WHEN s.status = 'canceled' THEN 1 END) as churned,
                    COUNT(*) as total,
                    ROUND(COUNT(CASE WHEN s.status = 'canceled' THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0), 2) as churn_rate
                FROM subscriptions s
                WHERE s.updated_at >= NOW() - INTERVAL '6 months'
                GROUP BY month
            ),
            current_mrr AS (
                SELECT 
                    SUM(CASE 
                        WHEN p.billing_interval = 'month' THEN p.price_monthly
                        WHEN p.billing_interval = 'year' THEN p.price_annual / 12
                        ELSE 0 
                    END) as total_mrr,
                    COUNT(DISTINCT s.user_id) as active_subscribers
                FROM subscriptions s
                JOIN plans p ON s.plan_id = p.id
                WHERE s.status = 'active'
            )
            SELECT 
                (SELECT json_agg(row_to_json(rot.*) ORDER BY period) FROM revenue_over_time rot) as revenue_trend,
                (SELECT json_agg(row_to_json(pb.*) ORDER BY mrr DESC) FROM plan_breakdown pb) as plan_breakdown,
                (SELECT json_agg(row_to_json(cm.*) ORDER BY month) FROM churn_metrics cm) as churn_data,
                (SELECT row_to_json(cmrr.*) FROM current_mrr cmrr) as current_metrics
        `, params);

        return {
            revenueTrend: revenueData.revenue_trend || [],
            planBreakdown: revenueData.plan_breakdown || [],
            churnData: revenueData.churn_data || [],
            currentMetrics: revenueData.current_metrics || { total_mrr: 0, active_subscribers: 0 },
            summary: {
                period: startDate && endDate ? 'custom' : 'last_12_months'
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

    // Subscription Analytics - OPTIMIZED
    .get('/subscriptions', async ({ db }) => {
        const analyticsData = await db.getOne(`
            WITH status_breakdown AS (
                SELECT 
                    status,
                    COUNT(*) as count,
                    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
                FROM subscriptions
                WHERE status != 'incomplete'
                GROUP BY status
            ),
            trial_conversion AS (
                SELECT 
                    COUNT(CASE WHEN status = 'active' AND trial_end IS NOT NULL THEN 1 END) as converted_trials,
                    COUNT(CASE WHEN trial_end IS NOT NULL THEN 1 END) as total_trials,
                    ROUND(
                        COUNT(CASE WHEN status = 'active' AND trial_end IS NOT NULL THEN 1 END) * 100.0 / 
                        NULLIF(COUNT(CASE WHEN trial_end IS NOT NULL THEN 1 END), 0), 
                        2
                    ) as conversion_rate
                FROM subscriptions
            ),
            lifetime_value AS (
                SELECT 
                    AVG(EXTRACT(EPOCH FROM (COALESCE(s.canceled_at, NOW()) - s.created_at)) / 2592000) as avg_lifetime_months,
                    AVG(
                        EXTRACT(EPOCH FROM (COALESCE(s.canceled_at, NOW()) - s.created_at)) / 2592000 * 
                        CASE 
                            WHEN p.billing_interval = 'month' THEN p.price_monthly
                            WHEN p.billing_interval = 'year' THEN p.price_annual / 12
                            ELSE 0 
                        END
                    ) as avg_ltv
                FROM subscriptions s
                JOIN plans p ON s.plan_id = p.id
                WHERE s.status IN ('active', 'canceled')
            ),
            growth_metrics AS (
                SELECT 
                    DATE_TRUNC('month', created_at) as month,
                    COUNT(*) as new_subscriptions,
                    SUM(COUNT(*)) OVER (ORDER BY DATE_TRUNC('month', created_at)) as cumulative_total
                FROM subscriptions
                WHERE created_at >= NOW() - INTERVAL '12 months'
                GROUP BY month
            )
            SELECT 
                (SELECT json_agg(row_to_json(sb.*)) FROM status_breakdown sb) as status_breakdown,
                (SELECT row_to_json(tc.*) FROM trial_conversion tc) as trial_conversion,
                (SELECT row_to_json(lv.*) FROM lifetime_value lv) as lifetime_value,
                (SELECT json_agg(row_to_json(gm.*) ORDER BY month) FROM growth_metrics gm) as growth_metrics
        `);

        return {
            statusBreakdown: analyticsData.status_breakdown || [],
            trialConversion: analyticsData.trial_conversion || {},
            lifetimeValue: analyticsData.lifetime_value || {},
            growthMetrics: analyticsData.growth_metrics || []
        };
    })

    // Usage Analytics - OPTIMIZED
    .get('/usage', async ({ db }) => {
        const usageData = await db.getOne(`
            WITH profile_usage AS (
                SELECT 
                    u.id as user_id,
                    COUNT(p.id) as profile_count,
                    s.plan_id,
                    pl.max_profiles,
                    ROUND(COUNT(p.id) * 100.0 / NULLIF(pl.max_profiles, 0), 2) as usage_percentage
                FROM users u
                LEFT JOIN profiles p ON u.id = p.user_id AND p.is_active = true
                LEFT JOIN subscriptions s ON u.id = s.user_id AND s.status IN ('active', 'trialing')
                LEFT JOIN plans pl ON s.plan_id = pl.id
                WHERE s.id IS NOT NULL
                GROUP BY u.id, s.plan_id, pl.max_profiles
            ),
            feature_adoption AS (
                SELECT 
                    COUNT(DISTINCT u.id) as total_users,
                    COUNT(DISTINCT CASE WHEN p.id IS NOT NULL THEN u.id END) as users_with_profiles,
                    COUNT(DISTINCT CASE WHEN pl.id IS NOT NULL THEN u.id END) as users_with_playlists,
                    COUNT(DISTINCT CASE WHEN f.profile_id IS NOT NULL THEN u.id END) as users_with_favorites,
                    ROUND(COUNT(DISTINCT CASE WHEN p.id IS NOT NULL THEN u.id END) * 100.0 / COUNT(DISTINCT u.id), 2) as profile_adoption,
                    ROUND(COUNT(DISTINCT CASE WHEN pl.id IS NOT NULL THEN u.id END) * 100.0 / COUNT(DISTINCT u.id), 2) as playlist_adoption,
                    ROUND(COUNT(DISTINCT CASE WHEN f.profile_id IS NOT NULL THEN u.id END) * 100.0 / COUNT(DISTINCT u.id), 2) as favorite_adoption
                FROM users u
                LEFT JOIN profiles p ON u.id = p.user_id AND p.is_active = true
                LEFT JOIN playlists pl ON u.id = pl.user_id AND pl.is_active = true
                LEFT JOIN favorites f ON p.id = f.profile_id
                WHERE EXISTS (SELECT 1 FROM subscriptions s WHERE s.user_id = u.id AND s.status IN ('active', 'trialing'))
            ),
            avg_usage AS (
                SELECT 
                    AVG(profile_count) as avg_profiles_per_user,
                    AVG(usage_percentage) as avg_profile_usage,
                    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY profile_count) as median_profiles,
                    MAX(profile_count) as max_profiles_created
                FROM profile_usage
            )
            SELECT 
                (SELECT row_to_json(fa.*) FROM feature_adoption fa) as feature_adoption,
                (SELECT row_to_json(au.*) FROM avg_usage au) as average_usage,
                (SELECT json_agg(json_build_object(
                    'usage_range', 
                    CASE 
                        WHEN usage_percentage = 0 THEN '0%'
                        WHEN usage_percentage <= 25 THEN '1-25%'
                        WHEN usage_percentage <= 50 THEN '26-50%'
                        WHEN usage_percentage <= 75 THEN '51-75%'
                        WHEN usage_percentage <= 100 THEN '76-100%'
                        ELSE '>100%'
                    END,
                    'user_count', COUNT(*)
                )) FROM profile_usage GROUP BY 
                    CASE 
                        WHEN usage_percentage = 0 THEN '0%'
                        WHEN usage_percentage <= 25 THEN '1-25%'
                        WHEN usage_percentage <= 50 THEN '26-50%'
                        WHEN usage_percentage <= 75 THEN '51-75%'
                        WHEN usage_percentage <= 100 THEN '76-100%'
                        ELSE '>100%'
                    END) as usage_distribution
        `);

        return {
            featureAdoption: usageData.feature_adoption || {},
            averageUsage: usageData.average_usage || {},
            usageDistribution: usageData.usage_distribution || []
        };
    });
