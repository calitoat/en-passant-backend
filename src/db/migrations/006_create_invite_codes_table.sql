-- Migration: 006_create_invite_codes_table.sql
-- Description: Beta invite system for En Passant open beta launch
-- Created: 2026-02-01
--
-- Beta Rules:
-- - QR code scans → instant beta access + 2 invite links
-- - Invite links from friends → instant beta access + 2 invite links
-- - Organic visitors (no code) → waitlist only

-- Invite codes table
CREATE TABLE IF NOT EXISTS invite_codes (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) UNIQUE NOT NULL,
    type VARCHAR(20) NOT NULL,              -- "qr" or "user_invite"
    created_by_user_id UUID REFERENCES users(id),
    used_by_user_id UUID REFERENCES users(id),
    source VARCHAR(100),                    -- For QR: "qr-superbowl-venue"
    is_used BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    used_at TIMESTAMP
);

-- Add columns to users table for beta access tracking
ALTER TABLE users ADD COLUMN IF NOT EXISTS invited_by_code VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS invites_remaining INTEGER DEFAULT 2;
ALTER TABLE users ADD COLUMN IF NOT EXISTS has_beta_access BOOLEAN DEFAULT FALSE;

-- Index for fast code lookups
CREATE INDEX IF NOT EXISTS idx_invite_codes_code ON invite_codes(code);
CREATE INDEX IF NOT EXISTS idx_invite_codes_created_by ON invite_codes(created_by_user_id);
CREATE INDEX IF NOT EXISTS idx_invite_codes_type ON invite_codes(type);
CREATE INDEX IF NOT EXISTS idx_invite_codes_is_used ON invite_codes(is_used);

-- Index for user beta access queries
CREATE INDEX IF NOT EXISTS idx_users_has_beta_access ON users(has_beta_access);
CREATE INDEX IF NOT EXISTS idx_users_invited_by_code ON users(invited_by_code);
