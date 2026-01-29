#!/bin/bash
set -e

echo "🔍 TrustBridge Pre-Deployment Checks"
echo "===================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

check_pass() {
  echo -e "${GREEN}✓${NC} $1"
}

check_fail() {
  echo -e "${RED}✗${NC} $1"
  FAILED=1
}

check_warn() {
  echo -e "${YELLOW}⚠${NC} $1"
}

FAILED=0

# 1. Check required files exist
echo ""
echo "📁 Checking required files..."

[ -f ".env" ] && check_pass ".env exists" || check_fail ".env missing"
[ -f "package.json" ] && check_pass "package.json exists" || check_fail "package.json missing"
[ -f "railway.json" ] && check_pass "railway.json exists" || check_warn "railway.json missing (optional)"
[ -f "Procfile" ] && check_pass "Procfile exists" || check_warn "Procfile missing (optional)"

# 2. Check required environment variables
echo ""
echo "🔐 Checking environment variables..."

# Load .env if it exists
if [ -f ".env" ]; then
    export $(grep -v '^#' .env | xargs 2>/dev/null) || true
fi

required_vars=(
  "DATABASE_URL"
  "JWT_SECRET"
  "ED25519_PRIVATE_KEY"
  "ED25519_PUBLIC_KEY"
  "GOOGLE_CLIENT_ID"
  "GOOGLE_CLIENT_SECRET"
  "FRONTEND_URL"
)

for var in "${required_vars[@]}"; do
  if [ -n "${!var}" ]; then
    check_pass "$var is set"
  else
    check_fail "$var is missing from .env"
  fi
done

# 3. Check LinkedIn vars (optional but recommended)
echo ""
echo "🔗 Checking LinkedIn OAuth (optional)..."

if [ -n "$LINKEDIN_CLIENT_ID" ]; then
  check_pass "LINKEDIN_CLIENT_ID is set"
else
  check_warn "LINKEDIN_CLIENT_ID not set (LinkedIn OAuth disabled)"
fi

# 4. Check dependencies
echo ""
echo "📦 Checking dependencies..."

[ -d "node_modules" ] && check_pass "node_modules exists" || check_warn "Run npm install first"

# 5. Check database migrations
echo ""
echo "🗄️ Checking migrations..."

if [ -d "src/db/migrations" ]; then
  migration_count=$(ls -1 src/db/migrations/*.sql 2>/dev/null | wc -l)
  check_pass "Found $migration_count migration files"
else
  check_warn "No migrations directory found"
fi

# 6. Check for secrets in code
echo ""
echo "🔒 Security checks..."

if grep -r "sk-" --include="*.js" src/ 2>/dev/null | grep -v node_modules; then
  check_warn "Possible API key found in source code"
else
  check_pass "No hardcoded API keys detected"
fi

# 7. Summary
echo ""
echo "===================================="

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}Pre-deployment checks complete!${NC}"
  echo ""
  echo "Next steps:"
  echo "1. Push to GitHub"
  echo "2. Connect repo to Railway"
  echo "3. Set environment variables in Railway dashboard"
  echo "4. Deploy!"
  exit 0
else
  echo -e "${RED}Some checks failed. Fix issues before deploying.${NC}"
  exit 1
fi
