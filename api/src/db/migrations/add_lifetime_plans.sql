-- Migration to add lifetime plan support
-- This migration adds columns for lifetime pricing

-- Add lifetime-related columns to plans table
ALTER TABLE plans 
ADD COLUMN IF NOT EXISTS stripe_price_id_lifetime VARCHAR(255) UNIQUE,
ADD COLUMN IF NOT EXISTS price_lifetime DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS is_lifetime_available BOOLEAN DEFAULT FALSE;

-- Add index for lifetime price ID
CREATE INDEX IF NOT EXISTS idx_plans_stripe_price_id_lifetime ON plans(stripe_price_id_lifetime);

-- Update existing Family plan to enable lifetime
UPDATE plans 
SET 
    price_lifetime = 44.99,
    is_lifetime_available = true,
    updated_at = CURRENT_TIMESTAMP
WHERE name = 'Family';
