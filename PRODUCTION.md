# TrustBridge Production Deployment Guide

This guide covers deploying TrustBridge to production for 100,000+ users.

## Infrastructure Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Vercel/CDN    │────▶│  Backend API    │────▶│  Neon Postgres  │
│   (Frontend)    │     │ (Render/Railway)│     │   (Database)    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                      │
         │              ┌───────┴───────┐
         │              │               │
         ▼              ▼               ▼
    ┌─────────┐   ┌─────────┐    ┌──────────┐
    │  Users  │   │ Google  │    │ LinkedIn │
    │ 100k+   │   │  OAuth  │    │  OAuth   │
    └─────────┘   └─────────┘    └──────────┘
```

## Step 1: Google OAuth Production Setup

### 1.1 Add Test User (Immediate Fix)
1. Go to: https://console.cloud.google.com/apis/credentials/consent
2. Scroll to "Test users"
3. Click "+ ADD USERS"
4. Add: `papapaypal2022@gmail.com`
5. Save

### 1.2 Publish OAuth App (For All Users)
1. Go to: https://console.cloud.google.com/apis/credentials/consent
2. Click "PUBLISH APP"
3. Confirm publishing

**Note:** This shows an "unverified app" warning to users. For no warning, complete verification (Step 1.3).

### 1.3 Google Verification (Optional - 2-6 weeks)
Required for:
- Removing "unverified app" warning
- Sensitive scopes (gmail.metadata)

Submit at: https://support.google.com/cloud/answer/9110914

Requirements:
- Privacy Policy URL: `https://trustbridge.app/privacy`
- Terms of Service URL: `https://trustbridge.app/terms`
- Homepage: `https://trustbridge.app`
- App logo (minimum 120x120px)
- YouTube video demo of OAuth flow

## Step 2: LinkedIn OAuth Production Setup

### 2.1 Current Status
LinkedIn OAuth works immediately for testing. For production:

1. Go to: https://www.linkedin.com/developers/apps
2. Select your app
3. Go to "Settings" tab
4. Update:
   - App name: TrustBridge
   - Privacy Policy URL: https://trustbridge.app/privacy
   - Terms of Service URL: https://trustbridge.app/terms

### 2.2 Add Production Redirect URI
1. Go to "Auth" tab
2. Add redirect URL: `https://api.trustbridge.app/api/auth/linkedin/callback`
3. Save

## Step 3: Database (Neon Postgres)

### 3.1 Current Setup
Your Neon database is already configured and can handle 100k+ users.

### 3.2 Production Optimizations
1. Go to: https://console.neon.tech
2. Select your project
3. Go to "Settings" → "Compute"
4. Upgrade to "Scale" plan for:
   - Auto-scaling (0.25 to 4 vCPUs)
   - Connection pooling (10,000 connections)
   - Point-in-time recovery

### 3.3 Connection Pooling
Use the pooled connection string (already configured):
```
postgresql://user:pass@ep-xxx-pooler.neon.tech/neondb?sslmode=require
```

## Step 4: Backend Deployment

### Option A: Render.com (Recommended)
1. Go to: https://render.com
2. Create new "Web Service"
3. Connect GitHub repo
4. Configure:
   - Name: `trustbridge-api`
   - Region: Oregon (closest to Neon)
   - Branch: `main`
   - Build Command: `npm install`
   - Start Command: `npm start`
5. Add environment variables from `.env.production.example`
6. Deploy

### Option B: Railway.app
1. Go to: https://railway.app
2. Create new project from GitHub
3. Add environment variables
4. Deploy

### Option C: DigitalOcean App Platform
1. Go to: https://cloud.digitalocean.com/apps
2. Create app from GitHub
3. Configure environment variables
4. Deploy

## Step 5: Frontend Deployment

### Vercel (Recommended)
1. Go to: https://vercel.com
2. Import GitHub repo (trustbridge-frontend)
3. Configure:
   - Framework: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. Add environment variable:
   ```
   VITE_API_URL=https://api.trustbridge.app
   ```
5. Deploy

### Custom Domain
1. Add domain in Vercel: `trustbridge.app`
2. Update DNS:
   ```
   A     @     76.76.21.21
   CNAME www   cname.vercel-dns.com
   ```

## Step 6: Production Environment Variables

Update your backend .env with production values:

```env
# Server
NODE_ENV=production
PORT=3000

# Database (use pooled connection)
DATABASE_URL=postgresql://...@...-pooler.neon.tech/neondb?sslmode=require

# JWT (generate new secure secret)
JWT_SECRET=<64-byte-hex-secret>

# Ed25519 Keys (keep existing or generate new)
ED25519_PRIVATE_KEY=<your-key>
ED25519_PUBLIC_KEY=<your-key>

# Google OAuth (update callback URL)
GOOGLE_CLIENT_ID=277278852742-...
GOOGLE_CLIENT_SECRET=GOCSPX-...
GOOGLE_CALLBACK_URL=https://api.trustbridge.app/api/auth/google/callback

# LinkedIn OAuth (update callback URL)
LINKEDIN_CLIENT_ID=86gh10gcugbzgm
LINKEDIN_CLIENT_SECRET=WPL_AP1...
LINKEDIN_CALLBACK_URL=https://api.trustbridge.app/api/auth/linkedin/callback

# Session
SESSION_SECRET=<32-byte-hex-secret>

# Frontend
FRONTEND_URL=https://trustbridge.app

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
TRUST_PROXY=1
```

## Step 7: Update OAuth Redirect URIs

### Google Cloud Console
1. Go to: https://console.cloud.google.com/apis/credentials
2. Click your OAuth client ID
3. Add Authorized redirect URI:
   ```
   https://api.trustbridge.app/api/auth/google/callback
   ```
4. Save

### LinkedIn Developer Portal
1. Go to: https://www.linkedin.com/developers/apps
2. Select your app → Auth tab
3. Add redirect URL:
   ```
   https://api.trustbridge.app/api/auth/linkedin/callback
   ```
4. Save

## Step 8: SSL/HTTPS

Both Render and Vercel provide automatic SSL certificates. No action needed.

## Step 9: Monitoring & Scaling

### Health Check Endpoint
```
GET https://api.trustbridge.app/api/health
```

### Recommended Monitoring
- **Uptime:** UptimeRobot (free) or Better Uptime
- **Errors:** Sentry.io
- **Analytics:** Vercel Analytics (frontend)

### Auto-Scaling
- Render: Automatically scales with "Team" plan
- Neon: Auto-scales compute on "Scale" plan

## Step 10: Security Checklist

- [x] Helmet.js for security headers
- [x] Rate limiting (100 req/15min general, 20 req/15min auth)
- [x] CORS restricted to allowed origins
- [x] HTTPS only in production
- [x] Secure session cookies
- [x] Password hashing with Argon2
- [x] JWT token expiration
- [x] Ed25519 badge signatures

## Capacity Planning

### Current Architecture Supports:
| Component | Capacity |
|-----------|----------|
| Neon Postgres (Scale) | 10,000 concurrent connections |
| Render (Team) | Auto-scaling, 512MB-4GB RAM |
| Vercel | Unlimited requests (CDN) |
| Rate Limit | 100 req/15min per IP |

### Estimated Daily Active Users:
- **10,000 DAU:** No changes needed
- **50,000 DAU:** Upgrade Neon to Pro
- **100,000 DAU:** Add Redis caching, multiple backend instances

## Quick Deploy Checklist

- [ ] Add test user to Google OAuth
- [ ] Publish Google OAuth app (or submit for verification)
- [ ] Update LinkedIn redirect URI for production
- [ ] Deploy backend to Render/Railway
- [ ] Deploy frontend to Vercel
- [ ] Update OAuth redirect URIs to production URLs
- [ ] Update .env with production values
- [ ] Test full OAuth flow in production
- [ ] Set up monitoring

## Support

If you encounter issues:
1. Check backend logs: `render logs` or Railway dashboard
2. Check frontend console for errors
3. Verify environment variables are set correctly
4. Test OAuth flow step by step
