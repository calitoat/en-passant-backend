# OAuth Redirect URIs for Production

## Google Cloud Console
**URL:** https://console.cloud.google.com/apis/credentials

### Authorized JavaScript Origins
```
https://trustbridge.io
https://www.trustbridge.io
https://api.trustbridge.io
http://localhost:5173 (development)
http://localhost:3000 (development)
```

### Authorized Redirect URIs
```
https://api.trustbridge.io/api/auth/google/callback
http://localhost:3000/api/auth/google/callback (development)
```

---

## LinkedIn Developer Portal
**URL:** https://www.linkedin.com/developers/apps

### Authorized Redirect URLs
```
https://api.trustbridge.io/api/auth/linkedin/callback
http://localhost:3000/api/auth/linkedin/callback (development)
```

### OAuth 2.0 Scopes Required
- `openid`
- `profile`
- `email`

---

## Verification Checklist

### Google OAuth
- [ ] Go to Google Cloud Console → APIs & Services → Credentials
- [ ] Select your OAuth 2.0 Client ID
- [ ] Add production JavaScript origins (listed above)
- [ ] Add production redirect URI
- [ ] Go to OAuth consent screen
- [ ] Ensure app is in "Production" mode (not "Testing")
- [ ] If in Testing mode, either:
  - Add test users manually, OR
  - Submit for verification to allow all users

### LinkedIn OAuth
- [ ] Go to LinkedIn Developer Portal → Your App
- [ ] Go to Auth tab
- [ ] Add production redirect URL
- [ ] Verify scopes include: openid, profile, email
- [ ] If app needs verification, submit for review

---

## Environment Variables to Set

### Railway (Backend)
```
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_CALLBACK_URL=https://api.trustbridge.io/api/auth/google/callback

LINKEDIN_CLIENT_ID=your-linkedin-client-id
LINKEDIN_CLIENT_SECRET=your-linkedin-client-secret
LINKEDIN_CALLBACK_URL=https://api.trustbridge.io/api/auth/linkedin/callback

FRONTEND_URL=https://trustbridge.io
```

---

## Testing OAuth After Deployment

### Manual Test Steps
1. Go to https://trustbridge.io
2. Click "Register" and create a new account
3. Click "Connect Gmail":
   - Should redirect to Google consent screen
   - After consent, should redirect back to dashboard
   - Trust score should increase by 30 points
   - If .edu email: +15 bonus points
4. Click "Connect LinkedIn":
   - Should redirect to LinkedIn consent screen
   - After consent, should redirect back to dashboard
   - Trust score should increase by 40 points
5. Verify total trust score = 30 (base) + 30 (Gmail) + 40 (LinkedIn) + 15 (.edu if applicable)

### Common OAuth Issues

**"redirect_uri_mismatch" Error:**
- Check that redirect URI in console matches EXACTLY (no trailing slash)
- Ensure protocol is https in production

**"Access blocked: App has not completed verification":**
- Google OAuth consent screen is in "Testing" mode
- Either add user as test user OR submit for verification

**OAuth works in dev but not production:**
- Check that production redirect URIs are added
- Verify FRONTEND_URL env var is set correctly
- Check Railway logs for callback errors

---

## Quick Reference

| Provider | Callback URL |
|----------|--------------|
| Google | `https://api.trustbridge.io/api/auth/google/callback` |
| LinkedIn | `https://api.trustbridge.io/api/auth/linkedin/callback` |
