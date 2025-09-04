-- Database Optimization Script for SyncStream TV
-- Run this after the main schema to add performance optimizations

-- ============================================
-- ADDITIONAL INDEXES FOR PERFORMANCE
-- ============================================

-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_email_lower ON users(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role) WHERE role != 'user';
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_parent_reseller ON users(parent_reseller_id) WHERE parent_reseller_id IS NOT NULL;

-- Subscriptions table indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_period_end ON subscriptions(current_period_end) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_sub ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status ON subscriptions(user_id, status);

-- Profiles table indexes
CREATE INDEX IF NOT EXISTS idx_profiles_user_active ON profiles(user_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_profiles_kids ON profiles(user_id, is_kids_profile) WHERE is_kids_profile = true;

-- Playlists table indexes
CREATE INDEX IF NOT EXISTS idx_playlists_user_active ON playlists(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_playlists_created_at ON playlists(created_at DESC);

-- Favorites table indexes
CREATE INDEX IF NOT EXISTS idx_favorites_profile_type ON favorites(profile_id, item_type);
CREATE INDEX IF NOT EXISTS idx_favorites_item ON favorites(item_id, item_type);
CREATE INDEX IF NOT EXISTS idx_favorites_created_at ON favorites(created_at DESC);

-- Watch progress table indexes
CREATE INDEX IF NOT EXISTS idx_progress_profile_item ON watch_progress(profile_id, item_id);
CREATE INDEX IF NOT EXISTS idx_progress_completed ON watch_progress(profile_id, completed) WHERE completed = false;
CREATE INDEX IF NOT EXISTS idx_progress_updated ON watch_progress(updated_at DESC);

-- Credits transactions table indexes
CREATE INDEX IF NOT EXISTS idx_credits_user_created ON credits_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credits_type ON credits_transactions(transaction_type);

-- Idempotency keys table indexes
CREATE INDEX IF NOT EXISTS idx_idempotency_expires ON idempotency_keys(expires_at) WHERE expires_at > NOW();

-- ============================================
-- PARTIAL INDEXES FOR SPECIFIC QUERIES
-- ============================================

-- Active subscriptions for quick MRR calculation
CREATE INDEX IF NOT EXISTS idx_active_subscriptions 
ON subscriptions(plan_id, status) 
WHERE status = 'active';

-- Trial users
CREATE INDEX IF NOT EXISTS idx_trial_users 
ON users(has_used_trial, created_at) 
WHERE has_used_trial = true;

-- Reseller clients
CREATE INDEX IF NOT EXISTS idx_reseller_clients 
ON users(parent_reseller_id, created_at) 
WHERE parent_reseller_id IS NOT NULL;

-- ============================================
-- COMPOSITE INDEXES FOR COMPLEX QUERIES
-- ============================================

-- For authentication queries
CREATE INDEX IF NOT EXISTS idx_auth_lookup 
ON users(email, password_hash, role);

-- For subscription with plan joins
CREATE INDEX IF NOT EXISTS idx_subscription_plan_lookup 
ON subscriptions(user_id, plan_id, status, current_period_end);

-- For profile selection with PIN check
CREATE INDEX IF NOT EXISTS idx_profile_selection 
ON profiles(id, user_id, parental_pin, is_active);

-- ============================================
-- FUNCTION INDEXES
-- ============================================

-- For case-insensitive email searches
CREATE INDEX IF NOT EXISTS idx_users_email_ci ON users(LOWER(email));

-- For date-based queries
CREATE INDEX IF NOT EXISTS idx_users_created_date ON users(DATE(created_at));
CREATE INDEX IF NOT EXISTS idx_subscriptions_period_date ON subscriptions(DATE(current_period_end));

-- ============================================
-- MATERIALIZED VIEWS FOR ANALYTICS
-- ============================================

-- Daily active users
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_daily_active_users AS
SELECT 
    DATE(created_at) as date,
    COUNT(DISTINCT id) as active_users,
    COUNT(DISTINCT CASE WHEN role = 'reseller' THEN id END) as active_resellers
FROM users
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at);

CREATE UNIQUE INDEX ON mv_daily_active_users(date);

-- Monthly recurring revenue
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_monthly_revenue AS
SELECT 
    DATE_TRUNC('month', s.created_at) as month,
    p.name as plan_name,
    COUNT(s.id) as subscription_count,
    SUM(p.price_monthly) as total_revenue
FROM subscriptions s
JOIN plans p ON s.plan_id = p.id
WHERE s.status = 'active'
GROUP BY DATE_TRUNC('month', s.created_at), p.name;

CREATE UNIQUE INDEX ON mv_monthly_revenue(month, plan_name);

-- User statistics
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_user_stats AS
SELECT 
    u.id as user_id,
    u.email,
    u.role,
    COUNT(DISTINCT pr.id) as profile_count,
    COUNT(DISTINCT pl.id) as playlist_count,
    COUNT(DISTINCT f.id) as favorite_count,
    s.status as subscription_status,
    p.name as plan_name
FROM users u
LEFT JOIN profiles pr ON pr.user_id = u.id
LEFT JOIN playlists pl ON pl.user_id = u.id
LEFT JOIN favorites f ON f.profile_id IN (SELECT id FROM profiles WHERE user_id = u.id)
LEFT JOIN subscriptions s ON s.user_id = u.id AND s.status = 'active'
LEFT JOIN plans p ON p.id = s.plan_id
GROUP BY u.id, u.email, u.role, s.status, p.name;

CREATE UNIQUE INDEX ON mv_user_stats(user_id);
CREATE INDEX ON mv_user_stats(role);
CREATE INDEX ON mv_user_stats(subscription_status);

-- ============================================
-- REFRESH MATERIALIZED VIEWS FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION refresh_materialized_views()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_active_users;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_monthly_revenue;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_user_stats;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- PERFORMANCE TUNING SETTINGS
-- ============================================

-- These should be set at the database level based on your server specs
-- Example for 8GB RAM server:

-- ALTER SYSTEM SET shared_buffers = '2GB';
-- ALTER SYSTEM SET effective_cache_size = '6GB';
-- ALTER SYSTEM SET maintenance_work_mem = '512MB';
-- ALTER SYSTEM SET work_mem = '16MB';
-- ALTER SYSTEM SET max_connections = 200;
-- ALTER SYSTEM SET random_page_cost = 1.1;
-- ALTER SYSTEM SET effective_io_concurrency = 200;
-- ALTER SYSTEM SET wal_buffers = '16MB';
-- ALTER SYSTEM SET default_statistics_target = 100;
-- ALTER SYSTEM SET checkpoint_completion_target = 0.9;
-- ALTER SYSTEM SET max_wal_size = '2GB';
-- ALTER SYSTEM SET min_wal_size = '1GB';

-- ============================================
-- VACUUM AND ANALYZE
-- ============================================

-- Run these periodically for optimal performance
VACUUM ANALYZE users;
VACUUM ANALYZE subscriptions;
VACUUM ANALYZE profiles;
VACUUM ANALYZE playlists;
VACUUM ANALYZE favorites;
VACUUM ANALYZE watch_progress;
VACUUM ANALYZE credits_transactions;

-- ============================================
-- MONITORING QUERIES
-- ============================================

-- Check index usage
CREATE OR REPLACE VIEW v_index_usage AS
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan as index_scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;

-- Check table sizes
CREATE OR REPLACE VIEW v_table_sizes AS
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) as indexes_size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check slow queries (requires pg_stat_statements extension)
-- CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- ============================================
-- SCHEDULED MAINTENANCE (use with pg_cron)
-- ============================================

-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule daily refresh of materialized views
-- SELECT cron.schedule('refresh-views', '0 2 * * *', 'SELECT refresh_materialized_views();');

-- Schedule weekly VACUUM ANALYZE
-- SELECT cron.schedule('vacuum-analyze', '0 3 * * 0', 'VACUUM ANALYZE;');

-- Schedule daily cleanup of expired idempotency keys
-- SELECT cron.schedule('cleanup-idempotency', '0 4 * * *', 'DELETE FROM idempotency_keys WHERE expires_at < NOW();');
