-- Migration: Add email tracking columns to leads table
-- Created: 2026-02-07

-- Add columns for tracking email delivery status
ALTER TABLE leads ADD COLUMN IF NOT EXISTS email_sent BOOLEAN DEFAULT FALSE;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMP;

-- Index for finding leads that haven't received emails
CREATE INDEX IF NOT EXISTS idx_leads_email_sent ON leads(email_sent) WHERE email_sent = FALSE;

COMMENT ON COLUMN leads.email_sent IS 'Whether the confirmation email was successfully sent';
COMMENT ON COLUMN leads.email_sent_at IS 'Timestamp when the confirmation email was sent';
