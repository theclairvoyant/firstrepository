# Backend handoff

This folder contains everything the backend developer and the CTO need to take this codebase from SCAFFOLD to production against the real Blinklink backend.

## Files

- `CTO_KT.md` - 30-minute orientation for the CTO. Start here. Architecture, security posture, exact backend-wiring steps.
- `FLOW_AUDIT.md` - every flow in the app, every endpoint it touches, every cross-flow ripple, and every open question.
- `BACKEND_SMOKE_TESTS.sh` - one-shot bash + curl runner. Hits each endpoint in roughly the order a real user would.
- `../06-api-contracts.md` - the canonical endpoint table (kept up to date with the FE).
- `../../HANDOFF.md` - the deeper SCAFFOLD/FULL boundary doc, env vars, real-device check list. Older but still authoritative for those topics.

## Quick start

```bash
export API_BASE_URL="https://staging.api.your-domain.com"
export TEST_EMAIL="qa+ec@your-domain.com"
# Optional, exercises the upload + post pipeline:
export SAMPLE_VIDEO="/path/to/720p-h264-15s.mp4"
# Optional, skips manual workspace setup:
export ADMIN_INVITE_CODE="ABCD2345"

bash docs/handoff/BACKEND_SMOKE_TESTS.sh
```

You will be prompted to paste the OTP unless `TEST_OTP_CODE` is set.

## What you should look at first

1. The two NEW endpoints not in the original contract:
   - `POST /v1/memberships/{id}/accept`
   - `POST /v1/memberships/{id}/decline`
2. The extension fields on existing payloads:
   - `WorkspaceMembership` adds `invitedAt?` and `invitedBy?` for `pending_invite` rows.
   - `PatchMembershipInput` accepts `displayName?` and `bannerUrl?` in addition to the documented `workspaceUsername` and `bio`.
   - `PatchMeInput` accepts `email?` for the change-email flow.
3. The notifications surface (`/settings/notifications` in the app) is currently a mock feed - it needs a real `GET /v1/notifications` endpoint when you're ready.
4. The `// SCAFFOLD` comments in the codebase mark places where the FE substitutes a local file URI for a backend-issued CDN URL. These will switch to the real URL once the matching endpoint is wired - no FE change needed.

## When you find a discrepancy

The smoke test exits non-zero on the first failure with a clear message. If a flow doesn't behave the way the audit doc says it should, that's a real divergence between FE expectations and backend behavior - flag it back to the FE team.

## Versioning note

The contract files in this repo track what the FE will SEND and EXPECT. If you change a field name or shape on the backend, the FE will break. Coordinate via PR before shipping.
