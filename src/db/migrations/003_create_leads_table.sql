-- Migration: Create leads table for pre-launch waitlist
-- Created: 2026-01-26

CREATE TABLE IF NOT EXISTS leads (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    source VARCHAR(100) NOT NULL,
    vertical VARCHAR(50) NOT NULL,
    referral_code VARCHAR(50),
    ip_address VARCHAR(45),
    user_agent TEXT,
    metadata JSONB DEFAULT '{}',
    subscribed_email BOOLEAN DEFAULT TRUE,
    subscribed_sms BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(email, vertical)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_source ON leads(source);
CREATE INDEX IF NOT EXISTS idx_leads_vertical ON leads(vertical);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);

-- Add a view for analytics
CREATE OR REPLACE VIEW leads_summary AS
SELECT
    vertical,
    source,
    COUNT(*) as total_leads,
    COUNT(CASE WHEN subscribed_email THEN 1 END) as email_subscribers,
    COUNT(CASE WHEN subscribed_sms THEN 1 END) as sms_subscribers,
    DATE(created_at) as signup_date
FROM leads
GROUP BY vertical, source, DATE(created_at)
ORDER BY signup_date DESC, total_leads DESC;

COMMENT ON TABLE leads IS 'Pre-launch waitlist signups from guerrilla marketing campaign';
