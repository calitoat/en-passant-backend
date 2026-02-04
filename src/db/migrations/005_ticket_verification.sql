-- Migration: 005_ticket_verification.sql
-- Description: Add ticket verification tables for face-value price cap enforcement
-- Created: 2026-02-01

-- Event price ceilings - Official face values by event and section
CREATE TABLE IF NOT EXISTS event_price_ceilings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id VARCHAR(100) NOT NULL,
    event_name VARCHAR(255) NOT NULL,
    event_date TIMESTAMP NOT NULL,
    venue_name VARCHAR(255),
    section_pattern VARCHAR(100) NOT NULL,  -- e.g., '400-Level Corners', 'Floor/Field'
    max_price_cents INTEGER NOT NULL,       -- Face value in cents
    currency VARCHAR(3) DEFAULT 'USD',
    source VARCHAR(100),                    -- 'official', 'ticketmaster', 'manual'
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(event_id, section_pattern)
);

CREATE INDEX IF NOT EXISTS idx_event_price_ceilings_event_id ON event_price_ceilings(event_id);
CREATE INDEX IF NOT EXISTS idx_event_price_ceilings_event_date ON event_price_ceilings(event_date);

-- Receipt uploads - Uploaded receipt files
CREATE TABLE IF NOT EXISTS receipt_uploads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    s3_key VARCHAR(500) NOT NULL,
    original_filename VARCHAR(255),
    mime_type VARCHAR(100),
    file_size_bytes INTEGER,
    file_hash VARCHAR(64),                  -- SHA256 hash for duplicate detection
    upload_status VARCHAR(50) DEFAULT 'pending',  -- pending, processing, completed, failed
    created_at TIMESTAMP DEFAULT NOW(),
    processed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_receipt_uploads_user_id ON receipt_uploads(user_id);
CREATE INDEX IF NOT EXISTS idx_receipt_uploads_file_hash ON receipt_uploads(file_hash);
CREATE INDEX IF NOT EXISTS idx_receipt_uploads_status ON receipt_uploads(upload_status);

-- Receipt OCR results - Extracted data from receipts
CREATE TABLE IF NOT EXISTS receipt_ocr_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_id UUID REFERENCES receipt_uploads(id) ON DELETE CASCADE,
    vendor VARCHAR(100),                    -- ticketmaster, axs, seatgeek, stubhub, etc.
    event_name VARCHAR(255),
    event_date TIMESTAMP,
    venue_name VARCHAR(255),
    section VARCHAR(100),
    row_name VARCHAR(50),
    seat_numbers VARCHAR(100),
    face_value_cents INTEGER,
    fees_cents INTEGER,
    total_cents INTEGER,
    quantity INTEGER DEFAULT 1,
    raw_text TEXT,                          -- Full OCR text for debugging
    confidence_score DECIMAL(5,4),          -- 0.0000 to 1.0000
    extraction_method VARCHAR(50),          -- 'google_vision', 'manual'
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_receipt_ocr_results_receipt_id ON receipt_ocr_results(receipt_id);
CREATE INDEX IF NOT EXISTS idx_receipt_ocr_results_vendor ON receipt_ocr_results(vendor);

-- Ticket listings - User ticket listings
CREATE TABLE IF NOT EXISTS ticket_listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    event_id VARCHAR(100) NOT NULL,
    event_name VARCHAR(255) NOT NULL,
    event_date TIMESTAMP NOT NULL,
    venue_name VARCHAR(255),
    section VARCHAR(100) NOT NULL,
    row_name VARCHAR(50),
    seat_numbers VARCHAR(100),
    quantity INTEGER NOT NULL DEFAULT 1,
    asking_price_cents INTEGER NOT NULL,
    face_value_cents INTEGER,               -- From receipt or ceiling
    receipt_id UUID REFERENCES receipt_uploads(id),
    verification_status VARCHAR(50) DEFAULT 'pending',  -- pending, verified, manual_review, rejected
    verification_method VARCHAR(50),        -- 'ocr', 'section_ceiling', 'manual'
    verification_notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    is_sold BOOLEAN DEFAULT FALSE,
    view_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    sold_at TIMESTAMP,
    expires_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ticket_listings_user_id ON ticket_listings(user_id);
CREATE INDEX IF NOT EXISTS idx_ticket_listings_event_id ON ticket_listings(event_id);
CREATE INDEX IF NOT EXISTS idx_ticket_listings_status ON ticket_listings(verification_status);
CREATE INDEX IF NOT EXISTS idx_ticket_listings_active ON ticket_listings(is_active, is_sold);
CREATE INDEX IF NOT EXISTS idx_ticket_listings_event_date ON ticket_listings(event_date);
CREATE INDEX IF NOT EXISTS idx_ticket_listings_section ON ticket_listings(section);
CREATE INDEX IF NOT EXISTS idx_ticket_listings_price ON ticket_listings(asking_price_cents);

-- Price verifications - Verification decision log
CREATE TABLE IF NOT EXISTS price_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID REFERENCES ticket_listings(id) ON DELETE CASCADE,
    receipt_id UUID REFERENCES receipt_uploads(id),
    ocr_result_id UUID REFERENCES receipt_ocr_results(id),
    ceiling_id UUID REFERENCES event_price_ceilings(id),
    asking_price_cents INTEGER NOT NULL,
    verified_face_value_cents INTEGER,
    ceiling_price_cents INTEGER,
    verification_result VARCHAR(50) NOT NULL,  -- 'approved', 'rejected', 'manual_review'
    rejection_reason VARCHAR(255),
    risk_score DECIMAL(5,4),                   -- 0.0000 to 1.0000
    fraud_signals JSONB DEFAULT '[]',
    reviewer_id UUID REFERENCES users(id),     -- For manual reviews
    reviewed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_price_verifications_listing_id ON price_verifications(listing_id);
CREATE INDEX IF NOT EXISTS idx_price_verifications_result ON price_verifications(verification_result);

-- Listing flags - Community flagging system
CREATE TABLE IF NOT EXISTS listing_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID REFERENCES ticket_listings(id) ON DELETE CASCADE,
    reporter_id UUID REFERENCES users(id) ON DELETE SET NULL,
    reason VARCHAR(100) NOT NULL,           -- 'price_too_high', 'fake_receipt', 'wrong_section', 'other'
    description TEXT,
    status VARCHAR(50) DEFAULT 'pending',   -- pending, reviewed, dismissed, actioned
    reviewer_id UUID REFERENCES users(id),
    reviewed_at TIMESTAMP,
    action_taken VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(listing_id, reporter_id)         -- One flag per user per listing
);

CREATE INDEX IF NOT EXISTS idx_listing_flags_listing_id ON listing_flags(listing_id);
CREATE INDEX IF NOT EXISTS idx_listing_flags_status ON listing_flags(status);
CREATE INDEX IF NOT EXISTS idx_listing_flags_reporter ON listing_flags(reporter_id);

-- Events table for quick event lookup
CREATE TABLE IF NOT EXISTS events (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    date TIMESTAMP NOT NULL,
    venue_name VARCHAR(255),
    venue_city VARCHAR(100),
    venue_state VARCHAR(50),
    category VARCHAR(100),                  -- 'sports', 'concerts', 'theater'
    subcategory VARCHAR(100),               -- 'nfl', 'nba', 'rock', 'musical'
    image_url VARCHAR(500),
    ticket_exchange_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_date ON events(date);
CREATE INDEX IF NOT EXISTS idx_events_category ON events(category);
CREATE INDEX IF NOT EXISTS idx_events_exchange_enabled ON events(ticket_exchange_enabled);
