# TrustBridge Launchboard

> **Last Updated:** January 29, 2026
> **Launch Date:** February 8, 2026 @ 7:00 PM PST
> **Status:** Pre-Launch Campaign Active

---

## Project Overview

TrustBridge is an identity verification system that solves the "bot tax" problem. Users connect identity anchors (Gmail, LinkedIn, .edu email), receive a Trust Score (0-115), and generate cryptographically signed Auth-Badges that platforms can verify.

**Core Value Prop:** Prove you're a real human in a world of bots.

---

## Trust Score System

| Component | Points | Source |
|-----------|--------|--------|
| Base Score | 30 | Account creation |
| Gmail Connected | +30 | OAuth verification |
| LinkedIn Connected | +40 | OAuth verification |
| .edu Email Verified | +15 | Email domain check |
| **Maximum Score** | **115** | All anchors connected |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (Vite + React)                  │
├─────────────────────────────────────────────────────────────────┤
│  Landing Pages          │  Dashboard           │  Auth          │
│  - / (main)             │  - /dashboard        │  - /login      │
│  - /tickets             │  - /verticals        │  - /register   │
│  - /dating              │                      │                │
│  - /jobs                │  Components:         │                │
│  - /apartments          │  - CountdownTimer    │                │
│  - /freelance           │  - BotDefenseSignal  │                │
│                         │  - EnlistForm        │                │
└─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                         BACKEND (Express.js)                     │
├─────────────────────────────────────────────────────────────────┤
│  Routes:                                                         │
│  - /api/auth/*          Authentication (register, login, me)    │
│  - /api/identity/*      OAuth callbacks, anchors management     │
│  - /api/badges/*        Generate, verify, revoke badges         │
│  - /api/user/*          User profile, trust score               │
│  - /api/waitlist/*      Campaign signups, stats                 │
├─────────────────────────────────────────────────────────────────┤
│  Services:                                                       │
│  - crypto.service.js    Ed25519 signing/verification            │
│  - trustScore.service   Score calculation                       │
│  - badge.service.js     Badge lifecycle                         │
│  - identity.service.js  Provider management                     │
└─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                         DATABASE (PostgreSQL)                    │
├─────────────────────────────────────────────────────────────────┤
│  Tables:                                                         │
│  - users                Accounts with argon2 passwords          │
│  - identity_anchors     Connected providers + is_edu_verified   │
│  - auth_badges          Signed badges with expiry/revocation    │
│  - badge_verifications  Audit log of verification requests      │
│  - leads                Waitlist signups with source tracking   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Campaign Infrastructure

### Waitlist API

```
POST /api/waitlist/enlist
{
  "email": "user@example.com",
  "phone": "+1234567890",        // optional
  "source": "qr-downtown",       // tracking source
  "vertical": "tickets"          // tickets|dating|jobs|apartments|freelance
}

GET /api/waitlist/stats
{
  "total": 2504,
  "byVertical": {
    "tickets": 876,
    "apartments": 626,
    "jobs": 626,
    "dating": 251,
    "freelance": 125
  }
}
```

### Landing Page Components

| Component | Purpose |
|-----------|---------|
| `CountdownTimer` | Counts down to Feb 8, 2026 7PM PST |
| `BotDefenseSignal` | Animated counter showing verified humans + bots blocked |
| `EnlistForm` | Email/phone waitlist signup with vertical tracking |

### Vertical Landing Pages

| Page | Route | Theme | Tagline |
|------|-------|-------|---------|
| Tickets | `/tickets` | Baby blue + pink pop art | "Real Fans Only" - 2 ticket limit |
| Dating | `/dating` | Rose/pink gradient | "Verified Hearts" |
| Jobs | `/jobs` | Indigo/slate gradient | "Human Talent" |
| Apartments | `/apartments` | Emerald green gradient | "Rental Fortress" |
| Freelance | `/freelance` | Orange/amber gradient | "Pro Verified" |

---

## Files Created/Modified

### Backend

| File | Status | Description |
|------|--------|-------------|
| `src/routes/waitlist.routes.js` | NEW | Waitlist API endpoints |
| `src/routes/index.js` | MODIFIED | Added waitlist routes |
| `src/db/migrations/003_create_leads_table.sql` | NEW | Leads table schema |
| `src/config/cors.js` | MODIFIED | Production CORS domains |
| `scripts/deploy-check.sh` | NEW | Pre-deployment validation |
| `PRODUCTION-DEPLOY.md` | NEW | Deployment guide |
| `PILOT-OUTREACH-TEMPLATE.md` | NEW | Sales templates |
| `LAUNCHBOARD.md` | NEW | This file |

### Frontend

| File | Status | Description |
|------|--------|-------------|
| `src/components/CountdownTimer.jsx` | NEW | Countdown to launch |
| `src/components/BotDefenseSignal.jsx` | NEW | Bot counter animation |
| `src/components/EnlistForm.jsx` | NEW | Waitlist signup form |
| `src/pages/TicketsLanding.jsx` | NEW | Pop art ticket exchange |
| `src/pages/DatingLanding.jsx` | NEW | Dating vertical |
| `src/pages/JobsLanding.jsx` | NEW | Jobs vertical |
| `src/pages/ApartmentsLanding.jsx` | NEW | Apartments vertical |
| `src/pages/FreelanceLanding.jsx` | MODIFIED | Freelance vertical |
| `src/pages/VerticalsHub.jsx` | NEW | Dashboard page linking all verticals |
| `src/pages/Dashboard.jsx` | MODIFIED | Added Verticals button |
| `src/App.jsx` | MODIFIED | Added all new routes |

---

## Database Schema

### leads table (new)
```sql
CREATE TABLE leads (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    source VARCHAR(100) NOT NULL,      -- e.g., "qr-downtown", "twitter-ad"
    vertical VARCHAR(50) NOT NULL,      -- tickets, dating, jobs, apartments, freelance
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
```

---

## Current Waitlist Stats

```
Total: 2,504 signups
├── Tickets:    876
├── Apartments: 626
├── Jobs:       626
├── Dating:     251
└── Freelance:  125
```

*Note: Baseline numbers + 4 test leads*

---

## QR Poster Campaign

Source tracking URLs for guerrilla marketing:

```
trustbridge.io/tickets?source=qr-superbowl-venue
trustbridge.io/tickets?source=qr-stadium-north
trustbridge.io/dating?source=qr-marina-coffeeshop
trustbridge.io/jobs?source=qr-stanford-library
trustbridge.io/apartments?source=qr-soma-laundromat
trustbridge.io/freelance?source=qr-wework-soma
```

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Vite, TailwindCSS, Framer Motion |
| Backend | Node.js, Express.js, ES Modules |
| Database | PostgreSQL with SSL |
| Auth | JWT + Argon2 password hashing |
| Crypto | Ed25519 via @noble/ed25519 |
| OAuth | Google, LinkedIn |

---

## Environment Variables

### Backend (.env)
```
DATABASE_URL=postgresql://...
JWT_SECRET=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
LINKEDIN_CLIENT_ID=...
LINKEDIN_CLIENT_SECRET=...
FRONTEND_URL=https://trustbridge.io
ED25519_PRIVATE_KEY=...
ED25519_PUBLIC_KEY=...
```

### Frontend (.env)
```
VITE_API_URL=https://api.trustbridge.io
```

---

## Pre-Launch Checklist

- [x] Trust score calculation working (30 base + 30 Gmail + 40 LinkedIn + 15 .edu = 115 max)
- [x] .edu verification bonus implemented
- [x] OAuth flow (Google + LinkedIn) working
- [x] Badge generation with Ed25519 signing
- [x] Waitlist API with source tracking
- [x] 5 vertical landing pages with countdown/bot defense/enlist form
- [x] Verticals Hub dashboard page
- [x] CORS configured for production domains
- [x] Database migrations ready
- [ ] Deploy backend to Railway
- [ ] Deploy frontend to Vercel
- [ ] Configure production OAuth redirect URIs
- [ ] Test full flow in production
- [ ] Print QR posters for Super Bowl week

---

## Commands

```bash
# Backend
npm run dev          # Development server
npm start            # Production server
npm run migrate      # Run database migrations
npm run generate-keys # Generate Ed25519 keypair
npm test             # Run tests

# Frontend
npm run dev          # Development server
npm run build        # Production build
npm run preview      # Preview production build
```

---

## Contact

**Launch Date:** February 8, 2026 @ 7:00 PM PST
**Target:** Super Bowl LX Weekend
**Campaign:** "Real Humans vs. Bots"

---

*This launchboard serves as the single source of truth for the TrustBridge pre-launch campaign.*
