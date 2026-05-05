#!/usr/bin/env bash
# Enterprise Creator - backend smoke tests.
#
# Runs every endpoint the app talks to in roughly the order a real user
# would hit them. Exits non-zero on the first failure with a clear
# error so the backend dev can pinpoint which step broke.
#
# Required env:
#   API_BASE_URL   - e.g. https://staging.api.example.com  (no trailing slash)
#   TEST_EMAIL     - mailbox you can read OTPs from for the human-driven steps
#                    (defaults to qa+ec@example.com)
#   TEST_OTP_CODE  - if your staging accepts a fixed code, set it. Otherwise
#                    the script pauses and waits for you to paste the real code.
#
# Optional:
#   SAMPLE_VIDEO   - path to a 5-15 second 720p H.264 MP4 to upload. If unset,
#                    the upload steps are skipped (signed URL still tested).
#   ADMIN_INVITE_CODE - 8-character invite code your admin issued for this
#                       test account. Skips the manual setup if provided.
#
# Usage:
#   API_BASE_URL=https://staging.api.example.com bash BACKEND_SMOKE_TESTS.sh

set -u

API="${API_BASE_URL:-}"
EMAIL="${TEST_EMAIL:-qa+ec@example.com}"
OTP_CODE="${TEST_OTP_CODE:-}"
SAMPLE_VIDEO="${SAMPLE_VIDEO:-}"
ADMIN_INVITE_CODE="${ADMIN_INVITE_CODE:-}"

if [[ -z "$API" ]]; then
  echo "ERROR: API_BASE_URL is required."
  exit 2
fi

# ----- helpers ---------------------------------------------------------------

color_red() { printf "\033[31m%s\033[0m\n" "$1"; }
color_green() { printf "\033[32m%s\033[0m\n" "$1"; }
color_yellow() { printf "\033[33m%s\033[0m\n" "$1"; }
color_dim() { printf "\033[2m%s\033[0m\n" "$1"; }

step_n=0
step() {
  step_n=$((step_n + 1))
  echo
  color_yellow "[$step_n] $1"
}

assert_status() {
  local got="$1"
  local expected="$2"
  local what="$3"
  if [[ "$got" != "$expected" ]]; then
    color_red "FAIL: $what expected HTTP $expected, got $got"
    color_dim "Body was:"
    color_dim "$LAST_BODY"
    exit 1
  fi
  color_green "OK: $what (HTTP $got)"
}

# Wraps curl. Sets LAST_BODY and returns the HTTP status.
# Args: METHOD PATH [JSON_BODY] [EXTRA_HEADER...]
http() {
  local method="$1"; shift
  local path="$1"; shift
  local body=""
  local headers=()
  if [[ "$#" -gt 0 && ! "$1" =~ ^- ]]; then
    body="$1"; shift
  fi
  while [[ "$#" -gt 0 ]]; do
    headers+=(-H "$1"); shift
  done

  if [[ -n "${JWT:-}" ]]; then
    headers+=(-H "Authorization: Bearer $JWT")
  fi
  if [[ -n "${WORKSPACE_ID:-}" ]]; then
    headers+=(-H "X-Workspace-Id: $WORKSPACE_ID")
  fi

  local resp
  if [[ -n "$body" ]]; then
    resp=$(curl -sS -o /tmp/ec_smoke_body -w "%{http_code}" \
      -X "$method" \
      "${headers[@]}" \
      -H "Content-Type: application/json" \
      -d "$body" \
      "$API$path")
  else
    resp=$(curl -sS -o /tmp/ec_smoke_body -w "%{http_code}" \
      -X "$method" \
      "${headers[@]}" \
      "$API$path")
  fi
  LAST_BODY="$(cat /tmp/ec_smoke_body 2>/dev/null || true)"
  echo "$resp"
}

# Pulls a JSON value out of LAST_BODY using a key path.
# Args: KEY_PATH (e.g. "creator.id" or "memberships.0.workspace.id")
json_get() {
  local key="$1"
  python3 -c "
import json, sys
data = json.loads(sys.stdin.read())
parts = '$key'.split('.')
for p in parts:
    if p.isdigit():
        data = data[int(p)]
    else:
        data = data[p]
print(data)
" <<< "$LAST_BODY"
}

prompt_otp() {
  if [[ -n "$OTP_CODE" ]]; then
    echo "$OTP_CODE"
    return
  fi
  echo
  read -rp "Enter the 6-digit OTP sent to $EMAIL: " code
  echo "$code"
}

# ----- preflight -------------------------------------------------------------

color_dim "API: $API"
color_dim "Email: $EMAIL"

# ----- 1. Auth ----------------------------------------------------------------

step "POST /v1/auth/email/start"
status=$(http POST /v1/auth/email/start "{\"email\":\"$EMAIL\"}")
assert_status "$status" "200" "email start"

step "POST /v1/auth/email/verify (you may need to paste the OTP)"
code=$(prompt_otp)
status=$(http POST /v1/auth/email/verify "{\"email\":\"$EMAIL\",\"code\":\"$code\"}")
assert_status "$status" "200" "email verify"
JWT=$(json_get "accessToken")
color_dim "JWT acquired (${#JWT} chars)"

# ----- 2. Identity ------------------------------------------------------------

step "GET /v1/identity/me"
status=$(http GET /v1/identity/me)
assert_status "$status" "200" "identity me"

CREATOR_RAW="$LAST_BODY"
HAS_CREATOR=$(python3 -c "import json,sys; d=json.loads(sys.stdin.read()); print('yes' if d.get('creator') else 'no')" <<< "$CREATOR_RAW")

if [[ "$HAS_CREATOR" == "no" ]]; then
  step "POST /v1/identity/profile (first-time profile creation)"
  USERNAME="qa$(date +%s)"
  status=$(http POST /v1/identity/profile \
    "{\"firstName\":\"QA\",\"lastName\":\"Smoke\",\"globalUsername\":\"$USERNAME\"}")
  assert_status "$status" "200" "create profile"
fi

step "GET /v1/identity/username-available?u=qa-smoke-test-name"
status=$(http GET "/v1/identity/username-available?u=qa-smoke-test-name")
assert_status "$status" "200" "username availability"

step "PATCH /v1/identity/profile (no-op edit)"
status=$(http PATCH /v1/identity/profile "{\"firstName\":\"QA\"}")
assert_status "$status" "200" "patch profile"

# ----- 3. Memberships and workspaces -----------------------------------------

step "GET /v1/memberships"
status=$(http GET /v1/memberships)
assert_status "$status" "200" "list memberships"

MEMBERSHIP_COUNT=$(python3 -c "import json,sys; print(len(json.loads(sys.stdin.read())))" <<< "$LAST_BODY")
color_dim "Memberships: $MEMBERSHIP_COUNT"

if [[ "$MEMBERSHIP_COUNT" == "0" && -z "$ADMIN_INVITE_CODE" ]]; then
  color_yellow "No memberships and no ADMIN_INVITE_CODE provided."
  color_yellow "Skipping workspace + post tests. Provide ADMIN_INVITE_CODE to run them."
  color_green "Smoke test completed (auth + identity only)."
  exit 0
fi

if [[ -n "$ADMIN_INVITE_CODE" ]]; then
  step "POST /v1/invites/resolve"
  status=$(http POST /v1/invites/resolve "{\"code\":\"$ADMIN_INVITE_CODE\"}")
  assert_status "$status" "200" "resolve invite"

  step "POST /v1/invites/redeem"
  status=$(http POST /v1/invites/redeem "{\"code\":\"$ADMIN_INVITE_CODE\"}")
  assert_status "$status" "200" "redeem invite"
  WORKSPACE_ID=$(json_get "membership.workspace.id")
  MEMBERSHIP_ID=$(json_get "membership.membershipId")
else
  step "Picking first active membership for downstream tests"
  WORKSPACE_ID=$(python3 -c "
import json,sys
ms = json.loads(sys.stdin.read())
for m in ms:
    if m.get('status') == 'active':
        print(m['workspace']['id']); break
" <<< "$LAST_BODY")
  if [[ -z "$WORKSPACE_ID" ]]; then
    color_red "No active membership found. Either provide ADMIN_INVITE_CODE or accept a pending invite first."
    exit 1
  fi
  MEMBERSHIP_ID=$(python3 -c "
import json,sys
ms = json.loads(sys.stdin.read())
for m in ms:
    if m['workspace']['id'] == '$WORKSPACE_ID':
        print(m['membershipId']); break
" <<< "$LAST_BODY")
fi
color_dim "Workspace: $WORKSPACE_ID"
color_dim "Membership: $MEMBERSHIP_ID"

step "GET /v1/memberships/{id}"
status=$(http GET "/v1/memberships/$MEMBERSHIP_ID")
assert_status "$status" "200" "get membership"

step "PATCH /v1/memberships/{id} (no-op edit)"
status=$(http PATCH "/v1/memberships/$MEMBERSHIP_ID" "{\"bio\":\"QA smoke test bio.\"}")
assert_status "$status" "200" "patch membership"

step "GET /v1/workspaces/{id}"
status=$(http GET "/v1/workspaces/$WORKSPACE_ID")
assert_status "$status" "200" "get workspace"

step "GET /v1/workspaces/{id}/tag-topology"
status=$(http GET "/v1/workspaces/$WORKSPACE_ID/tag-topology")
assert_status "$status" "200" "tag topology"

step "GET /v1/workspaces/{id}/ctas"
status=$(http GET "/v1/workspaces/$WORKSPACE_ID/ctas")
assert_status "$status" "200" "ctas"

# ----- 4. Discovery -----------------------------------------------------------

step "GET /v1/discovery/by-domain"
status=$(http GET /v1/discovery/by-domain)
if [[ "$status" == "200" || "$status" == "404" ]]; then
  color_green "OK: discovery by-domain (HTTP $status, 404 means no whitelisted workspaces)"
else
  assert_status "$status" "200" "discovery by-domain"
fi

# ----- 5. Posts ---------------------------------------------------------------

step "GET /v1/workspaces/{id}/posts/me?limit=6"
status=$(http GET "/v1/workspaces/$WORKSPACE_ID/posts/me?limit=6")
assert_status "$status" "200" "list my posts"

if [[ -n "$SAMPLE_VIDEO" ]]; then
  if [[ ! -f "$SAMPLE_VIDEO" ]]; then
    color_red "SAMPLE_VIDEO=$SAMPLE_VIDEO does not exist."
    exit 1
  fi
  SIZE=$(stat -f%z "$SAMPLE_VIDEO" 2>/dev/null || stat -c%s "$SAMPLE_VIDEO")

  step "POST /v1/uploads/sign"
  status=$(http POST /v1/uploads/sign \
    "{\"workspaceId\":\"$WORKSPACE_ID\",\"filename\":\"smoke.mp4\",\"mime\":\"video/mp4\",\"sizeBytes\":$SIZE}")
  assert_status "$status" "200" "sign upload"
  UPLOAD_URL=$(json_get "uploadUrl")
  MEDIA_KEY=$(json_get "mediaKey")
  color_dim "MediaKey: $MEDIA_KEY"

  step "PUT signed URL (raw upload, ~$((SIZE / 1024)) KB)"
  put_status=$(curl -sS -o /tmp/ec_smoke_put -w "%{http_code}" \
    -X PUT \
    -H "Content-Type: video/mp4" \
    --data-binary "@$SAMPLE_VIDEO" \
    "$UPLOAD_URL")
  if [[ "$put_status" != "200" && "$put_status" != "204" ]]; then
    color_red "FAIL: PUT to signed URL got HTTP $put_status"
    exit 1
  fi
  color_green "OK: PUT signed URL (HTTP $put_status)"

  step "POST /v1/uploads/complete"
  status=$(http POST /v1/uploads/complete "{\"mediaKey\":\"$MEDIA_KEY\"}")
  assert_status "$status" "200" "complete upload"

  step "POST /v1/workspaces/{id}/posts"
  status=$(http POST "/v1/workspaces/$WORKSPACE_ID/posts" \
    "{\"title\":\"QA smoke post\",\"description\":\"created by smoke test\",\"tagIds\":[],\"ctaId\":null,\"mediaKey\":\"$MEDIA_KEY\"}")
  assert_status "$status" "200" "create post"
  POST_ID=$(json_get "id")

  step "GET /v1/posts/{id}"
  status=$(http GET "/v1/posts/$POST_ID")
  assert_status "$status" "200" "get post"

  step "PATCH /v1/posts/{id} (metadata only)"
  status=$(http PATCH "/v1/posts/$POST_ID" "{\"title\":\"QA smoke post (edited)\"}")
  assert_status "$status" "200" "patch post"

  step "DELETE /v1/posts/{id} (cleanup)"
  status=$(http DELETE "/v1/posts/$POST_ID")
  assert_status "$status" "200" "delete post"
else
  color_yellow "SAMPLE_VIDEO not provided. Skipping upload/post create/edit/delete."
  color_dim "To run those steps: SAMPLE_VIDEO=/path/to/720p.mp4 bash $0"
fi

# ----- 6. Pending invite accept/decline (NEW endpoints) ----------------------

step "Looking for a pending_invite to test accept/decline"
status=$(http GET /v1/memberships)
PENDING_INVITE_ID=$(python3 -c "
import json,sys
ms = json.loads(sys.stdin.read())
for m in ms:
    if m.get('status') == 'pending_invite':
        print(m['membershipId']); break
" <<< "$LAST_BODY")

if [[ -n "$PENDING_INVITE_ID" ]]; then
  step "POST /v1/memberships/$PENDING_INVITE_ID/decline"
  status=$(http POST "/v1/memberships/$PENDING_INVITE_ID/decline")
  assert_status "$status" "200" "decline invite"
  color_dim "Note: this consumed a real pending invite. Re-issue one for the next run if needed."
else
  color_yellow "No pending_invite found. Skipping accept/decline test."
  color_dim "To exercise this: have an admin issue an invite to $EMAIL and re-run."
fi

# ----- 7. Sign out ------------------------------------------------------------

step "POST /v1/auth/sign-out"
status=$(http POST /v1/auth/sign-out)
assert_status "$status" "200" "sign out"

echo
color_green "========================================"
color_green "All smoke tests passed."
color_green "========================================"
