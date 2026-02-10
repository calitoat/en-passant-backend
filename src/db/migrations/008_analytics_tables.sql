-- Migration: 008_analytics_tables.sql
-- Description: Analytics tracking for QR scans, page views, user attribution, and conversion events
-- Created: 2026-02-09

-- =============================================
-- SCAN EVENTS TABLE
-- Track every QR code scan (page load) BEFORE signup
-- This is the missing piece: tracks scans vs redemptions
-- =============================================
CREATE TABLE IF NOT EXISTS scan_events (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20),                  -- EP-XXXXX-XXXXX invite code (nullable for non-code scans)
    source VARCHAR(100),               -- qr-superbowl-entrance, qr-marina-coffee, etc.
    session_id VARCHAR(100),           -- Browser session fingerprint
    ip_address VARCHAR(45),
    user_agent TEXT,
    referrer TEXT,
    landing_page VARCHAR(255),         -- /tickets, /join, etc.
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scan_events_source ON scan_events(source);
CREATE INDEX IF NOT EXISTS idx_scan_events_code ON scan_events(code);
CREATE INDEX IF NOT EXISTS idx_scan_events_session ON scan_events(session_id);
CREATE INDEX IF NOT EXISTS idx_scan_events_date ON scan_events(created_at);

-- =============================================
-- USER ATTRIBUTION TABLE
-- Track where each registered user came from
-- =============================================
CREATE TABLE IF NOT EXISTS user_attribution (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    source VARCHAR(100),               -- qr-superbowl-entrance, twitter-launch, direct
    campaign VARCHAR(100),             -- superbowl, launch, guerrilla
    medium VARCHAR(50),                -- poster, qr, social, organic
    content VARCHAR(100),              -- A/B test variant
    landing_page VARCHAR(255),         -- /tickets, /apartments, etc.
    referrer TEXT,                      -- Full referrer URL
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_attribution_source ON user_attribution(source);
CREATE INDEX IF NOT EXISTS idx_attribution_campaign ON user_attribution(campaign);
CREATE INDEX IF NOT EXISTS idx_attribution_medium ON user_attribution(medium);

-- =============================================
-- PAGE VIEWS TABLE
-- Track page visits for funnel analysis
-- =============================================
CREATE TABLE IF NOT EXISTS page_views (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(100) NOT NULL,
    source VARCHAR(100),
    campaign VARCHAR(100),
    medium VARCHAR(50),
    landing_page VARCHAR(255) NOT NULL,
    referrer TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pageviews_session ON page_views(session_id);
CREATE INDEX IF NOT EXISTS idx_pageviews_source ON page_views(source);
CREATE INDEX IF NOT EXISTS idx_pageviews_date ON page_views(created_at);

-- =============================================
-- CONVERSION EVENTS TABLE
-- Track key actions (signup, invite_redeem, badge_generate, listing_create)
-- =============================================
CREATE TABLE IF NOT EXISTS conversion_events (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,   -- signup, invite_redeem, badge_generate, listing_create
    vertical VARCHAR(50),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_user ON conversion_events(user_id);
CREATE INDEX IF NOT EXISTS idx_events_type ON conversion_events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_date ON conversion_events(created_at);

-- =============================================
-- ANALYTICS VIEWS
-- Pre-built views for common dashboard queries
-- =============================================

-- QR scan funnel: scans -> signups -> conversions by source
CREATE OR REPLACE VIEW qr_funnel AS
SELECT
    s.source,
    COUNT(DISTINCT s.session_id) as total_scans,
    COUNT(DISTINCT ic.used_by_user_id) as total_redemptions,
    ROUND(
        100.0 * COUNT(DISTINCT ic.used_by_user_id) / NULLIF(COUNT(DISTINCT s.session_id), 0),
        1
    ) as scan_to_redeem_pct,
    DATE(s.created_at) as scan_date
FROM scan_events s
LEFT JOIN invite_codes ic ON ic.source = s.source AND ic.is_used = TRUE
WHERE s.source LIKE 'qr-%'
GROUP BY s.source, DATE(s.created_at)
ORDER BY scan_date DESC, total_scans DESC;

-- Daily signups summary
CREATE OR REPLACE VIEW daily_signups AS
SELECT
    DATE(u.created_at) as signup_date,
    COUNT(*) as signups,
    COUNT(CASE WHEN u.has_beta_access THEN 1 END) as beta_users,
    COUNT(CASE WHEN ua.source LIKE 'qr-%' THEN 1 END) as from_qr,
    COUNT(CASE WHEN ua.source IS NULL OR ua.source = 'direct' THEN 1 END) as organic
FROM users u
LEFT JOIN user_attribution ua ON u.id = ua.user_id
GROUP BY DATE(u.created_at)
ORDER BY signup_date DESC;
