# 🚀 TrustBridge Handoff Document

**Date:** January 26, 2025
**Status:** LinkedIn OAuth Complete, Google OAuth Blocked (needs user action)

---

## 📋 Project Summary

TrustBridge is an identity verification system for AI agents that solves the "bot tax" problem. Users connect identity providers (Gmail, LinkedIn), receive a Trust Score (0-100), and generate Ed25519-signed badges that platforms can verify.

**Trust Score Formula:**
- Base account: 30 points
- Gmail connected: +30 points
- LinkedIn connected: +40 points
- **Maximum: 100 points**

---

## 🗂️ Project Structure

```
~/trustbridge-backend/     # Express.js API (Node 20+, ES Modules)
~/trustbridge-frontend/    # React + Vite frontend
```

### Key Backend Files:
| File | Purpose |
|------|---------|
| `src/config/passport.js` | Google + LinkedIn OAuth strategies |
| `src/routes/auth.routes.js` | OAuth routes (/google, /linkedin) |
| `src/services/identity.service.js` | Identity anchor management |
| `src/services/trustScore.service.js` | Trust score calculation |
| `src/app.js` | Express app with security middleware |
| `.env` | Environment variables (credentials) |

### Key Frontend Files:
| File | Purpose |
|------|---------|
| `src/pages/Dashboard.jsx` | Main dashboard with connect buttons |
| `src/pages/Login.jsx` | Login with pending OAuth handling |
| `src/store/useAuthStore.js` | Auth state + OAuth methods |
| `src/lib/api.js` | API client with OAuth URL helpers |

---

## ✅ What's Working

1. **User Registration/Login** - JWT-based auth with Argon2 password hashing
2. **LinkedIn OAuth** - Fully implemented and tested
3. **Trust Score Calculation** - 30 base + 30 Gmail + 40 LinkedIn
4. **Badge Generation** - Ed25519 signed badges
5. **Badge Verification** - Public endpoint for platforms
6. **Security Middleware** - Helmet, rate limiting, compression
7. **Database** - Neon Postgres (cloud, already has data)

---

## ❌ What's Blocked

### Google OAuth - Error 403: access_denied

**Root Cause:** Google OAuth app is in "Testing" mode. User's email not added as test user.

**User Must Do:**
1. Go to: https://console.cloud.google.com/apis/credentials/consent
2. Scroll to "Test users" section
3. Click "+ ADD USERS"
4. Add: `papapaypal2022@gmail.com`
5. Save

**Also Needed - Redirect URI:**
1. Go to: https://console.cloud.google.com/apis/credentials
2. Click OAuth 2.0 Client ID
3. Add redirect URI: `http://localhost:3000/api/auth/google/callback`
4. Save

---

## 🔧 Environment Variables

### Backend (.env) - Already configured:
```env
PORT=3000
NODE_ENV=development
DATABASE_URL=postgresql://user:password@your-db-host/dbname?sslmode=require
JWT_SECRET=your-jwt-secret-here
ED25519_PRIVATE_KEY=your-ed25519-private-key
ED25519_PUBLIC_KEY=your-ed25519-public-key
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback
LINKEDIN_CLIENT_ID=your-linkedin-client-id
LINKEDIN_CLIENT_SECRET=your-linkedin-client-secret
LINKEDIN_CALLBACK_URL=http://localhost:3000/api/auth/linkedin/callback
SESSION_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6
FRONTEND_URL=http://localhost:5173
```

### Frontend (.env) - If needed:
```env
VITE_API_URL=http://localhost:3000
```

---

## 🚀 How to Start

```bash
# Terminal 1 - Backend
cd ~/trustbridge-backend
npm run dev

# Terminal 2 - Frontend
cd ~/trustbridge-frontend
npm run dev
```

**URLs:**
- Frontend: http://localhost:5173
- Backend: http://localhost:3000
- Health check: http://localhost:3000/api/health

---

## 🔄 OAuth Flow

### LinkedIn (Working):
```
User clicks "Connect LinkedIn"
  → Frontend calls connectLinkedIn() in useAuthStore
  → Redirects to: /api/auth/linkedin?token=JWT
  → Backend stores JWT in session, redirects to LinkedIn
  → User authenticates on LinkedIn
  → LinkedIn redirects to: /api/auth/linkedin/callback
  → Backend saves identity anchor, redirects to dashboard
  → Dashboard shows ?connected=linkedin, displays toast
```

### Google (Same flow, currently blocked):
```
User clicks "Connect Gmail"
  → Frontend calls connectGoogle() in useAuthStore
  → Redirects to: /api/auth/google?token=JWT
  → [BLOCKED HERE - needs test user + redirect URI in Google Console]
```

---

## 📊 Database Schema

```sql
-- Users table
users (id, email, password_hash, created_at)

-- Identity anchors (Gmail, LinkedIn connections)
identity_anchors (
  id, user_id, provider, provider_user_id,
  account_created_at, email_address, connection_count,
  profile_url, metadata, connected_at, last_verified_at
)

-- Auth badges
auth_badges (
  id, user_id, badge_token, trust_score,
  payload, signature, expires_at, revoked, created_at
)

-- Badge verifications (audit log)
badge_verifications (id, badge_id, verified_at, verifier_ip)
```

---

## 🛡️ Security Features Added

1. **Helmet.js** - Security headers (HSTS, X-Frame-Options, etc.)
2. **Rate Limiting:**
   - General: 100 requests / 15 minutes
   - Auth endpoints: 20 requests / 15 minutes
3. **Compression** - Gzip responses
4. **CORS** - Restricted to allowed origins
5. **Trust Proxy** - Ready for load balancers

---

## 📝 Files Created This Session

| File | Purpose |
|------|---------|
| `PRODUCTION.md` | Full production deployment guide |
| `.env.production.example` | Production env template |
| `src/pages/Privacy.jsx` | Privacy policy page (for Google verification) |
| `src/pages/Terms.jsx` | Terms of service page |

---

## 🎯 Immediate Next Steps

### Priority 1: Fix Google OAuth (User action required)
1. Add test user in Google Cloud Console
2. Add redirect URI in Google Cloud Console
3. Test Gmail connection

### Priority 2: Test Full Flow
1. Register new user
2. Connect Gmail (+30 points)
3. Connect LinkedIn (+40 points)
4. Verify trust score = 100
5. Generate badge
6. Verify badge works

### Priority 3: Production Deployment
See `PRODUCTION.md` for full guide:
1. Deploy backend to Render/Railway
2. Deploy frontend to Vercel
3. Update OAuth redirect URIs
4. Publish Google OAuth app

---

## 🐛 Known Issues

1. **LinkedIn "connected" may be mock data** - If user connected LinkedIn before the real OAuth was implemented, they may have mock data. Solution: Disconnect and reconnect.

2. **Session may expire** - If OAuth callback fails with "Session expired", the user needs to try again (session timeout during OAuth flow).

---

## 🔗 External Resources

- **Google Cloud Console:** https://console.cloud.google.com/apis/credentials
- **LinkedIn Developer Portal:** https://www.linkedin.com/developers/apps
- **Neon Database:** https://console.neon.tech

---

## 💡 Tips for Next Session

1. Always check if servers are running: `lsof -i :3000` and `lsof -i :5173`
2. Backend logs show OAuth flow: look for `[LinkedIn OAuth]` or `[Google OAuth]` prefixes
3. If OAuth fails, check the redirect URL matches exactly (http vs https, trailing slashes)
4. The `.env` file had whitespace issues before - was fixed, but watch for this
5. Use `npm run dev` for hot reload during development

---

## 📞 User Context

- **User email:** papapaypal2022@gmail.com
- **Goal:** Production-ready for 100k users by tomorrow
- **Current blocker:** Google OAuth needs manual configuration in Google Cloud Console

---

**End of Handoff Document**
