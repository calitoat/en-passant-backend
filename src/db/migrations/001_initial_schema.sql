-- TrustBridge Initial Schema
-- Migration: 001_initial_schema
-- Created: 2024

-- Users table: Core user accounts
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    email_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE
);

-- Identity anchors: Connected identity providers (Gmail, LinkedIn, etc.)
CREATE TABLE IF NOT EXISTS identity_anchors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL, -- 'gmail', 'linkedin'
    provider_user_id VARCHAR(255) NOT NULL, -- External ID from provider

    -- Identity metadata for trust scoring
    account_created_at TIMESTAMP WITH TIME ZONE, -- When the external account was created
    email_address VARCHAR(255), -- For Gmail
    connection_count INTEGER, -- For LinkedIn
    profile_url VARCHAR(500),

    -- Raw metadata from provider (JSON for flexibility)
    metadata JSONB DEFAULT '{}',

    -- Timestamps
    connected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_verified_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Ensure one anchor per provider per user
    UNIQUE(user_id, provider)
);

-- Auth badges: Cryptographically signed identity badges
CREATE TABLE IF NOT EXISTS auth_badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Badge content
    trust_score INTEGER NOT NULL CHECK (trust_score >= 0 AND trust_score <= 100),
    score_breakdown JSONB NOT NULL, -- Detailed scoring breakdown

    -- Cryptographic signature
    signature TEXT NOT NULL, -- Base64-encoded Ed25519 signature
    public_key_id VARCHAR(64) NOT NULL, -- Identifier for the signing key

    -- Validity
    issued_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    revoked_at TIMESTAMP WITH TIME ZONE,
    revocation_reason VARCHAR(255),

    -- Badge identifier (for verification lookups)
    badge_token VARCHAR(64) UNIQUE NOT NULL -- Short token for API lookups
);

-- Badge verifications: Audit log of verification requests
CREATE TABLE IF NOT EXISTS badge_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    badge_id UUID NOT NULL REFERENCES auth_badges(id) ON DELETE CASCADE,

    -- Verification context
    verifier_ip VARCHAR(45), -- IPv4 or IPv6
    verifier_user_agent TEXT,
    platform_id VARCHAR(100), -- Optional: which platform requested verification

    -- Result
    verification_result VARCHAR(20) NOT NULL, -- 'valid', 'expired', 'revoked', 'invalid_signature'
    verified_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_identity_anchors_user_id ON identity_anchors(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_badges_user_id ON auth_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_badges_badge_token ON auth_badges(badge_token);
CREATE INDEX IF NOT EXISTS idx_auth_badges_expires_at ON auth_badges(expires_at);
CREATE INDEX IF NOT EXISTS idx_badge_verifications_badge_id ON badge_verifications(badge_id);
CREATE INDEX IF NOT EXISTS idx_badge_verifications_verified_at ON badge_verifications(verified_at);

-- Migration tracking table
CREATE TABLE IF NOT EXISTS _migrations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
