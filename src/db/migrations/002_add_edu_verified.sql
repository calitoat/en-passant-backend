-- Add .edu email verification support
-- Migration: 002_add_edu_verified
-- Created: 2026-01-26

-- Add is_edu_verified column to identity_anchors
-- This tracks whether the connected email is from an educational institution
ALTER TABLE identity_anchors
ADD COLUMN IF NOT EXISTS is_edu_verified BOOLEAN DEFAULT FALSE;

-- Add index for querying edu-verified anchors
CREATE INDEX IF NOT EXISTS idx_identity_anchors_edu_verified ON identity_anchors(is_edu_verified) WHERE is_edu_verified = TRUE;
