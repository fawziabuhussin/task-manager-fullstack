#!/usr/bin/env bash
# tests/integration/run_tests.sh
# E2E: health -> signup -> mailbox -> verify -> login -> me -> create task -> list -> logout
set -euo pipefail

API="${API:-http://localhost:3000}"
MAILBOX_WAIT="${MAILBOX_WAIT:-90}"  # seconds
TS="$(date +%s)"
EMAIL="testuser+$TS@example.com"
PASSWORD="password123"

cookiejar="$(mktemp)"
trap 'rm -f "$cookiejar"' EXIT

echo "Testing against $API"

wait_healthy() {
  local deadline=$(( $(date +%s) + 60 ))
  while [ "$(date +%s)" -lt "$deadline" ]; do
    if curl -sS "$API/health" | grep -q '"ok":true'; then
      return 0
    fi
    sleep 0.5
  done
  echo "Server not healthy at $API/health" >&2
  return 1
}

# Pre-mint csrf
premint_csrf() {
  curl -sS -c "$cookiejar" -b "$cookiejar" "$API/api/auth/me" >/dev/null || true
}

# Try mailbox in multiple locations
fetch_mailbox() {
  local to="$1"
  local tried=""
  for path in \
    "/api/dev/mailbox?to=$(python - <<PY
import urllib.parse as u,sys; print(u.quote(sys.argv[1]))
PY
"$to")" \
    "/dev/mailbox?to=$to" \
    "/api/dev/mailbox" \
    "/dev/mailbox"
  do
    local url="$API$path"
    tried="$tried $url"
    if content="$(curl -fsS -c "$cookiejar" -b "$cookiejar" "$url" 2>/dev/null)"; then
      echo "$content"
      return 0
    fi
  done
  echo "FAILED" >&2
  return 1
}

extract_code() {
  local s="$1"
  # Try JSON first
  if command -v jq >/dev/null 2>&1; then
    if echo "$s" | jq -e . >/dev/null 2>&1; then
      code="$(echo "$s" | jq -r '.. | strings | capture("(?<c>\\b[0-9]{6}\\b)")? | .c' | grep -E '^[0-9]{6}$' | head -n1 || true)"
      if [ -n "$code" ]; then echo "$code"; return 0; fi
    fi
  fi
  # HTML/any text patterns
  for rx in \
    'Your code is:[[:space:]]*([0-9]{6})' \
    'Code:[[:space:]]*([0-9]{6})' \
    'data-code=["'\'']([0-9]{6})["'\'']' \
    '<td[^>]*>[[:space:]]*([0-9]{6})[[:space:]]*</td>' \
    '\b([0-9]{6})\b'
  do
    if code="$(echo "$s" | perl -0777 -ne "print \\$1 if /$rx/i")"; then
      if echo "$code" | grep -Eq '^[0-9]{6}$'; then
        echo "$code"; return 0
      fi
    fi
  done
  return 1
}

wait_healthy
premint_csrf

echo "[1/8] Signup $EMAIL"
curl -sS -c "$cookiejar" -b "$cookiejar" -X POST "$API/api/auth/signup" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" | sed -E 's/^/  /'

echo "[2/8] Mailbox -> code"
CODE=""
deadline=$(( $(date +%s) + MAILBOX_WAIT ))
while [ -z "$CODE" ] && [ "$(date +%s)" -lt "$deadline" ]; do
  MAIL="$(fetch_mailbox "$EMAIL" || true)"
  if [ -n "$MAIL" ]; then
    CODE="$(extract_code "$MAIL" || true)"
  fi
  if [ -z "$CODE" ]; then sleep 1; fi
done
if [ -z "$CODE" ]; then echo "No verification code found within ${MAILBOX_WAIT}s"; exit 1; fi
echo "Code: $CODE"

echo "[3/8] Verify"
curl -sS -c "$cookiejar" -b "$cookiejar" -X POST "$API/api/auth/verify" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"code\":\"$CODE\"}" | sed -E 's/^/  /'

echo "[4/8] Login"
curl -sS -c "$cookiejar" -b "$cookiejar" -X POST "$API/api/auth/login" \
  -H "Content-Type: application/json" \
  -H "x-forwarded-for: 127.0.0.1" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" | sed -E 's/^/  /'

# Ensure CSRF cookie
CSRF="$(grep -E $'\t'csrfToken$'\t' "$cookiejar" | awk '{print $7}' || true)"
if [ -z "$CSRF" ]; then
  curl -sS -c "$cookiejar" -b "$cookiejar" "$API/api/auth/me" >/dev/null || true
  CSRF="$(grep -E $'\t'csrfToken$'\t' "$cookiejar" | awk '{print $7}' || true)"
fi
if [ -z "$CSRF" ]; then echo "csrf missing"; exit 1; fi
echo "csrf: $CSRF"

echo "[5/8] Me"
curl -sS -c "$cookiejar" -b "$cookiejar" "$API/api/auth/me" | sed -E 's/^/  /'

echo "[6/8] Create task"
curl -sS -c "$cookiejar" -b "$cookiejar" -X POST "$API/api/tasks" \
  -H "Content-Type: application/json" \
  -H "x-csrf-token: $CSRF" \
  -d "{\"title\":\"Integration Test Task $TS\",\"description\":\"Created by automated test\"}" | sed -E 's/^/  /'

echo "[7/8] List tasks"
curl -sS -c "$cookiejar" -b "$cookiejar" "$API/api/tasks" | sed -E 's/^/  /'

echo "[8/8] Logout"
curl -sS -c "$cookiejar" -b "$cookiejar" -X POST "$API/api/auth/logout" \
  -H "x-csrf-token: $CSRF" >/dev/null

echo "✅ Integration script completed"
