# 🚀 EN PASSANT: MASTER LAUNCHPAD 2026
## Complete Technical Reference & Launch Guide

> **Version:** 3.0  
> **Last Updated:** February 1, 2026  
> **Launch Date:** February 8, 2026 (Super Bowl LX @ Levi's Stadium, Santa Clara)  
> **Status:** Final sprint - 7 days to launch

---

## 📋 TABLE OF CONTENTS

1. [Project Overview](#project-overview)
2. [Environment Configuration](#environment-configuration)
3. [Infrastructure & URLs](#infrastructure--urls)
4. [Current Implementation Status](#current-implementation-status)
5. [EP Score System](#ep-score-system)
6. [Monetization Model](#monetization-model)
7. [Ticket Exchange Specification](#ticket-exchange-specification)
8. [Database Schema](#database-schema)
9. [Launch Sprint Timeline](#launch-sprint-timeline)
10. [Marketing Strategy](#marketing-strategy)
11. [Agent Handoff Instructions](#agent-handoff-instructions)

---

## 🎯 PROJECT OVERVIEW

**En Passant** is an identity verification infrastructure platform that creates "invisible plumbing" for B2B platforms. Users build an **EP Score (0-100)** by connecting verification anchors (Gmail, LinkedIn, .edu email), and purchase **Rank Guard** passes to access specific verticals.

### Core Value Proposition
- **For Users:** Single verification identity, portable across platforms
- **For Platforms:** Verified leads, reduced bot traffic, new revenue stream via premium verified lead tiers
- **For Tickets:** Face-value-only marketplace (no scalping)

### Target Verticals
1. **Apartments** ($29 one-time, 60 days)
2. **Jobs** ($19/month subscription)
3. **Freelance** (Platform commission model)
4. **Dating** ($4.99/month subscription)
5. **Tickets** ($4.99 per event, face-value cap enforced)

---

## 🔑 ENVIRONMENT CONFIGURATION

### Complete `.env` Template

Place this in your backend root directory (`~/trustbridge-backend/.env` or similar):

```bash
# ==============================================
# EN PASSANT PRODUCTION ENVIRONMENT
# Last Updated: February 1, 2026
# ==============================================

# ----- SERVER CONFIG -----
NODE_ENV=production
PORT=8080
FRONTEND_URL=https://enpassantapi.io

# ----- DATABASE (Neon PostgreSQL) -----
DATABASE_URL=postgresql://username:password@host/database
# Ensure SSL mode enabled for production

# ----- JWT & SESSION -----
JWT_SECRET=your-super-secret-jwt-key-here-min-32-chars
SESSION_SECRET=your-super-secret-session-key-here-min-32-chars

# ----- OAUTH: GOOGLE -----
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=https://api.enpassantapi.io/auth/google/callback

# ----- OAUTH: LINKEDIN (OIDC) -----
LINKEDIN_CLIENT_ID=your-linkedin-client-id
LINKEDIN_CLIENT_SECRET=your-linkedin-client-secret
LINKEDIN_CALLBACK_URL=https://api.enpassantapi.io/auth/linkedin/callback

# ----- AWS S3 (Receipt Uploads) -----
AWS_ACCESS_KEY_ID=your-aws-access-key-id
AWS_SECRET_ACCESS_KEY=your-aws-secret-access-key
AWS_REGION=us-east-2
AWS_S3_BUCKET=enpassant-receipts

# ----- GOOGLE CLOUD VISION (OCR) -----
GOOGLE_CLOUD_CREDENTIALS=./trustbridge-485118-a1700985ba8b.json
GCP_PROJECT_ID=trustbridge-485118

# ----- STRIPE (Payments) -----
STRIPE_SECRET_KEY=sk_test_... # Get from Stripe Dashboard
STRIPE_PUBLISHABLE_KEY=pk_test_... # Get from Stripe Dashboard
STRIPE_WEBHOOK_SECRET=whsec_... # Created when setting up webhook endpoint

# ----- STRIPE CONNECT (Marketplace) -----
STRIPE_CONNECT_CLIENT_ID=ca_... # For ticket marketplace payouts

# ----- CORS & SECURITY -----
ALLOWED_ORIGINS=https://enpassantapi.io,https://www.enpassantapi.io

# ----- FEATURE FLAGS (Optional) -----
ENABLE_OCR_MOCK=false # Set to 'true' for testing without credentials
ENABLE_S3_MOCK=false # Set to 'true' for local testing
```

### Required Files

1. **Google Cloud Vision Key:**
   - Filename: `trustbridge-485118-a1700985ba8b.json`
   - Location: Backend root directory
   - Contains: Service account credentials for Cloud Vision API

2. **SSL Certificates** (if self-hosting):
   - Not needed if using Railway/Vercel

---

## 🏗️ INFRASTRUCTURE & URLs

### Production Deployment

| Service | Platform | URL | Status |
|---------|----------|-----|--------|
| Frontend | Vercel | https://enpassantapi.io | ✅ Live |
| Backend API | Railway | https://api.enpassantapi.io | ✅ Live |
| Database | Neon | PostgreSQL 15+ | ✅ Live |
| File Storage | AWS S3 | `enpassant-receipts` (us-east-2) | ✅ Configured |
| OCR | Google Cloud Vision | Project: trustbridge-485118 | ✅ Configured |
| Payments | Stripe | TBD - needs setup | ❌ Pending |

### Tech Stack

```
Frontend:
├── React 18.2
├── Vite 5.x
├── TailwindCSS 3.x
├── Framer Motion (animations)
└── Zustand (state management)

Backend:
├── Node.js 20.x
├── Express.js 4.x
├── Passport.js (OAuth)
├── JWT (auth tokens)
├── @noble/ed25519 (crypto signatures)
├── AWS SDK v3
└── Google Cloud Vision API

Database:
└── PostgreSQL 15+ (Neon)
```

---

## ✅ CURRENT IMPLEMENTATION STATUS

### Completed Features

| Feature | Status | Notes |
|---------|--------|-------|
| User registration/login | ✅ Complete | JWT-based auth |
| Google OAuth | ✅ Complete | Gmail verification anchor |
| LinkedIn OAuth | ✅ Complete | Custom OIDC strategy |
| Ed25519 badge signing | ✅ Complete | Rank Guard cryptographic proof |
| Badge generation | ✅ Complete | API endpoint `/api/badges/generate` |
| Badge verification | ✅ Complete | API endpoint `/api/badges/verify` |
| Dashboard UI | ✅ Complete | Displays EP Score + anchors |
| 5 Vertical landing pages | ✅ Complete | Apartments, Jobs, Freelance, Dating, Tickets |
| Chrome extension | ✅ Complete | Zillow badge display |
| "Rank Guard" rebranding | ✅ Complete | Old "Auth-Badge" references removed |
| Production deployment | ✅ Complete | Vercel + Railway live |
| AWS S3 integration | 🟡 Scaffolded | Works with mocks, needs testing |
| Google Vision OCR | 🟡 Scaffolded | Works with mocks, needs testing |

### Pending Implementation

| Feature | Priority | Estimated Effort |
|---------|----------|------------------|
| EP Score weight update (100-pt) | 🔴 Critical | 1 hour |
| Stripe payment integration | 🔴 Critical | 6-8 hours |
| Public profiles (`/verify/:username`) | 🔴 Critical | 4-6 hours |
| Face-value cap UI | 🟡 High | 6-8 hours |
| Receipt upload frontend | 🟡 High | 4-6 hours |
| Section price ceilings DB | 🟡 High | 2-3 hours |
| Terminology audit | 🟢 Medium | 2-3 hours |
| End-to-end OCR testing | 🟢 Medium | 3-4 hours |

---

## 📊 EP SCORE SYSTEM

### AUTHORITATIVE SPECIFICATION (Use This)

**Maximum Score:** 100 points

| Verification Anchor | Points | Implementation |
|---------------------|--------|----------------|
| Base Account | **20** | Account creation timestamp |
| Gmail OAuth | **25** | Google OAuth successful callback |
| LinkedIn OAuth | **30** | LinkedIn OIDC successful callback |
| .edu Email | **25** | Domain validation + email confirmation |

### Clearance Levels

| Level | Score Range | Access Tier | Badge Display |
|-------|-------------|-------------|---------------|
| **Spectator** | 0-49 | Limited features | Gray badge |
| **Verified** | 50-74 | Standard access | Blue badge |
| **Trusted** | 75-99 | Priority access | Gold badge |
| **Grandmaster** | 100 | Full access | Platinum badge |

### Code Implementation

**File:** `src/services/trustScore.service.js`

```javascript
// CURRENT (INCORRECT - 115 point system)
const SCORE_WEIGHTS = {
  BASE_ACCOUNT: 30,
  GMAIL_CONNECTED: 30,
  LINKEDIN_CONNECTED: 40,
  EDU_VERIFIED: 15
};
const MAX_SCORE = 115;

// ⬇️ CHANGE TO (CORRECT - 100 point system) ⬇️
const SCORE_WEIGHTS = {
  BASE_ACCOUNT: 20,
  GMAIL_CONNECTED: 25,
  LINKEDIN_CONNECTED: 30,
  EDU_VERIFIED: 25
};
const MAX_SCORE = 100;

// Update calculation function
function calculateUserScore(user) {
  let score = SCORE_WEIGHTS.BASE_ACCOUNT;
  
  if (user.google_id) {
    score += SCORE_WEIGHTS.GMAIL_CONNECTED;
  }
  
  if (user.linkedin_id) {
    score += SCORE_WEIGHTS.LINKEDIN_CONNECTED;
  }
  
  if (user.edu_verified) {
    score += SCORE_WEIGHTS.EDU_VERIFIED;
  }
  
  return Math.min(score, MAX_SCORE); // Cap at 100
}

// Update clearance level logic
function getClearanceLevel(score) {
  if (score >= 100) return 'Grandmaster';
  if (score >= 75) return 'Trusted';
  if (score >= 50) return 'Verified';
  return 'Spectator';
}
```

### Database Updates

If you renamed the database column from `trust_score` to `ep_score`:

```sql
-- Migration to rename column (optional)
ALTER TABLE users RENAME COLUMN trust_score TO ep_score;

-- Add clearance_level column (recommended)
ALTER TABLE users ADD COLUMN clearance_level VARCHAR(20);
UPDATE users SET clearance_level = 
  CASE 
    WHEN ep_score >= 100 THEN 'Grandmaster'
    WHEN ep_score >= 75 THEN 'Trusted'
    WHEN ep_score >= 50 THEN 'Verified'
    ELSE 'Spectator'
  END;
```

---

## 💰 MONETIZATION MODEL

### Pricing Structure

| Vertical | Price | Type | Duration | Stripe Product ID |
|----------|-------|------|----------|-------------------|
| **Apartments** | $29 | One-time | 60 days | `price_apartments_29_60d` |
| **Jobs** | $19 | Subscription | Monthly | `price_jobs_19_monthly` |
| **Freelance** | Free + 10% commission | Platform fee | Per transaction | N/A |
| **Dating** | $4.99 | Subscription | Monthly | `price_dating_499_monthly` |
| **Tickets** | $4.99 | One-time | Per event | `price_tickets_499_event` |
| **AI Agents API** | $29 | Subscription | Monthly | `price_agents_29_monthly` |

### Stripe Implementation

**Create Products & Prices:**

```bash
# Apartments (one-time)
stripe products create --name="En Passant - Apartments" --description="60-day Rank Guard pass for apartment hunting"
stripe prices create --product=prod_XXX --unit-amount=2900 --currency=usd

# Jobs (subscription)
stripe products create --name="En Passant - Jobs" --description="Monthly Rank Guard pass for job applications"
stripe prices create --product=prod_XXX --unit-amount=1900 --currency=usd --recurring[interval]=month

# Dating (subscription)
stripe products create --name="En Passant - Dating" --description="Monthly Rank Guard pass for dating platforms"
stripe prices create --product=prod_XXX --unit-amount=499 --currency=usd --recurring[interval]=month

# Tickets (one-time per event)
stripe products create --name="En Passant - Tickets" --description="Face-value verified ticket marketplace access"
stripe prices create --product=prod_XXX --unit-amount=499 --currency=usd
```

### Payment Flow Architecture

**Standard Purchase (Apartments, Tickets one-time):**
```
1. User clicks "Get Rank Guard" on vertical page
2. Frontend calls POST /api/payments/create-checkout
3. Backend creates Stripe Checkout Session
4. User redirected to Stripe-hosted payment page
5. User completes payment
6. Stripe webhook fires (checkout.session.completed)
7. Backend updates user record with vertical_access
8. User redirected to dashboard with success message
```

**Subscription Purchase (Jobs, Dating, AI Agents):**
```
1-5. Same as above
6. Stripe webhook fires (customer.subscription.created)
7. Backend stores subscription_id in user record
8. Subsequent monthly charges handled automatically
9. Webhook (invoice.paid) confirms each renewal
```

**Ticket Marketplace (P2P with escrow):**
```
1. Buyer purchases ticket listing
2. Funds held in Stripe balance (platform account)
3. Seller ships/transfers ticket
4. Buyer confirms receipt in app
5. Backend triggers Stripe payout to seller
6. En Passant retains 5% platform fee
```

### Backend Routes Needed

**File:** `src/routes/payments.routes.js` (CREATE THIS)

```javascript
const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { authenticateToken } = require('../middleware/auth');

// Create checkout session for one-time purchase
router.post('/create-checkout', authenticateToken, async (req, res) => {
  const { vertical, priceId } = req.body;
  const userId = req.user.id;
  
  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment', // or 'subscription' for recurring
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/cancel`,
      client_reference_id: userId.toString(),
      metadata: { vertical, userId }
    });
    
    res.json({ url: session.url });
  } catch (error) {
    console.error('Stripe error:', error);
    res.status(500).json({ error: 'Payment failed' });
  }
});

// Stripe webhook handler
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  
  try {
    const event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
    
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      await handleSuccessfulPayment(session);
    }
    
    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(400).send(`Webhook Error: ${error.message}`);
  }
});

// Check subscription status
router.get('/subscription-status', authenticateToken, async (req, res) => {
  // Implementation
});

module.exports = router;
```

---

## 🎫 TICKET EXCHANGE SPECIFICATION

### Core Principle: Face-Value Cap

**Tickets can ONLY be listed at or below their original purchase price.**

This is enforced through a 4-tier verification system:

### Verification Tiers (Priority Order)

| Tier | Method | Accuracy | Status | Implementation Complexity |
|------|--------|----------|--------|---------------------------|
| 1 (Gold) | **Ticketmaster API** | 100% | Post-launch | Partnership required |
| 2 (Silver) | **Receipt OCR** | 85-95% | Scaffolded | Frontend needed |
| 3 (Bronze) | **Section Ceilings** | 70-80% | Not started | DB seed needed |
| 4 (Backup) | **Community Flagging** | Variable | Not started | Simple to build |

### Super Bowl LX Price Ceilings (Launch Seed Data)

**Event:** Super Bowl LX @ Levi's Stadium  
**Date:** February 8, 2026, 3:30 PM PST  
**Official Face Values + 10% Fee Buffer:**

| Section Type | Rows/Areas | Base Face Value | Max Listing Price |
|--------------|------------|-----------------|-------------------|
| 400-Level Corners | 401-405, 426-430 | $1,000 | $1,100 |
| 400-Level Sideline | 406-425 | $1,200 | $1,320 |
| 300-Level Corners | 301-305, 326-330 | $1,500 | $1,650 |
| 300-Level Sideline | 306-325 | $1,800 | $1,980 |
| 200-Level Corners | 201-205, 226-230 | $2,200 | $2,420 |
| 200-Level Sideline | 206-225 | $2,800 | $3,080 |
| 100-Level Corners | 101-105, 126-130 | $3,200 | $3,520 |
| 100-Level Sideline | 106-125 | $4,000 | $4,400 |
| Club Level | C1-C50 | $5,000 | $5,500 |
| Field/Suite Level | S1-S50, F1-F50 | $6,000 | $6,600 |

### Receipt Verification Flow

```
User uploads receipt
    ↓
S3 storage (enpassant-receipts bucket)
    ↓
Google Cloud Vision OCR extraction
    ↓
Parse detected fields:
  - Vendor (Ticketmaster, AXS, StubHub original, etc.)
  - Event name
  - Section/Row/Seat
  - Purchase price (face value)
  - Order number
  - Purchase date
    ↓
Fraud detection checks:
  - Image manipulation detection
  - Duplicate receipt hash
  - Price reasonability check
    ↓
Price validation:
  - Compare to section ceiling
  - Flag if over face value
  - Approve if within limits
    ↓
Store verification in database
    ↓
User can list ticket (if approved)
```

### OCR Service Implementation

**File:** `src/services/ocr.service.js`

```javascript
const vision = require('@google-cloud/vision');
const AWS = require('aws-sdk');

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

const visionClient = new vision.ImageAnnotatorClient({
  keyFilename: process.env.GOOGLE_CLOUD_CREDENTIALS
});

async function uploadReceiptToS3(file, userId) {
  const key = `receipts/${userId}/${Date.now()}-${file.originalname}`;
  
  const params = {
    Bucket: process.env.AWS_S3_BUCKET,
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype
  };
  
  await s3.upload(params).promise();
  return key;
}

async function extractReceiptData(s3Key) {
  // Get image from S3
  const s3Object = await s3.getObject({
    Bucket: process.env.AWS_S3_BUCKET,
    Key: s3Key
  }).promise();
  
  // Run OCR
  const [result] = await visionClient.textDetection({
    image: { content: s3Object.Body }
  });
  
  const fullText = result.fullTextAnnotation?.text || '';
  
  // Parse receipt data
  return parseReceiptText(fullText);
}

function parseReceiptText(text) {
  // Extract key fields using regex patterns
  const patterns = {
    ticketmaster: /ticketmaster/i,
    axs: /axs\.com/i,
    eventName: /super bowl|nfl/i,
    section: /sec(?:tion)?[\s:]+([a-z0-9]+)/i,
    price: /(?:total|amount|price)[\s:]+\$?([\d,]+\.?\d*)/i,
    orderNum: /order[\s#:]+([a-z0-9-]+)/i
  };
  
  return {
    vendor: patterns.ticketmaster.test(text) ? 'Ticketmaster' : 
            patterns.axs.test(text) ? 'AXS' : 'Unknown',
    eventName: text.match(patterns.eventName)?.[0] || '',
    section: text.match(patterns.section)?.[1] || '',
    detectedPrice: parseFloat(text.match(patterns.price)?.[1]?.replace(',', '') || 0),
    orderNumber: text.match(patterns.orderNum)?.[1] || '',
    confidenceScore: 0.85 // Placeholder - calculate based on matches
  };
}

module.exports = {
  uploadReceiptToS3,
  extractReceiptData
};
```

---

## 🗄️ DATABASE SCHEMA

### New Tables Required for Ticket Exchange

```sql
-- =============================================
-- EVENT PRICE CEILINGS
-- Store official face values by event/section
-- =============================================
CREATE TABLE event_price_ceilings (
    id SERIAL PRIMARY KEY,
    event_id VARCHAR(100) NOT NULL,
    event_name VARCHAR(255) NOT NULL,
    event_date DATE NOT NULL,
    venue VARCHAR(255),
    section VARCHAR(50) NOT NULL,
    row_range VARCHAR(50), -- e.g., "1-30" or "A-Z"
    face_value DECIMAL(10,2) NOT NULL,
    max_listing_price DECIMAL(10,2) NOT NULL, -- face_value + 10% buffer
    source VARCHAR(100), -- 'ticketmaster_api', 'manual', 'scrape'
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(event_id, section)
);

CREATE INDEX idx_event_ceilings_event ON event_price_ceilings(event_id);
CREATE INDEX idx_event_ceilings_date ON event_price_ceilings(event_date);

-- =============================================
-- RECEIPT UPLOADS
-- Track uploaded receipt files
-- =============================================
CREATE TABLE receipt_uploads (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    listing_id INTEGER, -- Will reference listings table
    s3_key VARCHAR(500) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size INTEGER,
    mime_type VARCHAR(100),
    file_hash VARCHAR(64) NOT NULL, -- SHA-256 for duplicate detection
    upload_status VARCHAR(20) DEFAULT 'pending', -- pending, processing, completed, failed
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_receipts_user ON receipt_uploads(user_id);
CREATE INDEX idx_receipts_hash ON receipt_uploads(file_hash);
CREATE INDEX idx_receipts_listing ON receipt_uploads(listing_id);

-- =============================================
-- RECEIPT OCR RESULTS
-- Store extracted data from Google Vision
-- =============================================
CREATE TABLE receipt_ocr_results (
    id SERIAL PRIMARY KEY,
    receipt_id INTEGER REFERENCES receipt_uploads(id) ON DELETE CASCADE,
    detected_vendor VARCHAR(100), -- 'Ticketmaster', 'AXS', etc.
    detected_event VARCHAR(255),
    detected_section VARCHAR(50),
    detected_row VARCHAR(10),
    detected_seat VARCHAR(10),
    detected_price DECIMAL(10,2),
    detected_order_number VARCHAR(100),
    detected_purchase_date DATE,
    full_extracted_text TEXT, -- Raw OCR output
    confidence_score DECIMAL(3,2), -- 0.00 to 1.00
    extraction_status VARCHAR(20) DEFAULT 'pending', -- pending, completed, failed
    processed_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_ocr_receipt ON receipt_ocr_results(receipt_id);

-- =============================================
-- PRICE VERIFICATIONS
-- Track verification decisions
-- =============================================
CREATE TABLE price_verifications (
    id SERIAL PRIMARY KEY,
    listing_id INTEGER NOT NULL, -- Will reference listings table
    receipt_id INTEGER REFERENCES receipt_uploads(id),
    event_id VARCHAR(100),
    verification_method VARCHAR(50) NOT NULL, -- 'ocr', 'ceiling', 'api', 'manual'
    verified_face_value DECIMAL(10,2),
    max_allowed_price DECIMAL(10,2),
    requested_listing_price DECIMAL(10,2),
    is_within_limit BOOLEAN NOT NULL,
    verification_status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected
    rejection_reason TEXT,
    verified_by INTEGER REFERENCES users(id), -- NULL for automated, user_id for manual
    verified_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_verifications_listing ON price_verifications(listing_id);
CREATE INDEX idx_verifications_status ON price_verifications(verification_status);

-- =============================================
-- TICKET LISTINGS
-- The actual marketplace listings
-- =============================================
CREATE TABLE ticket_listings (
    id SERIAL PRIMARY KEY,
    seller_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    event_id VARCHAR(100) NOT NULL,
    event_name VARCHAR(255) NOT NULL,
    event_date TIMESTAMP NOT NULL,
    venue VARCHAR(255),
    section VARCHAR(50) NOT NULL,
    row VARCHAR(10),
    seat VARCHAR(10),
    quantity INTEGER DEFAULT 1,
    listing_price DECIMAL(10,2) NOT NULL,
    face_value DECIMAL(10,2),
    verification_id INTEGER REFERENCES price_verifications(id),
    listing_status VARCHAR(20) DEFAULT 'pending', -- pending, active, sold, removed
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    sold_at TIMESTAMP
);

CREATE INDEX idx_listings_event ON ticket_listings(event_id);
CREATE INDEX idx_listings_seller ON ticket_listings(seller_id);
CREATE INDEX idx_listings_status ON ticket_listings(listing_status);
CREATE INDEX idx_listings_date ON ticket_listings(event_date);

-- =============================================
-- LISTING FLAGS
-- Community reporting system
-- =============================================
CREATE TABLE listing_flags (
    id SERIAL PRIMARY KEY,
    listing_id INTEGER REFERENCES ticket_listings(id) ON DELETE CASCADE,
    reporter_id INTEGER REFERENCES users(id),
    flag_reason VARCHAR(50) NOT NULL, -- 'overpriced', 'fake', 'duplicate', 'scam'
    flag_details TEXT,
    status VARCHAR(20) DEFAULT 'pending', -- pending, reviewed, dismissed, action_taken
    reviewed_by INTEGER REFERENCES users(id),
    reviewed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_flags_listing ON listing_flags(listing_id);
CREATE INDEX idx_flags_reporter ON listing_flags(reporter_id);
CREATE INDEX idx_flags_status ON listing_flags(status);

-- =============================================
-- SEED DATA: Super Bowl LX Price Ceilings
-- =============================================
INSERT INTO event_price_ceilings (event_id, event_name, event_date, venue, section, face_value, max_listing_price, source) VALUES
-- 400 Level
('sb60-2026', 'Super Bowl LX', '2026-02-08', 'Levi''s Stadium', '401', 1000.00, 1100.00, 'manual'),
('sb60-2026', 'Super Bowl LX', '2026-02-08', 'Levi''s Stadium', '402', 1000.00, 1100.00, 'manual'),
('sb60-2026', 'Super Bowl LX', '2026-02-08', 'Levi''s Stadium', '403', 1000.00, 1100.00, 'manual'),
('sb60-2026', 'Super Bowl LX', '2026-02-08', 'Levi''s Stadium', '404', 1000.00, 1100.00, 'manual'),
('sb60-2026', 'Super Bowl LX', '2026-02-08', 'Levi''s Stadium', '405', 1000.00, 1100.00, 'manual'),
('sb60-2026', 'Super Bowl LX', '2026-02-08', 'Levi''s Stadium', '426', 1000.00, 1100.00, 'manual'),
('sb60-2026', 'Super Bowl LX', '2026-02-08', 'Levi''s Stadium', '427', 1000.00, 1100.00, 'manual'),
('sb60-2026', 'Super Bowl LX', '2026-02-08', 'Levi''s Stadium', '428', 1000.00, 1100.00, 'manual'),
('sb60-2026', 'Super Bowl LX', '2026-02-08', 'Levi''s Stadium', '429', 1000.00, 1100.00, 'manual'),
('sb60-2026', 'Super Bowl LX', '2026-02-08', 'Levi''s Stadium', '430', 1000.00, 1100.00, 'manual'),
-- ... (add remaining sections 406-425 as sideline @ $1320, etc.)

-- 300 Level
('sb60-2026', 'Super Bowl LX', '2026-02-08', 'Levi''s Stadium', '301', 1500.00, 1650.00, 'manual'),
-- ... continue pattern

-- 200 Level
('sb60-2026', 'Super Bowl LX', '2026-02-08', 'Levi''s Stadium', '201', 2200.00, 2420.00, 'manual'),
-- ... continue pattern

-- 100 Level
('sb60-2026', 'Super Bowl LX', '2026-02-08', 'Levi''s Stadium', '101', 3200.00, 3520.00, 'manual'),
-- ... continue pattern

-- Club Level
('sb60-2026', 'Super Bowl LX', '2026-02-08', 'Levi''s Stadium', 'C1', 5000.00, 5500.00, 'manual'),
-- ... continue pattern

-- Field/Suite
('sb60-2026', 'Super Bowl LX', '2026-02-08', 'Levi''s Stadium', 'F1', 6000.00, 6600.00, 'manual');
-- ... continue pattern
```

### Migration File Template

**File:** `src/db/migrations/005_ticket_exchange.sql`

Save the above SQL as this migration file and run:

```bash
# If using node-pg-migrate or similar
npm run migrate up

# Or manually via psql
psql $DATABASE_URL -f src/db/migrations/005_ticket_exchange.sql
```

---

## 📅 LAUNCH SPRINT TIMELINE

### February 1-2 (SAT-SUN): Foundation Fixes

**Priority 1: EP Score System**
- [ ] Update `trustScore.service.js` to 100-point weights
- [ ] Test score calculation with test users
- [ ] Update dashboard UI to show correct scores
- [ ] Database migration if renaming columns

**Priority 2: Stripe Integration**
- [ ] Create Stripe account (if not exists)
- [ ] Set up products and prices
- [ ] Implement checkout session creation
- [ ] Build webhook handler
- [ ] Test payment flow end-to-end

**Estimated Time:** 8-10 hours

---

### February 3-4 (MON-TUE): Public Profiles & Branding

**Priority 3: Public Verification Profiles**
- [ ] Create `/verify/:username` route
- [ ] Build frontend component
- [ ] Display EP Score, clearance level, anchors
- [ ] Add QR code generation
- [ ] Test sharing functionality

**Priority 4: Terminology Audit**
- [ ] Search codebase for "TrustBridge"
- [ ] Search codebase for "Pawn Pass"
- [ ] Search codebase for "Auth-Badge"
- [ ] Replace all instances with current terms
- [ ] Update metadata, SEO tags, favicon

**Estimated Time:** 8-10 hours

---

### February 5-6 (WED-THU): Ticket Exchange MVP

**Priority 5: Face-Value Cap UI**
- [ ] Update ticket landing page with "Face Value Only" hero
- [ ] Add price comparison graphic
- [ ] Create FAQ section
- [ ] Build listing creation form with price validation

**Priority 6: Receipt Upload Frontend**
- [ ] Build `ReceiptUploader.jsx` component
- [ ] Implement drag-and-drop
- [ ] Add file validation (size, type)
- [ ] Show upload progress
- [ ] Display OCR results

**Priority 7: Section Ceilings Database**
- [ ] Run migration 005_ticket_exchange.sql
- [ ] Seed Super Bowl LX price data
- [ ] Build price validation API endpoint
- [ ] Test ceiling lookup logic

**Estimated Time:** 12-14 hours

---

### February 7 (FRI): QA & Guerrilla Deploy

**Testing Checklist:**
- [ ] User registration flow
- [ ] OAuth connections (Google, LinkedIn)
- [ ] EP Score calculation
- [ ] Payment processing (test mode)
- [ ] Public profile sharing
- [ ] Ticket listing creation
- [ ] Price validation enforcement
- [ ] Mobile responsiveness
- [ ] Cross-browser testing

**Guerrilla Marketing:**
- [ ] Print QR posters (100+ copies)
- [ ] Deploy at Levi's Stadium area
- [ ] Deploy in downtown Santa Clara
- [ ] Deploy in San Francisco (BART, Union Square)
- [ ] Deploy at SJC/SFO airports
- [ ] Stanford/SJSU campus flyers

**Estimated Time:** 8-10 hours

---

### February 8 (SAT): LAUNCH DAY 🚀

**Pre-Game (Morning):**
- [ ] Final production deployment
- [ ] Smoke test all features
- [ ] Monitor server logs
- [ ] Prepare social media posts

**Kickoff (3:30 PM PST):**
- [ ] Publish launch announcement
- [ ] Post to Twitter/X
- [ ] Post to Reddit (r/Scams, r/nfl, r/technology)
- [ ] Submit to Hacker News (Show HN)
- [ ] TikTok launch video

**Post-Game (Evening):**
- [ ] Monitor user signups
- [ ] Respond to feedback
- [ ] Address any bugs
- [ ] Celebrate! 🎉

---

## 📣 MARKETING STRATEGY

### Platform Priority Matrix

| Platform | Priority | Timing | Content Type | Expected Reach |
|----------|----------|--------|--------------|----------------|
| Reddit | 🔴 Critical | Days -3 to 0 | Problem/solution stories | 10K-50K |
| Twitter/X | 🔴 Critical | Days -1 to +7 | Thread storytelling | 5K-25K |
| Hacker News | 🟡 High | Day 0, 11am EST | Show HN post | 2K-10K |
| TikTok | 🟡 High | Days 0 to +14 | Authentic frustration | 50K-500K |
| YouTube | 🟢 Medium | Days -1 to +7 | Explainer + demo | 1K-5K |

### Reddit Launch Strategy

**Target Subreddits:**

1. **r/Scams** (1.2M members)
   - Title: "I built a tool to stop ticket scalpers after getting scammed for Super Bowl tickets"
   - Angle: Personal story, solution-focused

2. **r/nfl** (4M members)
   - Title: "Face-value-only ticket exchange launching for Super Bowl LX"
   - Angle: Community benefit, fan-first

3. **r/technology** (15M members)
   - Title: "Using cryptographic identity verification to prevent ticket scalping"
   - Angle: Technical innovation

4. **r/Entrepreneur** (2M members)
   - Title: "Building in public: 0 to launch in 30 days"
   - Angle: Founder journey

5. **r/concerts** (200K members)
   - Title: "What if you could buy concert tickets without competing with bots?"
   - Angle: Fan empowerment

**Posting Schedule:**
- Feb 5: r/Scams (prime position for weekend)
- Feb 6: r/nfl (2 days before Super Bowl)
- Feb 7: r/technology (day before launch)
- Feb 8: r/Entrepreneur (launch day)
- Feb 9: r/concerts (post-launch momentum)

### Twitter/X Strategy

**Launch Thread Template:**

```
🚨 THREAD: I got scammed buying Super Bowl tickets.

Lost $800 to a fake seller.

So I built a face-value-only marketplace that makes scalping impossible.

Here's how it works 👇

1/ The problem is simple:

Ticket resale platforms allow unlimited markups.

$200 tickets sell for $2,000.

Fans get priced out. Scalpers win.

This has to change.

2/ The solution: cryptographic verification + price caps.

Every ticket on @EnPassantHQ must be listed at or below face value.

Not a guideline. A hard technical limit.

3/ How we enforce it:

✅ Receipt OCR (AI extracts original price)
✅ Section-based ceilings (known face values)
✅ Community flagging (crowdsourced fraud detection)

4/ But here's the key innovation:

We verify HUMANS, not just tickets.

Your "Rank Guard" is a cryptographically signed proof that you're a real person.

Google + LinkedIn + .edu email = 100-point "EP Score"

5/ Why does this matter for tickets?

Because platforms can filter leads by EP Score.

Want verified applicants? Require EP 75+.

Want to avoid bots? Require Rank Guard.

It's identity infrastructure for the internet.

6/ We're launching TODAY at Super Bowl LX.

If you're in the Bay Area, you'll see our QR posters everywhere.

Scan → verify → buy tickets at face value.

No middlemen. No markup. Just fans.

7/ This is bigger than tickets.

We're building for:
🏠 Apartments (no bot applications)
💼 Jobs (verified resumes)
❤️ Dating (real humans only)
🤖 AI agents (trusted automation)

8/ The internet needs an identity layer.

Not blockchain. Not web3.

Just simple, portable verification that works everywhere.

One EP Score. Five verticals. Infinite use cases.

9/ If you've ever:
• Been scammed buying tickets
• Lost an apartment to a bot
• Matched with a catfish
• Competed with fake job applicants

This is for you.

10/ Join us: enpassantapi.io

Super Bowl launch is LIVE.

Let's make scalpers obsolete. 🎫🚫

Follow @EnPassantHQ for updates.

RT to spread the word. 🔄
```

### Guerrilla Marketing: QR Posters

**Design Template:**

```
┌─────────────────────────────────────┐
│                                     │
│         🎫 SUPER BOWL TICKETS       │
│                                     │
│          AT FACE VALUE              │
│                                     │
│      ❌ NO SCALPERS ALLOWED         │
│                                     │
│   [QR CODE - LARGE, CENTERED]       │
│                                     │
│        SCAN TO GET STARTED          │
│                                     │
│       enpassantapi.io/tickets       │
│                                     │
│  COMMUNITY vs. CLANKERS 🤖          │
│                                     │
└─────────────────────────────────────┘
```

**Deployment Locations (100+ posters):**

- Levi's Stadium parking lots (20 posters)
- Great America Parkway bus stops (10 posters)
- Downtown Santa Clara restaurants/bars (15 posters)
- Caltrain stations (Mountain View, Sunnyvale, Santa Clara) (15 posters)
- BART stations (Fremont, Milpitas) (10 posters)
- SJC Airport baggage claim (5 posters)
- SFO Airport BART station (5 posters)
- Stanford campus bulletin boards (10 posters)
- SJSU campus bulletin boards (10 posters)

**QR Tracking URLs:**
```
enpassantapi.io/tickets?source=qr-stadium
enpassantapi.io/tickets?source=qr-transit
enpassantapi.io/tickets?source=qr-campus
enpassantapi.io/tickets?source=qr-airport
```

---

## 🤖 AGENT HANDOFF INSTRUCTIONS

### For Claude Terminal (Code Execution)

**Initial Setup:**

1. **Confirm project directory:**
   ```bash
   # Find the actual folder name
   ls ~ | grep -E "(trustbridge|enpassant)"
   cd ~/[actual-folder-name]-backend
   pwd  # Confirm path
   ```

2. **Check environment:**
   ```bash
   cat .env  # Verify credentials are set
   ls -la trustbridge-485118-a1700985ba8b.json  # Check Google key
   ```

3. **Assess current state:**
   ```bash
   git status  # See uncommitted changes
   git log --oneline -10  # Recent commits
   npm ls  # Check dependencies
   ```

4. **Identify priority task:**
   ```bash
   # Check EP Score implementation
   cat src/services/trustScore.service.js | grep "SCORE_WEIGHTS"
   
   # Check if Stripe exists
   ls src/routes/payments* 2>/dev/null || echo "Stripe not implemented"
   
   # Check database schema
   psql $DATABASE_URL -c "\dt" | grep -E "(event_price|receipt|listing)"
   ```

**Execution Priority:**

1. **EP Score Fix** (if not 100-point system)
2. **Stripe Integration** (if routes missing)
3. **Database Migrations** (if tables missing)
4. **Receipt Infrastructure** (if services incomplete)

**Testing Commands:**

```bash
# Test score calculation
npm run test:score

# Test payment flow (Stripe test mode)
npm run test:payments

# Test OCR (with mock)
ENABLE_OCR_MOCK=true npm run test:ocr

# End-to-end test
npm run test:e2e
```

---

### For Claude Web/App (Strategy & Content)

**Your Focus Areas:**

1. **Copywriting:**
   - Public profile page content
   - Ticket landing page "Face Value Only" section
   - Stripe checkout page descriptions
   - Email templates (welcome, payment confirmation)

2. **Marketing Content:**
   - Reddit post variations
   - Twitter thread refinement
   - Hacker News "Show HN" post
   - TikTok script ideas

3. **Documentation:**
   - User guides (how to verify, how to list tickets)
   - FAQ sections
   - Help center articles

4. **Strategy:**
   - Launch timing optimization
   - Platform-specific messaging
   - Community management approach

**Do NOT:**
- Attempt to write code
- Make technical implementation decisions
- Edit backend/frontend files directly

---

### For Gemini (If Coordinating)

**Alignment Check:**

1. Read this entire launchpad
2. Cross-reference with your previous knowledge
3. Flag any conflicts or inconsistencies
4. Focus on areas Claude instances aren't covering

**Potential Contributions:**

- Business model refinement
- Alternative marketing channels
- Risk assessment
- Competitive analysis

---

## ❓ PRE-FLIGHT QUESTIONS FOR IVAN

Before agents begin execution, confirm:

### Technical:

1. **What is the exact project folder path?**
   - `~/trustbridge-backend` or `~/enpassant-backend` or other?

2. **Is Stripe already partially implemented?**
   - Any existing code we should build on?

3. **Current EP Score system:**
   - Is it 115-point (old) or 100-point (new) in production?

4. **Database state:**
   - Any pending migrations not yet run?
   - Are there uncommitted schema changes?

5. **AWS/Google credentials:**
   - Are they ready to activate, or continue using mocks?

### Business:

6. **Stripe account:**
   - Existing account or need to create?
   - Test mode keys available?

7. **Launch readiness:**
   - Any blocking bugs or issues?
   - What's the current production state?

8. **Post-launch plan:**
   - Who monitors logs/errors on Feb 8?
   - Customer support strategy?

---

## 🎯 DEFINITION OF DONE

### By February 8, 2026 @ 3:30 PM PST:

#### Critical Path (Must Have):

- [x] Frontend deployed and accessible at enpassantapi.io
- [x] Backend API running at api.enpassantapi.io
- [ ] EP Score system using 100-point weights
- [ ] Stripe payment processing functional
- [ ] Public verification profiles live (`/verify/:username`)
- [ ] Ticket landing page shows "Face Value Only" messaging
- [ ] Users can create Rank Guard accounts
- [ ] Users can connect Google/LinkedIn
- [ ] Users can purchase vertical access
- [ ] Basic receipt upload UI exists (OCR can be manual review)

#### High Priority (Should Have):

- [ ] Section-based price ceilings in database
- [ ] Receipt OCR extraction working
- [ ] Price validation logic enforced
- [ ] QR posters deployed in Santa Clara
- [ ] Social media posts published
- [ ] No "TrustBridge" references in UI

#### Nice to Have (Could Have):

- [ ] Ticketmaster API integration
- [ ] Community flagging system
- [ ] Advanced fraud detection
- [ ] Mobile app (future)

---

## 📚 APPENDIX

### Useful Commands Reference

```bash
# Database
psql $DATABASE_URL  # Connect to production DB
psql $DATABASE_URL -f migration.sql  # Run migration

# Backend
npm install  # Install dependencies
npm run dev  # Start development server
npm run build  # Production build
npm test  # Run test suite

# Frontend
npm run dev  # Vite dev server (usually port 5173)
npm run build  # Production build
npm run preview  # Preview production build

# AWS S3
aws s3 ls s3://enpassant-receipts  # List bucket contents
aws s3 cp file.jpg s3://enpassant-receipts/test/  # Upload test file

# Git
git status  # Check current state
git log --oneline -10  # Recent commits
git diff  # See uncommitted changes
git add .  # Stage all changes
git commit -m "message"  # Commit
git push  # Deploy to Railway (if auto-deploy enabled)
```

### Key File Locations

```
Backend:
- .env (credentials)
- src/services/trustScore.service.js (EP Score logic)
- src/routes/payments.routes.js (Stripe integration)
- src/services/ocr.service.js (Receipt OCR)
- src/db/migrations/ (Database changes)

Frontend:
- src/pages/VerifyProfile.jsx (Public profiles)
- src/pages/TicketsLanding.jsx (Face-value messaging)
- src/components/tickets/ReceiptUploader.jsx (Upload UI)
- .env (API URLs, Stripe public key)
```

### External Resources

- Stripe Dashboard: https://dashboard.stripe.com
- AWS Console: https://console.aws.amazon.com/s3
- Google Cloud Console: https://console.cloud.google.com
- Railway Dashboard: https://railway.app
- Vercel Dashboard: https://vercel.com

---

## 🔄 VERSION HISTORY

- **v3.0** (Feb 1, 2026): Complete master launchpad with credentials
- **v2.0** (Jan 31, 2026): Consolidated agent sync document
- **v1.0** (Jan 30, 2026): Initial LAUNCHPAD.md

---

*This is the single source of truth for En Passant.*

**If any documentation conflicts with this launchpad, THIS WINS.**

**Last Updated:** February 1, 2026, 6:00 AM PST  
**Updated By:** Claude (Terminal Agent)  
**Next Review:** February 8, 2026 (Post-Launch)
