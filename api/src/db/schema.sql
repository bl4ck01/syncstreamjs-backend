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
    price_monthly DECIMAL(10,2),
    price_annual DECIMAL(10,2),
    billing_interval VARCHAR(50) DEFAULT 'month',
    billing_interval_count INTEGER DEFAULT 1,
    max_profiles INTEGER DEFAULT 1,
    max_playlists INTEGER DEFAULT 1,
    max_favorites INTEGER DEFAULT 50,
    trial_days INTEGER DEFAULT 3,
    -- Feature columns
    cine_party BOOLEAN DEFAULT FALSE,
    cine_party_voice_chat BOOLEAN DEFAULT FALSE,
    sync_data_across_devices BOOLEAN DEFAULT TRUE,
    record_live_tv BOOLEAN DEFAULT FALSE,
    download_offline_viewing BOOLEAN DEFAULT FALSE,
    parental_controls BOOLEAN DEFAULT TRUE,
    multi_screen_viewing INTEGER DEFAULT 1,
    support_level VARCHAR(50) DEFAULT 'email',
    is_active BOOLEAN DEFAULT TRUE,
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
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_stripe_customer_id ON users(stripe_customer_id);
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_profiles_user_id ON profiles(user_id);
CREATE INDEX idx_playlists_user_id ON playlists(user_id);
CREATE INDEX idx_favorites_profile_id ON favorites(profile_id);
CREATE INDEX idx_watch_progress_profile_id ON watch_progress(profile_id);
CREATE INDEX idx_credits_transactions_user_id ON credits_transactions(user_id);
CREATE INDEX idx_idempotency_keys_expires_at ON idempotency_keys(expires_at);

-- Stripe-related indexes
CREATE INDEX idx_plans_stripe_product_id ON plans(stripe_product_id);
CREATE INDEX idx_plans_stripe_price_id ON plans(stripe_price_id);
CREATE INDEX idx_plans_stripe_price_id_annual ON plans(stripe_price_id_annual);
CREATE INDEX idx_subscriptions_stripe_subscription_id ON subscriptions(stripe_subscription_id);
CREATE INDEX idx_subscriptions_stripe_price_id ON subscriptions(stripe_price_id);

-- Performance optimization indexes
CREATE INDEX idx_users_email_lower ON users(LOWER(email));
CREATE INDEX idx_users_created_at ON users(created_at DESC);
CREATE INDEX idx_subscriptions_period_end ON subscriptions(current_period_end) WHERE status = 'active';
CREATE INDEX idx_subscriptions_user_status ON subscriptions(user_id, status);
CREATE INDEX idx_profiles_user_active ON profiles(user_id) WHERE is_active = true;
-- Case-insensitive profile name uniqueness now handled by generated column + unique constraint
CREATE INDEX idx_playlists_user_active ON playlists(user_id, is_active);
CREATE INDEX idx_favorites_profile_type ON favorites(profile_id, item_type);
CREATE INDEX idx_favorites_created_at ON favorites(created_at DESC);
CREATE INDEX idx_progress_profile_item ON watch_progress(profile_id, item_id);
CREATE INDEX idx_progress_completed ON watch_progress(profile_id, completed) WHERE completed = false;
CREATE INDEX idx_credits_user_created ON credits_transactions(user_id, created_at DESC);
CREATE INDEX idx_credits_type ON credits_transactions(transaction_type);

-- Composite indexes for complex queries
CREATE INDEX idx_auth_lookup ON users(email, password_hash, role);
CREATE INDEX idx_subscription_plan_lookup ON subscriptions(user_id, plan_id, status, current_period_end);
CREATE INDEX idx_profile_selection ON profiles(id, user_id, parental_pin, is_active);

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
-- INSERT DEFAULT DATA
-- ============================================

-- Insert default plans
INSERT INTO plans (
    name, 
    stripe_price_id, 
    stripe_price_id_annual,
    price_monthly, 
    price_annual,
    max_profiles, 
    max_playlists, 
    max_favorites,
    trial_days,
    cine_party,
    cine_party_voice_chat,
    sync_data_across_devices,
    record_live_tv,
    download_offline_viewing,
    parental_controls,
    multi_screen_viewing,
    support_level
)
VALUES 
    ('Basic', 'price_basic_monthly', 'price_basic_annual', 4.99, 49.99, 3, 2, -1, 3, false, false, true, false, false, true, 1, 'email'),
    ('Pro', 'price_pro_monthly', 'price_pro_annual', 9.99, 99.99, 6, 5, -1, 3, true, false, true, true, true, true, 2, 'email_chat'),
    ('Ultimate', 'price_ultimate_monthly', 'price_ultimate_annual', 14.99, 149.99, -1, -1, -1, 3, true, true, true, true, true, true, 5, 'priority_24_7')
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
