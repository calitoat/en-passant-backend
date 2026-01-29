-- Migration: 004_rank_guard_updates.sql
-- Description: Add Rank Guard features, verification links, and subscriptions tables
-- Created: 2026-01-29

-- Add new columns to auth_badges for Rank Guard features
ALTER TABLE auth_badges ADD COLUMN IF NOT EXISTS vertical VARCHAR(50);
ALTER TABLE auth_badges ADD COLUMN IF NOT EXISTS clearance_level INTEGER DEFAULT 1;

-- Create index for vertical queries
CREATE INDEX IF NOT EXISTS idx_auth_badges_vertical ON auth_badges(vertical);

-- Create shareable verification links table
CREATE TABLE IF NOT EXISTS verification_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    slug VARCHAR(50) UNIQUE NOT NULL,
    custom_slug VARCHAR(50) UNIQUE,
    is_active BOOLEAN DEFAULT TRUE,
    view_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP,
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_verification_links_slug ON verification_links(slug);
CREATE INDEX IF NOT EXISTS idx_verification_links_custom_slug ON verification_links(custom_slug);
CREATE INDEX IF NOT EXISTS idx_verification_links_user_id ON verification_links(user_id);

-- Create subscriptions table for monetization
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    vertical VARCHAR(50) NOT NULL,
    tier VARCHAR(50) NOT NULL,
    price_cents INTEGER NOT NULL,
    stripe_subscription_id VARCHAR(255),
    stripe_customer_id VARCHAR(255),
    status VARCHAR(50) DEFAULT 'active',
    started_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_vertical ON subscriptions(vertical);

-- Add username column to users if not exists (for public verification URLs)
ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(50) UNIQUE;
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
