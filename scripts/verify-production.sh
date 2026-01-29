#!/bin/bash

# TrustBridge Production Verification Script
# Run after deployment to verify everything works

# Configuration - UPDATE THESE AFTER DEPLOYMENT
BACKEND_URL="${1:-https://api.trustbridge.io}"
FRONTEND_URL="${2:-https://trustbridge.io}"

echo "🔍 TrustBridge Production Verification"
echo "======================================="
echo "Backend: $BACKEND_URL"
echo "Frontend: $FRONTEND_URL"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

check_pass() { echo -e "${GREEN}✓${NC} $1"; }
check_fail() { echo -e "${RED}✗${NC} $1"; FAILED=1; }
check_warn() { echo -e "${YELLOW}⚠${NC} $1"; }

FAILED=0

# 1. Backend Health
echo "📡 Backend Health Checks..."

HEALTH_RESPONSE=$(curl -sf "$BACKEND_URL/health" 2>&1)
if [ $? -eq 0 ]; then
  check_pass "Backend /health responds"
  echo "   Response: $(echo $HEALTH_RESPONSE | head -c 100)..."
else
  check_fail "Backend /health failed"
fi

# 2. Database Connection
DB_RESPONSE=$(curl -sf "$BACKEND_URL/health/db" 2>&1)
if echo "$DB_RESPONSE" | grep -q "healthy"; then
  check_pass "Database connected"
else
  check_fail "Database connection failed"
  echo "   Response: $DB_RESPONSE"
fi

# 3. Waitlist API
echo ""
echo "📊 API Checks..."

STATS_RESPONSE=$(curl -sf "$BACKEND_URL/api/waitlist/stats" 2>&1)
if echo "$STATS_RESPONSE" | grep -q "total"; then
  check_pass "Waitlist API working"
  echo "   Stats: $STATS_RESPONSE"
else
  check_fail "Waitlist API failed"
fi

# 4. CORS Preflight
echo ""
echo "🔒 CORS Checks..."

CORS_RESPONSE=$(curl -sI -X OPTIONS "$BACKEND_URL/api/waitlist/enlist" \
  -H "Origin: $FRONTEND_URL" \
  -H "Access-Control-Request-Method: POST" 2>&1)

if echo "$CORS_RESPONSE" | grep -qi "access-control-allow"; then
  check_pass "CORS preflight passes"
else
  check_warn "CORS preflight response unclear"
fi

# 5. Frontend
echo ""
echo "🌐 Frontend Checks..."

FRONTEND_RESPONSE=$(curl -sf "$FRONTEND_URL" 2>&1)
if echo "$FRONTEND_RESPONSE" | grep -qi "trustbridge\|root"; then
  check_pass "Frontend loads"
else
  check_fail "Frontend failed to load"
fi

# 6. SSL Checks
echo ""
echo "🔐 SSL Checks..."

if curl -sI "$BACKEND_URL" 2>&1 | grep -qE "HTTP/[12]"; then
  check_pass "Backend HTTPS working"
fi

if curl -sI "$FRONTEND_URL" 2>&1 | grep -qE "HTTP/[12]"; then
  check_pass "Frontend HTTPS working"
fi

# 7. Test Waitlist Signup
echo ""
echo "📝 Waitlist Signup Test..."

TEST_EMAIL="deploy-test-$(date +%s)@example.com"
SIGNUP_RESPONSE=$(curl -sf -X POST "$BACKEND_URL/api/waitlist/enlist" \
  -H "Content-Type: application/json" \
  -H "Origin: $FRONTEND_URL" \
  -d "{\"email\":\"$TEST_EMAIL\",\"source\":\"deploy-verify\",\"vertical\":\"tickets\"}" 2>&1)

if echo "$SIGNUP_RESPONSE" | grep -qE "(success|You're on the list|id)"; then
  check_pass "Waitlist signup works"
else
  check_warn "Waitlist signup response: $SIGNUP_RESPONSE"
fi

# 8. OAuth Endpoints (just check they exist)
echo ""
echo "🔑 OAuth Endpoint Checks..."

GOOGLE_OAUTH=$(curl -sI "$BACKEND_URL/api/auth/google" 2>&1)
if echo "$GOOGLE_OAUTH" | grep -qE "302|Found|accounts.google"; then
  check_pass "Google OAuth endpoint redirects"
else
  check_warn "Google OAuth endpoint may need testing manually"
fi

# Summary
echo ""
echo "======================================="

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}All production checks passed!${NC}"
else
  echo -e "${RED}Some checks failed. Review output above.${NC}"
fi

echo ""
echo "📋 OAuth Redirect URIs to configure:"
echo "   Google:   $BACKEND_URL/api/auth/google/callback"
echo "   LinkedIn: $BACKEND_URL/api/auth/linkedin/callback"
echo ""
echo "📋 DNS Records needed:"
echo "   trustbridge.io     → Vercel"
echo "   api.trustbridge.io → Railway"
