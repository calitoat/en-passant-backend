# TrustBridge Production Deployment Checklist

## Pre-Deployment (Do These First)

### Code Preparation
- [ ] All code committed to GitHub
- [ ] No hardcoded localhost URLs in frontend (uses env vars with fallback)
- [ ] CORS configured for production domains
- [ ] Health check endpoints working (`/health`, `/health/db`, `/health/ready`)
- [ ] `.env.production.template` created (without secrets)
- [ ] `railway.json` created
- [ ] `vercel.json` created

### Railway Setup (Backend)
- [ ] Railway account created at https://railway.app
- [ ] New project created in Railway
- [ ] GitHub repo connected to Railway project
- [ ] Environment variables set in Railway dashboard:
  - [ ] `NODE_ENV=production`
  - [ ] `DATABASE_URL` (from Neon)
  - [ ] `JWT_SECRET` (generate: `openssl rand -base64 32`)
  - [ ] `SESSION_SECRET` (generate: `openssl rand -base64 32`)
  - [ ] `ED25519_PRIVATE_KEY` (from `npm run generate-keys`)
  - [ ] `ED25519_PUBLIC_KEY` (from `npm run generate-keys`)
  - [ ] `GOOGLE_CLIENT_ID`
  - [ ] `GOOGLE_CLIENT_SECRET`
  - [ ] `GOOGLE_CALLBACK_URL=https://api.trustbridge.io/api/auth/google/callback`
  - [ ] `LINKEDIN_CLIENT_ID`
  - [ ] `LINKEDIN_CLIENT_SECRET`
  - [ ] `LINKEDIN_CALLBACK_URL=https://api.trustbridge.io/api/auth/linkedin/callback`
  - [ ] `FRONTEND_URL=https://trustbridge.io`
  - [ ] `TRUST_PROXY=1`
- [ ] Custom domain configured: `api.trustbridge.io`
- [ ] SSL certificate provisioned (automatic with Railway)

### Vercel Setup (Frontend)
- [ ] Vercel account created at https://vercel.com
- [ ] GitHub repo connected to Vercel project
- [ ] Environment variables set:
  - [ ] `VITE_API_URL=https://api.trustbridge.io`
- [ ] Custom domain configured: `trustbridge.io`
- [ ] SSL certificate provisioned (automatic with Vercel)

### DNS Configuration
- [ ] Domain purchased: `trustbridge.io`
- [ ] DNS records configured:
  - [ ] `trustbridge.io` → Vercel (CNAME to `cname.vercel-dns.com`)
  - [ ] `www.trustbridge.io` → Vercel
  - [ ] `api.trustbridge.io` → Railway (CNAME from Railway dashboard)
- [ ] DNS propagation verified (can take 24-48 hours)
- [ ] Test: `dig trustbridge.io` and `dig api.trustbridge.io`

### OAuth Configuration
- [ ] Google Cloud Console: Production redirect URIs added
- [ ] Google Cloud Console: App moved out of "Testing" mode (or test users added)
- [ ] LinkedIn Developer: Production redirect URLs added
- [ ] LinkedIn Developer: App verified (if needed for user count)

---

## Deployment Day

### Deploy Backend First
1. [ ] Push code to main branch (or trigger deploy in Railway)
2. [ ] Watch Railway logs for successful start
3. [ ] Verify: `curl https://api.trustbridge.io/health`
4. [ ] Verify: `curl https://api.trustbridge.io/health/db`
5. [ ] Run: `./scripts/verify-production.sh https://api.trustbridge.io https://trustbridge.io`

### Deploy Frontend
1. [ ] Push code to main branch (or trigger deploy in Vercel)
2. [ ] Watch Vercel build logs for success
3. [ ] Verify: `curl https://trustbridge.io` returns HTML
4. [ ] Open in browser, verify countdown timer shows correct date

### Post-Deployment Verification
- [ ] Register new test account
- [ ] Gmail OAuth flow works (redirects properly, returns to dashboard)
- [ ] LinkedIn OAuth flow works
- [ ] Trust score calculates correctly (30 base + 30 Gmail + 40 LinkedIn + 15 .edu)
- [ ] Badge generation works
- [ ] Waitlist signup works (test all 5 verticals)
- [ ] QR code URLs resolve correctly (e.g., `/tickets?source=test`)
- [ ] Mobile responsive (test on phone)

---

## Launch Day (Feb 8, 2026)

### Morning Checks (6 AM PST)
- [ ] All endpoints responding
- [ ] Database connection stable
- [ ] No error spikes in logs
- [ ] Verify countdown shows "WE'RE LIVE!" or similar

### Go Live (7 PM PST)
- [ ] Remove any "Coming Soon" text if present
- [ ] Verify waitlist form submissions work
- [ ] Post QR posters at venues
- [ ] Monitor signup volume in real-time
- [ ] Check `/api/waitlist/stats` periodically

### Post-Launch Monitoring
- [ ] Watch for error rates in Railway logs
- [ ] Monitor database connections in Neon dashboard
- [ ] Check Vercel analytics for traffic spikes
- [ ] Respond to user issues promptly

---

## Emergency Procedures

### If Backend Goes Down
1. Check Railway dashboard for errors
2. Check Railway logs: `railway logs`
3. Verify DATABASE_URL is correct
4. Restart service in Railway dashboard

### If Frontend Goes Down
1. Check Vercel dashboard for build errors
2. Redeploy from Vercel dashboard
3. Verify VITE_API_URL is correct

### If OAuth Fails
1. Check browser console for error messages
2. Verify redirect URIs match EXACTLY in Google/LinkedIn consoles
3. Check Railway logs for callback errors
4. Ensure FRONTEND_URL is set correctly

---

## Status Pages
- Railway: https://status.railway.app
- Vercel: https://www.vercel-status.com
- Neon: https://neon.tech/status

---

## Support Contacts
- Railway: https://railway.app/help
- Vercel: https://vercel.com/support
- Neon: https://neon.tech/docs/introduction/support
