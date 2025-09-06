-- Create database
-- CREATE DATABASE syncstream_db;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('user', 'reseller', 'admin')),
    has_used_trial BOOLEAN DEFAULT FALSE,
    credits_balance INTEGER DEFAULT 0,
    parent_reseller_id UUID REFERENCES users(id) ON DELETE SET NULL,
    stripe_customer_id VARCHAR(255) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Plans table
CREATE TABLE IF NOT EXISTS plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    stripe_product_id VARCHAR(255),
    stripe_price_id VARCHAR(255) UNIQUE,
    stripe_price_id_annual VARCHAR(255) UNIQUE,
    stripe_price_id_lifetime VARCHAR(255) UNIQUE,
    price_monthly DECIMAL(10,2),
    price_annual DECIMAL(10,2),
    price_lifetime DECIMAL(10,2),
    billing_interval VARCHAR(50) DEFAULT 'month',
    billing_interval_count INTEGER DEFAULT 1,
    max_profiles INTEGER DEFAULT 1,
    trial_days INTEGER DEFAULT 3,
    -- Feature columns
    cine_party BOOLEAN DEFAULT FALSE,
    sync_data_across_devices BOOLEAN DEFAULT TRUE,
    record_live_tv BOOLEAN DEFAULT FALSE,
    download_offline_viewing BOOLEAN DEFAULT FALSE,
    parental_controls BOOLEAN DEFAULT TRUE,
    support_level VARCHAR(50) DEFAULT 'email',
    is_active BOOLEAN DEFAULT TRUE,
    is_lifetime_available BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stripe_subscription_id VARCHAR(255) UNIQUE,
    stripe_price_id VARCHAR(255),
    status VARCHAR(50) NOT NULL,
    current_period_start TIMESTAMP,
    current_period_end TIMESTAMP,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    trial_end TIMESTAMP,
    plan_id UUID REFERENCES plans(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL CHECK (LENGTH(TRIM(name)) > 0),
    name_lower VARCHAR(100) GENERATED ALWAYS AS (LOWER(name)) STORED,
    avatar_url VARCHAR(500),
    parental_pin VARCHAR(4), -- Plain text parental PIN
    is_kids_profile BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT NULL, -- Optional, can be updated manually by the app
    
    -- Unique constraint for case-insensitive profile names per user
    CONSTRAINT unique_user_profile_name_case_insensitive UNIQUE (user_id, name_lower)
);

-- Playlists table
CREATE TABLE IF NOT EXISTS playlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    url VARCHAR(500) NOT NULL,
    username VARCHAR(255) NOT NULL,
    password TEXT NOT NULL, -- Plain text
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Favorites table
CREATE TABLE IF NOT EXISTS favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    item_id VARCHAR(255) NOT NULL,
    item_type VARCHAR(50) NOT NULL, -- 'channel', 'movie', 'series'
    item_name VARCHAR(255),
    item_logo VARCHAR(500),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(profile_id, item_id, item_type)
);

-- Watch Progress table
CREATE TABLE IF NOT EXISTS watch_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    item_id VARCHAR(255) NOT NULL,
    item_type VARCHAR(50) NOT NULL,
    progress_seconds INTEGER DEFAULT 0,
    duration_seconds INTEGER,
    last_watched TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed BOOLEAN DEFAULT FALSE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(profile_id, item_id)
);

-- Credits Transactions table
CREATE TABLE IF NOT EXISTS credits_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    balance_after INTEGER NOT NULL,
    transaction_type VARCHAR(50) NOT NULL, -- 'purchase', 'client_created', 'admin_add'
    description TEXT,
    stripe_invoice_id VARCHAR(255),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Idempotency Keys table (for preventing duplicate operations)
CREATE TABLE IF NOT EXISTS idempotency_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(255) UNIQUE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    request_path VARCHAR(500),
    response JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Basic indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer_id ON users(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_playlists_user_id ON playlists(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_profile_id ON favorites(profile_id);
CREATE INDEX IF NOT EXISTS idx_watch_progress_profile_id ON watch_progress(profile_id);
CREATE INDEX IF NOT EXISTS idx_credits_transactions_user_id ON credits_transactions(user_id);

-- Stripe-related indexes
CREATE INDEX IF NOT EXISTS idx_plans_stripe_product_id ON plans(stripe_product_id);
CREATE INDEX IF NOT EXISTS idx_plans_stripe_price_id ON plans(stripe_price_id);
CREATE INDEX IF NOT EXISTS idx_plans_stripe_price_id_annual ON plans(stripe_price_id_annual);
CREATE INDEX IF NOT EXISTS idx_plans_stripe_price_id_lifetime ON plans(stripe_price_id_lifetime);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_price_id ON subscriptions(stripe_price_id);

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
-- TRIGGER FUNCTIONS
-- ============================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Case-insensitive profile name uniqueness now handled by generated column + unique constraint

-- ============================================
-- TRIGGERS
-- ============================================

-- Trigger for plans table
CREATE TRIGGER update_plans_updated_at
    BEFORE UPDATE ON plans
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for users table
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for subscriptions table
CREATE TRIGGER update_subscriptions_updated_at
    BEFORE UPDATE ON subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Profiles table updated_at is now optional and managed by the application

-- Case-insensitive profile name uniqueness now handled by generated column + unique constraint

-- Trigger for playlists table
CREATE TRIGGER update_playlists_updated_at
    BEFORE UPDATE ON playlists
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for watch_progress table
CREATE TRIGGER update_watch_progress_updated_at
    BEFORE UPDATE ON watch_progress
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

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
LEFT JOIN profiles pl ON pl.user_id = u.id
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

-- ============================================
-- INSERT DEFAULT DATA
-- ============================================

-- Insert default plans
INSERT INTO plans (
    name, 
    stripe_price_id, 
    stripe_price_id_annual,
    stripe_price_id_lifetime,
    price_monthly, 
    price_annual,
    price_lifetime,
    max_profiles, 
    trial_days,
    cine_party,
    sync_data_across_devices,
    record_live_tv,
    download_offline_viewing,
    parental_controls,
    support_level,
    is_lifetime_available
)
VALUES 
    ('Basic', 'price_basic_monthly', 'price_basic_annual', NULL, 2.99, 24.00, NULL, 1, 7, false, true, false, false, true, 'email', false),
    ('Family', 'price_family_monthly', 'price_family_annual', 'price_family_lifetime', 5.99, 48.00, 44.99, 5, 7, true, true, true, true, true, 'priority_24_7', true)
ON CONFLICT (stripe_price_id) DO NOTHING;

-- Insert default admin user
-- Password: admin123 (hashed)
INSERT INTO users (email, password_hash, full_name, role)
VALUES (
    'admin@syncstream.tv',
    '$2b$10$CRO86EoArr4y2wX1LeMmJO17lJT/xOf73iBVpMpYV5d1FGcSU9oH6',
    'System Administrator',
    'admin'
)
ON CONFLICT (email) DO NOTHING;

-- Subscription Events Log Table  
CREATE TABLE IF NOT EXISTS subscription_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(100) NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
    stripe_subscription_id VARCHAR(255),
    stripe_event_id VARCHAR(255) UNIQUE,
    plan_id UUID REFERENCES plans(id) ON DELETE SET NULL,
    previous_plan_id UUID REFERENCES plans(id) ON DELETE SET NULL,
    amount DECIMAL(10,2),
    currency VARCHAR(3),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_subscription_events_user_id ON subscription_events(user_id);
CREATE INDEX idx_subscription_events_subscription_id ON subscription_events(subscription_id);
CREATE INDEX idx_subscription_events_event_type ON subscription_events(event_type);
CREATE INDEX idx_subscription_events_created_at ON subscription_events(created_at);
CREATE INDEX idx_subscription_events_stripe_subscription_id ON subscription_events(stripe_subscription_id);
