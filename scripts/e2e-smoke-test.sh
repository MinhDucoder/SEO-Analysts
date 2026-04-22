#!/usr/bin/env bash
#
# E2E Smoke Test — Full SEO Audit Pipeline
#
# Usage:
#   ./scripts/e2e-smoke-test.sh
#
# Prerequisites:
#   - All 9 containers running: docker compose up -d --build
#   - curl and jq installed
#
# What it tests:
#   1. Health check — all downstream services healthy
#   2. Register user
#   3. Login, get JWT
#   4. Create audit (POST /audits) for https://example.com
#   5. Poll audit status until 'completed' (timeout 90s)
#   6. Verify audit has seo_score and results
#   7. Test PDF export
#   8. Cleanup
#
set -euo pipefail

BASE_URL="${GATEWAY_URL:-http://localhost:3000/api/v1}"
TIMEOUT_SECONDS=90
POLL_INTERVAL=3
TEST_URL="https://example.com"
TIMESTAMP=$(date +%s)
TEST_EMAIL="e2e-test-${TIMESTAMP}@test.local"
TEST_PASSWORD="Test1234!@#"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

pass=0
fail=0

log_pass() { echo -e "${GREEN}[PASS]${NC} $1"; ((pass++)); }
log_fail() { echo -e "${RED}[FAIL]${NC} $1"; ((fail++)); }
log_info() { echo -e "${YELLOW}[INFO]${NC} $1"; }

cleanup() {
  log_info "Tests complete: ${pass} passed, ${fail} failed"
  if [ "$fail" -gt 0 ]; then
    exit 1
  fi
  exit 0
}
trap cleanup EXIT

# ─── Prerequisite check ───
for cmd in curl jq; do
  if ! command -v "$cmd" &>/dev/null; then
    echo "ERROR: $cmd is required but not installed."
    exit 1
  fi
done

echo "========================================"
echo "  SEO Analyst Platform — E2E Smoke Test"
echo "========================================"
echo ""

# ─── Test 1: Health Check ───
log_info "Test 1: Health check"
HEALTH=$(curl -sf "${BASE_URL}/health" 2>/dev/null || echo '{}')
HEALTH_STATUS=$(echo "$HEALTH" | jq -r '.status // empty')

if [ "$HEALTH_STATUS" = "ok" ]; then
  log_pass "Gateway health check returned status=ok"
else
  log_fail "Gateway health check failed: $HEALTH"
fi

# Check downstream services
for svc in database redis crawler analyzer report; do
  SVC_UP=$(echo "$HEALTH" | jq -r ".services.${svc} // false")
  if [ "$SVC_UP" = "true" ]; then
    log_pass "Downstream service '${svc}' is healthy"
  else
    log_fail "Downstream service '${svc}' is NOT healthy"
  fi
done

# ─── Test 2: Register User ───
log_info "Test 2: Register user (${TEST_EMAIL})"
REGISTER_RESP=$(curl -sf -X POST "${BASE_URL}/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${TEST_EMAIL}\",\"password\":\"${TEST_PASSWORD}\",\"name\":\"E2E Test User\"}" \
  2>/dev/null || echo '{"error":"failed"}')

REGISTER_ID=$(echo "$REGISTER_RESP" | jq -r '.id // .userId // empty')
if [ -n "$REGISTER_ID" ]; then
  log_pass "User registered: id=${REGISTER_ID}"
else
  log_fail "Registration failed: ${REGISTER_RESP}"
fi

# ─── Test 3: Login ───
log_info "Test 3: Login"
LOGIN_RESP=$(curl -sf -X POST "${BASE_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${TEST_EMAIL}\",\"password\":\"${TEST_PASSWORD}\"}" \
  2>/dev/null || echo '{"error":"failed"}')

ACCESS_TOKEN=$(echo "$LOGIN_RESP" | jq -r '.accessToken // .access_token // empty')
if [ -n "$ACCESS_TOKEN" ]; then
  log_pass "Login successful, got JWT"
else
  log_fail "Login failed: ${LOGIN_RESP}"
  # Cannot continue without token
  exit 1
fi

AUTH_HEADER="Authorization: Bearer ${ACCESS_TOKEN}"

# ─── Test 4: Create Audit ───
log_info "Test 4: Create audit for ${TEST_URL}"
AUDIT_RESP=$(curl -sf -X POST "${BASE_URL}/audits" \
  -H "Content-Type: application/json" \
  -H "${AUTH_HEADER}" \
  -d "{\"url\":\"${TEST_URL}\"}" \
  2>/dev/null || echo '{"error":"failed"}')

AUDIT_ID=$(echo "$AUDIT_RESP" | jq -r '.id // .auditId // empty')
if [ -n "$AUDIT_ID" ]; then
  log_pass "Audit created: id=${AUDIT_ID}"
else
  log_fail "Create audit failed: ${AUDIT_RESP}"
  exit 1
fi

# ─── Test 5: Poll Until Completed ───
log_info "Test 5: Polling audit status (timeout ${TIMEOUT_SECONDS}s)..."
ELAPSED=0
FINAL_STATUS=""

while [ "$ELAPSED" -lt "$TIMEOUT_SECONDS" ]; do
  POLL_RESP=$(curl -sf -H "${AUTH_HEADER}" "${BASE_URL}/audits/${AUDIT_ID}" 2>/dev/null || echo '{}')
  CURRENT_STATUS=$(echo "$POLL_RESP" | jq -r '.status // empty')
  CURRENT_PROGRESS=$(echo "$POLL_RESP" | jq -r '.progress // "?"')

  echo -ne "\r  Status: ${CURRENT_STATUS:-unknown} | Progress: ${CURRENT_PROGRESS}% | Elapsed: ${ELAPSED}s   "

  if [ "$CURRENT_STATUS" = "completed" ] || [ "$CURRENT_STATUS" = "COMPLETED" ]; then
    FINAL_STATUS="completed"
    echo ""
    break
  elif [ "$CURRENT_STATUS" = "failed" ] || [ "$CURRENT_STATUS" = "FAILED" ]; then
    FINAL_STATUS="failed"
    echo ""
    break
  fi

  sleep "$POLL_INTERVAL"
  ELAPSED=$((ELAPSED + POLL_INTERVAL))
done

if [ "$FINAL_STATUS" = "completed" ]; then
  log_pass "Audit completed in ${ELAPSED}s"
elif [ "$FINAL_STATUS" = "failed" ]; then
  ERROR_MSG=$(echo "$POLL_RESP" | jq -r '.errorMessage // "unknown"')
  log_fail "Audit failed: ${ERROR_MSG}"
else
  echo ""
  log_fail "Audit timed out after ${TIMEOUT_SECONDS}s (status: ${CURRENT_STATUS:-unknown})"
fi

# ─── Test 6: Verify Audit Results ───
log_info "Test 6: Verify audit has results"
AUDIT_DETAIL=$(curl -sf -H "${AUTH_HEADER}" "${BASE_URL}/audits/${AUDIT_ID}" 2>/dev/null || echo '{}')

SEO_SCORE=$(echo "$AUDIT_DETAIL" | jq -r '.seoScore // .seo_score // empty')
if [ -n "$SEO_SCORE" ] && [ "$SEO_SCORE" != "null" ]; then
  log_pass "Audit has SEO score: ${SEO_SCORE}"
else
  log_fail "Audit missing SEO score"
fi

# Check for report data via the report endpoint
REPORT_RESP=$(curl -sf -H "${AUTH_HEADER}" "${BASE_URL}/audits/${AUDIT_ID}/report" 2>/dev/null || echo '{}')
REPORT_ID=$(echo "$REPORT_RESP" | jq -r '.id // .reportId // empty')
if [ -n "$REPORT_ID" ] && [ "$REPORT_ID" != "null" ]; then
  log_pass "Report generated: reportId=${REPORT_ID}"
else
  log_fail "Report not found for audit"
fi

RULE_COUNT=$(echo "$REPORT_RESP" | jq -r '.ruleResults | length // 0' 2>/dev/null || echo "0")
if [ "$RULE_COUNT" -gt 0 ]; then
  log_pass "Report contains ${RULE_COUNT} rule results"
else
  log_fail "Report has no rule results"
fi

KEYWORD_COUNT=$(echo "$REPORT_RESP" | jq -r '.keywords | length // 0' 2>/dev/null || echo "0")
if [ "$KEYWORD_COUNT" -gt 0 ]; then
  log_pass "Report contains ${KEYWORD_COUNT} keywords"
else
  log_fail "Report has no keywords"
fi

# ─── Test 7: PDF Export ───
log_info "Test 7: PDF export"
PDF_HTTP_CODE=$(curl -sf -o /dev/null -w "%{http_code}" \
  -H "${AUTH_HEADER}" \
  "${BASE_URL}/audits/${AUDIT_ID}/export" 2>/dev/null || echo "000")

if [ "$PDF_HTTP_CODE" = "200" ]; then
  log_pass "PDF export returned HTTP 200"
else
  log_fail "PDF export returned HTTP ${PDF_HTTP_CODE}"
fi


# ─── Test 8: Public API (content-only check, template mode) ───
log_info "Test 8: Public API content-check"

KEY_RESP=$(curl -sf -X POST "${BASE_URL}/users/me/api-keys" \
  -H "${AUTH_HEADER}" \
  -H "content-type: application/json" \
  -d '{"name":"smoke","environment":"test"}' 2>/dev/null || echo "")
API_KEY=$(echo "$KEY_RESP" | jq -r '.plaintext // empty' 2>/dev/null)
if [ -z "$API_KEY" ]; then
  log_fail "Public API: could not create API key"
else
  log_pass "Public API: API key created (${API_KEY:0:16}...)"
  PUB_RESP=$(curl -sf -X POST "${BASE_URL}/public/check" \
    -H "authorization: Bearer ${API_KEY}" \
    -H "content-type: application/json" \
    -d @scripts/fixtures/public-check-html.json 2>/dev/null || echo "")
  PUB_SCORE=$(echo "$PUB_RESP" | jq -r '.score // empty' 2>/dev/null)
  PUB_ISSUES=$(echo "$PUB_RESP" | jq -r '.issues | length // 0' 2>/dev/null || echo "0")
  if [ -n "$PUB_SCORE" ] && [ "$PUB_ISSUES" -gt 0 ]; then
    log_pass "Public API: /public/check returned score=${PUB_SCORE}, issues=${PUB_ISSUES}"
  else
    log_fail "Public API: /public/check response malformed (resp=${PUB_RESP:0:200})"
  fi
fi

echo ""
echo "========================================"
echo "  Smoke Test Summary"
echo "  Passed: ${pass} | Failed: ${fail}"
echo "========================================"
