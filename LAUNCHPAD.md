# 🚀 TrustBridge Launchpad

> **Last Updated:** January 26, 2024
> **Status:** MVP Complete - Ready for Production Deploy

---

## 📋 Project Overview

**TrustBridge** is an identity verification system that solves the "bot tax" problem. It generates cryptographically signed Auth-Badges that prove a user is a real, verified human—not a bot or scammer.

### The Problem
- 🤖 AI bots flood applications (jobs, apartments, tickets)
- 💸 Scalpers and scammers exploit every platform
- 🔒 Platforms can't distinguish real humans from fakes
- 😤 Real people lose opportunities to automated systems

### The Solution
- ✅ OAuth verification (Gmail + LinkedIn)
- 🎓 .edu email bonus for students
- 🔐 Ed25519 cryptographic signatures
- 📛 Portable Auth-Badges that work everywhere

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                 │
│                    (React + Vite + Tailwind)                    │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐   │
│  │ Landing │ │Dashboard│ │  Auth   │ │Verticals│ │ Tickets │   │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                          BACKEND                                 │
│                   (Node.js + Express + Passport)                │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐   │
│  │  Auth   │ │ OAuth   │ │ Badges  │ │ Scoring │ │ Crypto  │   │
│  │ Service │ │ Google  │ │ Service │ │ Service │ │Ed25519  │   │
│  │         │ │LinkedIn │ │         │ │         │ │         │   │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        DATABASE                                  │
│                    (PostgreSQL - Neon)                          │
│  ┌─────────┐ ┌─────────────────┐ ┌───────────┐ ┌─────────────┐ │
│  │  users  │ │ identity_anchors│ │auth_badges│ │verifications│ │
│  └─────────┘ └─────────────────┘ └───────────┘ └─────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    CHROME EXTENSION                              │
│                (Manifest V3 - Zillow Integration)               │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📊 Trust Score System

| Component | Points | Description |
|-----------|--------|-------------|
| Base Account | 30 | Having a TrustBridge account |
| Gmail Connected | +30 | Google OAuth verification |
| LinkedIn Connected | +40 | LinkedIn OAuth verification |
| **.edu Email Bonus** | +15 | Educational institution email |
| **Maximum Score** | **115** | All verifications complete |

### .edu Email Detection
Supports multiple international formats:
- `.edu` (US: stanford.edu, mit.edu)
- `.edu.xx` (International: sydney.edu.au, tsinghua.edu.cn)
- `.ac.xx` (Academic: oxford.ac.uk, u-tokyo.ac.jp)

---

## 🎯 Vertical Landing Pages

| Route | Target Market | Status |
|-------|--------------|--------|
| `/apartments` | Apartment seekers | ✅ Live |
| `/jobs` | Job applicants | ✅ Live |
| `/freelance` | Freelancers | ✅ Live |
| `/dating` | Dating app users | ✅ Live |
| `/tickets` | Concert/event fans | ✅ Live (Pop Art Style) |

### Tickets Page Special Features
- 🎨 Baby blue background + pop art styling
- 🎫 **2 ticket limit** per event (anti-scalper)
- 🖼️ Bold borders, drop shadows, halftone patterns
- 🎯 "Real Fans Only" positioning

---

## 🔧 Tech Stack

### Backend
- **Runtime:** Node.js 20.x
- **Framework:** Express.js
- **Auth:** Passport.js (Google, LinkedIn OIDC)
- **Database:** PostgreSQL (Neon cloud)
- **Crypto:** Ed25519 (@noble/ed25519)
- **Sessions:** express-session

### Frontend
- **Framework:** React 18
- **Build:** Vite
- **Styling:** Tailwind CSS
- **Animations:** Framer Motion
- **Forms:** React Hook Form + Zod
- **State:** Zustand

### Chrome Extension
- **Manifest:** V3
- **Target:** Zillow.com
- **Features:** Badge display on property listings

---

## 📁 Project Structure

```
trustbridge-backend/
├── src/
│   ├── config/
│   │   ├── index.js           # Environment config
│   │   ├── passport.js        # OAuth strategies
│   │   ├── linkedin-oidc-strategy.js  # Custom LinkedIn OIDC
│   │   └── cors.js            # CORS settings
│   ├── db/
│   │   ├── index.js           # Database connection
│   │   ├── migrate.js         # Migration runner
│   │   └── migrations/        # SQL migrations
│   ├── routes/
│   │   ├── auth.routes.js     # OAuth + login/register
│   │   ├── badge.routes.js    # Badge generation/verification
│   │   └── user.routes.js     # User profile + score
│   ├── services/
│   │   ├── auth.service.js    # JWT + password hashing
│   │   ├── badge.service.js   # Badge lifecycle
│   │   ├── crypto.service.js  # Ed25519 signing
│   │   ├── identity.service.js # Anchor management
│   │   └── trustScore.service.js # Score calculation
│   ├── middleware/
│   │   ├── authenticate.js    # JWT verification
│   │   └── errorHandler.js    # Global error handling
│   └── app.js                 # Express app setup
├── scripts/
│   └── deploy-check.sh        # Pre-deploy validation
├── PRODUCTION-DEPLOY.md       # Deployment guide
├── PILOT-OUTREACH-TEMPLATE.md # Sales templates
└── LAUNCHPAD.md              # This file

trustbridge-frontend/
├── src/
│   ├── components/
│   │   ├── Dashboard/         # Dashboard components
│   │   ├── Landing/           # Landing page components
│   │   ├── Auth/              # Auth forms
│   │   ├── ui/                # Reusable UI components
│   │   └── LandingTemplate.jsx # Vertical page template
│   ├── pages/
│   │   ├── Landing.jsx        # Main landing
│   │   ├── Dashboard.jsx      # User dashboard
│   │   ├── Login.jsx          # Login form
│   │   ├── Register.jsx       # Registration form
│   │   ├── ApartmentsLanding.jsx
│   │   ├── JobsLanding.jsx
│   │   ├── FreelanceLanding.jsx
│   │   ├── DatingLanding.jsx
│   │   └── TicketsLanding.jsx # Pop art style
│   ├── store/
│   │   └── useAuthStore.js    # Zustand auth state
│   ├── lib/
│   │   └── api.js             # API client
│   └── App.jsx                # Router setup

trustbridge-extension/
├── src/
│   ├── background.js          # Service worker
│   ├── content.js             # Zillow injection
│   └── popup/                 # Extension popup
└── manifest.json              # MV3 manifest
```

---

## 🚦 Current Status

### ✅ Completed
- [x] User registration/login with JWT
- [x] Google OAuth integration
- [x] LinkedIn OAuth integration (custom OIDC strategy)
- [x] Trust score calculation
- [x] .edu email detection and +15 bonus
- [x] Ed25519 badge signing
- [x] Badge generation and verification
- [x] Dashboard with score breakdown
- [x] 5 vertical landing pages
- [x] Chrome extension (Zillow)
- [x] Production deployment guide
- [x] Pilot outreach templates

### 🔄 Ready for Launch
- [ ] Deploy backend to Railway
- [ ] Deploy frontend to Vercel
- [ ] Update OAuth redirect URIs
- [ ] Publish Google OAuth app
- [ ] Test full production flow
- [ ] Submit Chrome extension to store

---

## 🖥️ Quick Start

### Prerequisites
- Node.js 20+
- PostgreSQL (or Neon account)
- Google Cloud Console project
- LinkedIn Developer app

### Backend Setup
```bash
cd ~/trustbridge-backend
cp .env.example .env  # Configure environment
npm install
npm run migrate       # Run database migrations
npm run dev           # Start development server
```

### Frontend Setup
```bash
cd ~/trustbridge-frontend
npm install
npm run dev           # Start on localhost:5173
```

### Test URLs (Local)
- Main: http://localhost:5173/
- Dashboard: http://localhost:5173/dashboard
- Apartments: http://localhost:5173/apartments
- Jobs: http://localhost:5173/jobs
- Freelance: http://localhost:5173/freelance
- Dating: http://localhost:5173/dating
- **Tickets: http://localhost:5173/tickets** ⭐ NEW
- API Health: http://localhost:3000/api/health

---

## 🔑 Environment Variables

### Backend (.env)
```env
# Database
DATABASE_URL=postgresql://...

# Auth
JWT_SECRET=your-secret-min-32-chars
SESSION_SECRET=your-session-secret

# Crypto (Ed25519)
ED25519_PRIVATE_KEY=base64-encoded
ED25519_PUBLIC_KEY=base64-encoded

# Google OAuth
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxx
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback

# LinkedIn OAuth
LINKEDIN_CLIENT_ID=xxx
LINKEDIN_CLIENT_SECRET=xxx
LINKEDIN_CALLBACK_URL=http://localhost:3000/api/auth/linkedin/callback

# URLs
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:3000
```

---

## 📈 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Get JWT token |
| GET | `/api/auth/google` | Start Google OAuth |
| GET | `/api/auth/google/callback` | Google callback |
| GET | `/api/auth/linkedin` | Start LinkedIn OAuth |
| GET | `/api/auth/linkedin/callback` | LinkedIn callback |

### User
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/user/me` | Get current user |
| GET | `/api/user/score` | Get trust score + breakdown |

### Badges
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/badges/generate` | Generate new badge |
| POST | `/api/badges/verify` | Verify a badge |
| GET | `/api/badges` | List user's badges |
| DELETE | `/api/badges/:token` | Revoke a badge |
| GET | `/api/badges/public-key` | Get signing public key |

### Identity
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/identity/anchors` | List connected accounts |
| DELETE | `/api/identity/:provider` | Disconnect account |

---

## 🎨 Latest Updates (January 2024)

### 🆕 Tickets Landing Page
- New vertical for concert/event ticket exchange
- **Baby blue (#89CFF0) background**
- **Pop art styling:**
  - 4px black borders with drop shadows
  - Hot pink (#FF69B4) accent color
  - Yellow (#FFD700) highlight cards
  - Halftone dot pattern overlay
  - Bold uppercase typography
  - Tilted/rotated card elements
- **2 ticket limit** anti-scalper feature
- "Real Fans Only" messaging

### 🎓 .edu Email Verification
- Automatic detection of educational emails
- +15 bonus trust points
- Supports US (.edu), international (.edu.xx), and academic (.ac.xx) domains
- Visual indicator in dashboard with "BONUS" badge

### 🔧 LinkedIn OAuth Fix
- Custom OIDC strategy (LinkedIn deprecated old API)
- Uses `/v2/userinfo` endpoint
- State-based token passing (survives session regeneration)

### 📄 Documentation
- `PRODUCTION-DEPLOY.md` - Step-by-step deployment
- `PILOT-OUTREACH-TEMPLATE.md` - Sales email templates
- `LAUNCHPAD.md` - This overview document

---

## 🚀 Next Steps

1. **Deploy to Production**
   - Follow `PRODUCTION-DEPLOY.md`
   - Railway (backend) + Vercel (frontend)

2. **Start Pilot Outreach**
   - Use templates in `PILOT-OUTREACH-TEMPLATE.md`
   - Target: Niche rental platforms, job boards

3. **Launch Landing Pages**
   - Post to relevant subreddits
   - Run targeted ads per vertical

4. **Iterate Based on Data**
   - Track conversions per vertical
   - Double down on winner

---

## 📞 Support

- **Issues:** https://github.com/trustbridge/trustbridge/issues
- **Docs:** See `CLAUDE.md` for codebase guidelines

---

*Built with ❤️ to solve the bot tax problem*
