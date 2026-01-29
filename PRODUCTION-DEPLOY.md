# TrustBridge Production Deployment Guide

## Prerequisites

- Railway account (for backend)
- Vercel account (for frontend)
- Google Cloud Console access
- LinkedIn Developer Portal access
- Neon PostgreSQL database (already configured)

## Architecture Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│    Vercel       │────▶│    Railway      │────▶│     Neon        │
│   (Frontend)    │     │   (Backend)     │     │  (PostgreSQL)   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │
        │                       │
        ▼                       ▼
┌─────────────────┐     ┌─────────────────┐
│  Chrome Ext     │     │  OAuth Providers│
│   (Zillow)      │     │ Google/LinkedIn │
└─────────────────┘     └─────────────────┘
```

## Step 1: Pre-Deployment Checks

```bash
# Run the deployment check script
cd ~/trustbridge-backend
./scripts/deploy-check.sh

# Verify all tests pass
npm test

# Build frontend to check for errors
cd ~/trustbridge-frontend
npm run build
```

## Step 2: Deploy Backend to Railway

### 2.1 Install Railway CLI

```bash
npm install -g @railway/cli
```

### 2.2 Login and Initialize

```bash
railway login
cd ~/trustbridge-backend
railway init
```

### 2.3 Set Environment Variables

In Railway dashboard, set these variables:

```env
# Database
DATABASE_URL=postgresql://... (from Neon)

# JWT & Crypto
JWT_SECRET=your-secure-jwt-secret-min-32-chars
ED25519_PRIVATE_KEY=base64-encoded-private-key
ED25519_PUBLIC_KEY=base64-encoded-public-key
SESSION_SECRET=your-secure-session-secret

# OAuth - Google
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxx
GOOGLE_CALLBACK_URL=https://YOUR-RAILWAY-URL/api/auth/google/callback

# OAuth - LinkedIn
LINKEDIN_CLIENT_ID=xxx
LINKEDIN_CLIENT_SECRET=xxx
LINKEDIN_CALLBACK_URL=https://YOUR-RAILWAY-URL/api/auth/linkedin/callback

# URLs
FRONTEND_URL=https://trustbridge.vercel.app

# Config
NODE_ENV=production
PORT=3000
TRUST_PROXY=1
BADGE_EXPIRY_DAYS=90
```

### 2.4 Deploy

```bash
railway up
```

### 2.5 Get Railway URL

Note your Railway URL (e.g., `trustbridge-api.up.railway.app`)

## Step 3: Deploy Frontend to Vercel

### 3.1 Install Vercel CLI

```bash
npm install -g vercel
```

### 3.2 Deploy

```bash
cd ~/trustbridge-frontend
vercel
```

Follow prompts to link to your Vercel account.

### 3.3 Set Environment Variables

In Vercel dashboard, add:

```env
VITE_API_URL=https://trustbridge-api.up.railway.app
```

### 3.4 Redeploy with Environment Variables

```bash
vercel --prod
```

## Step 4: Update OAuth Providers

### 4.1 Google Cloud Console

1. Go to: https://console.cloud.google.com/apis/credentials
2. Click your OAuth 2.0 Client ID
3. **Authorized redirect URIs** - Add:
   ```
   https://YOUR-RAILWAY-URL/api/auth/google/callback
   ```
4. **Authorized JavaScript origins** - Add:
   ```
   https://trustbridge.vercel.app
   https://YOUR-RAILWAY-URL
   ```
5. Go to **OAuth consent screen**
6. Click **PUBLISH APP** (move from Testing to Production)

### 4.2 LinkedIn Developer Portal

1. Go to: https://www.linkedin.com/developers/apps
2. Select your app
3. Go to **Auth** tab
4. Under **OAuth 2.0 settings**, add redirect URL:
   ```
   https://YOUR-RAILWAY-URL/api/auth/linkedin/callback
   ```
5. Save changes

## Step 5: Update Chrome Extension

Edit `~/trustbridge-extension/src/config.js`:

```javascript
export const API_BASE_URL = 'https://trustbridge-api.up.railway.app';
```

Rebuild and reload the extension:

```bash
cd ~/trustbridge-extension
npm run build
```

Then reload in `chrome://extensions/`

## Step 6: Test Production Deployment

### 6.1 Basic Flow Test

1. Visit `https://trustbridge.vercel.app`
2. Click "Get Started" / "Register"
3. Create a new test account
4. Verify you reach the dashboard

### 6.2 OAuth Test

1. From dashboard, click "Connect Gmail"
2. Complete Google OAuth flow
3. Verify redirect back to dashboard with success toast
4. Repeat for LinkedIn

### 6.3 Badge Generation Test

1. With at least one provider connected, click "Generate Badge"
2. Verify badge appears in the list
3. Copy badge token

### 6.4 Extension Test

1. Go to https://www.zillow.com
2. Find a property listing
3. Verify TrustBridge badge appears (if user is logged in)

## Step 7: Monitoring & Troubleshooting

### View Logs

```bash
# Railway backend logs
railway logs

# Or in Railway dashboard under Deployments > Logs
```

### Common Issues

**OAuth Redirect Mismatch**
- Error: "redirect_uri_mismatch"
- Fix: Ensure callback URLs in Railway env match exactly what's in OAuth provider console

**CORS Errors**
- Check `src/config/cors.js` includes production frontend URL
- Verify `credentials: true` is set

**Database Connection Failed**
- Verify `DATABASE_URL` is correct in Railway
- Check Neon dashboard for connection limits

**Session Not Persisting**
- Ensure `TRUST_PROXY=1` is set (Railway uses proxy)
- Check `SESSION_SECRET` is set

### Health Check

```bash
curl https://YOUR-RAILWAY-URL/api/health
```

Should return:
```json
{"status":"ok","timestamp":"..."}
```

## Production Checklist

- [ ] Backend deployed to Railway
- [ ] Frontend deployed to Vercel
- [ ] All environment variables set in Railway
- [ ] `VITE_API_URL` set in Vercel
- [ ] Google OAuth redirect URI updated
- [ ] Google OAuth app published (not in Testing)
- [ ] LinkedIn OAuth redirect URL updated
- [ ] Full registration flow tested
- [ ] Google OAuth flow tested
- [ ] LinkedIn OAuth flow tested
- [ ] Badge generation tested
- [ ] Chrome extension updated with production API URL
- [ ] Extension tested on Zillow

## Rollback Procedure

If issues occur:

```bash
# Railway - rollback to previous deployment
railway deployments
railway rollback <deployment-id>

# Vercel - rollback via dashboard
# Go to Deployments > click previous deployment > Promote to Production
```

## Custom Domain Setup (Optional)

### Backend (Railway)

1. In Railway dashboard, go to Settings > Domains
2. Add custom domain: `api.trustbridge.io`
3. Add CNAME record in your DNS: `api.trustbridge.io` → Railway's provided CNAME

### Frontend (Vercel)

1. In Vercel dashboard, go to Settings > Domains
2. Add custom domain: `trustbridge.io`
3. Follow DNS instructions (usually A record or CNAME)

After custom domains:
- Update `FRONTEND_URL` in Railway to `https://trustbridge.io`
- Update `VITE_API_URL` in Vercel to `https://api.trustbridge.io`
- Update OAuth callback URLs in Google/LinkedIn consoles
