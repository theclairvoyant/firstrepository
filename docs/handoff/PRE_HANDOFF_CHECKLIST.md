# Pre-handoff checklist

State of the codebase as of 2026-05-06, branch `claude/restart-enterprise-creator-OlJtw`.

This is the punch list the CTO works through to take the app from SCAFFOLD to production. Items grouped by who owns them and when they need to be done.

> Read **first**: `docs/handoff/CTO_KT.md` (30-min orientation), then this file. The flow audit (`FLOW_AUDIT.md`) and smoke test (`BACKEND_SMOKE_TESTS.sh`) are reference material.

---

## What ships green today

Everything below is wired, tested, and passes locally:

- TypeScript strict, zero errors (`npx tsc --noEmit`).
- Hard rules check (no em/en dashes, no parent brand in user-visible code) - passes on every source file.
- Locale parity - en/ar/es/fr/hi all share 548 keys exactly.
- Branded boot splash on workspace land.
- Storage hygiene - auto-prune of old uploads, orphan drafts, stale failed jobs; user-triggered Clear Cache with byte-level size.
- Modal-stack freeze audit clean - every `router.back() + router.replace` race fixed.
- Keyboard avoidance - all form screens use `automaticallyAdjustKeyboardInsets` natively, no fighting KAV.
- Native-quality translations across 5 locales.
- Global ErrorBoundary at root catches uncaught render errors.
- Offline banner via NetInfo.
- Zustand persist version + migrate scaffolding on all four persisted stores.
- AppState foreground hook re-runs maintenance after long backgrounds.
- Backend smoke test runner that walks every endpoint.

---

## CTO: do these in week one

These are the items that need the CTO's hands on the steering wheel before the app can talk to the real backend.

### 1. Wire the CI workflow (5 min, you blocked me from doing it)
GitHub blocked the OAuth push of `.github/workflows/ci.yml`. Land it via:
- the GitHub web UI ("Add file" → paste the contents from the previous commit message), or
- a local push from your laptop with `workflow` scope.

The workflow runs `tsc --noEmit`, `scripts/check-file-rules.sh --all`, and `locales/check-parity.sh` on every push and PR. Make all three required checks in branch protection on `master`.

### 2. Flip MOCK_API and point at staging (15 min)
Set in your EAS profile (`eas.json`):
```
EXPO_PUBLIC_MOCK_API=false
EXPO_PUBLIC_API_BASE_URL=https://api.staging.blinklink.example
```
Run `bash docs/handoff/BACKEND_SMOKE_TESTS.sh` against staging. Exits non-zero on any contract divergence.

### 3. Implement the two new endpoints the FE depends on (~half day backend)
Documented in `docs/06-api-contracts.md` Memberships section:
- `POST /v1/memberships/{id}/accept` → `{ membership }`
- `POST /v1/memberships/{id}/decline` → `{ ok }`

These back the in-switcher accept/decline of admin invites.

### 4. Confirm extension fields on existing payloads
The FE sends/expects these in addition to what the original spec listed:
- `WorkspaceMembership` adds `invitedAt?` and `invitedBy?` for `pending_invite` rows.
- `PatchMembershipInput` accepts `displayName?` and `bannerUrl?`.
- `PatchMeInput` accepts `email?` for the change-email flow.

If any of these need backend work, that's also week-one.

### 5. Wire Sentry (~1 hour)
Existing stub at `lib/monitoring/sentry.ts` has the FULL block commented in. Steps:
- `npm install @sentry/react-native`
- Uncomment the init block in `lib/monitoring/sentry.ts`.
- Set `EXPO_PUBLIC_SENTRY_DSN` in your EAS env.
- Wrap the root with `Sentry.wrap(App)` in `app/_layout.tsx`.
- Optional: replace the `console.error` in `components/ErrorBoundary.tsx:componentDidCatch` with `Sentry.captureException` (comment in the file marks the spot).

### 6. Wire push notifications (~half day with credentials)
`lib/notifications/register.ts` is stubbed. Steps:
- Install `expo-notifications` (already in package.json).
- Run `npx eas init` to provision an EAS project ID; set `EXPO_PUBLIC_EAS_PROJECT_ID` in your env.
- Set up iOS APNs key + Android FCM credentials via `eas credentials`.
- Uncomment the FULL block in `lib/notifications/register.ts`.
- Build a `GET /v1/notifications` endpoint and replace `lib/notifications/mockFeed.ts` with a real query (proposed schema in `CTO_KT.md` §3.2.5).

### 7. Wire SSO (~half day per provider with backend exchange)
Today the SSO buttons toast "SSO setup pending". To enable:
- Google + Microsoft: `expo-auth-session` (already in package.json).
- Apple: `expo-apple-authentication` (already in package.json). Required by App Store guideline 4.8 if you offer any other SSO on iOS.
- Server: `POST /v1/auth/sso/exchange` accepts the provider's identity token and returns a session.

### 8. Real legal + support env vars (5 min decision, then set them)
Empty fallbacks today (the rules ban hardcoded URLs to your parent brand). Set:
- `EXPO_PUBLIC_PRIVACY_URL` - public privacy policy URL (must be `https://`)
- `EXPO_PUBLIC_TERMS_URL` - public terms URL
- `EXPO_PUBLIC_SUPPORT_EMAIL` - mailto target

When unset, the legal screen renders an EmptyState and the support row toasts a "not configured" notice. Both behaviors are intentional, but launch-blocking.

### 9. App Store / Play Store assets
- Replace the placeholder `assets/icon.png`, `assets/splash-icon.png`, `assets/adaptive-icon.png` with real artwork.
- Fill out App Store Connect privacy nutrition labels (we collect: email, phone optional, video uploads, device id for push tokens, IP for sessions).
- Write the App Store description and keywords.
- Bundle ID is `com.enterprisecreator.app` for both platforms.

---

## Pre-launch (do before public users)

### 10. Manual a11y pass
Walk these flows with VoiceOver (iOS) and TalkBack (Android):
- Welcome → Method → Email → OTP → Profile-setup
- Tab switching, workspace switcher, accept/decline invite
- Compose flow (gallery → edit → tags → cta → preview → publish)
- Video detail (swipe between posts, open status / specs / more)
- Settings (every row)

Most `accessibilityLabel`s are present but a real device pass will catch focus order issues and unlabeled controls.

### 11. Real device testing per `HANDOFF.md` §"Real-device-only checks"
The most important:
- iPhone HEVC clip transcoding to H.264.
- Android long-video duration cap.
- Cellular toggle behavior > 25 MB.
- iOS background suspension during upload.
- Permission denial recovery (Settings → grant → return to app).
- Deep link round trips: `enterprisecreator://w/{id}`, `://post/{id}`, `://invite/{code}` from cold start AND foreground.

### 12. Re-run smoke test against the real backend after every contract change
`bash docs/handoff/BACKEND_SMOKE_TESTS.sh` exits non-zero on the first divergence. Make it part of release.

### 13. Re-run `npm audit --audit-level=high` weekly until launch
The current 15 moderate findings are all in Expo's dev-tool transitive chain (xcode, ip, etc.) and don't ship in the runtime bundle. Watch for any new HIGH/CRITICAL.

### 14. Privacy / GDPR / CCPA review if applicable
The app collects email, optional phone, video uploads, and device push tokens. If shipping to EU or California, get the legal team to bless the privacy policy and ensure delete-account actually severs the data on the backend (FE side already calls `DELETE /v1/identity/me` and clears every local store).

### 15. Sentry release tagging
Once Sentry is wired, tag every release with `app.json` version. Source maps upload via EAS hooks.

### 16. Branch protection
`master` should require:
- The CI workflow (typecheck + rules + locales).
- At least one approving review.
- No force pushes.

---

## Nice-to-have (post-launch backlog)

These are improvements that would push the codebase from "shipped" to "polished." None are blocking.

### 17. Tests
Zero test infra today. Order I'd add them:
- Jest unit tests for `lib/store/*` (pure pruning logic, easy wins).
- Jest unit tests for `lib/storage/maintenance.ts` (also pure).
- React Testing Library for the form screens (focus, validation).
- Detox or Maestro for the auth + upload e2e flow.
Budget: 2-3 days for the unit layer, 3-5 days for e2e.

### 18. Real Arabic CLDR plurals
`postsCount`, `queueDepth`, `tagsRowCount`, `resultsBody` use `_one` / `_other` only. Arabic actually has 6 plural categories (zero, one, two, few, many, other). i18next + intl-pluralrules supports them; just need the translations.

### 19. Bundle-size budget enforced in CI
Add a step that runs `npx expo export` and fails the build if the JS bundle grows by more than X% from the baseline.

### 20. Permission re-detection on AppState foreground
When the user denies camera/mic and we send them to Settings, we don't re-check on return. Add an `AppState` listener inside `composer/record.tsx` that re-runs the permission check on foreground transitions.

### 21. Network "you've been retried" reassurance
The 401 single-flight refresh is silent. Consider a small toast on successful refresh-and-retry so the user understands the brief delay they saw.

### 22. Analytics (PostHog / Amplitude / Mixpanel)
No funnel instrumentation today. Add events for: signup completed, first workspace joined, first post submitted, post approved, post live. Helps the product team understand activation.

### 23. Bundle shake of dead query hooks
4 React Query hooks are exported but never imported (`useCreatePost`, `usePatchPost`, `useRegisterPushToken`, `useDeletePushToken`). Either delete them or wire the matching UI. Documented in `FLOW_AUDIT.md` §4.4.

---

## Quick reference: where to look when

| Question | Doc / File |
|---|---|
| What is this app, how to run, security posture | `docs/handoff/CTO_KT.md` |
| Every flow, every endpoint, every cross-flow ripple | `docs/handoff/FLOW_AUDIT.md` |
| Verify the backend contract end-to-end | `docs/handoff/BACKEND_SMOKE_TESTS.sh` |
| SCAFFOLD/FULL boundaries, env var manifest, real-device check list | `HANDOFF.md` |
| Hard rules (dashes, brand, RTL, etc.) | `CLAUDE.md` |
| Endpoint table | `docs/06-api-contracts.md` |
| Locale conventions, voice guidelines | `locales/README.md` |
| Locale parity check | `locales/check-parity.sh` |
| Hard rules check | `scripts/check-file-rules.sh` |

---

## Recent commits worth knowing about

- Storage hygiene + Settings/Storage screen with byte-level size
- Stale failed-job prune (14 days)
- Strict rules script + uncovered + fixed two real brand-leak violations
- Modal-stack freeze audit + fixes (workspace switcher, drawer, composer discard)
- Native-quality translations across 5 locales
- Branded boot splash with subtle pulse
- KAV → automaticallyAdjustKeyboardInsets cleanup (form screens)
- Boot router error recovery
- Backend handoff package (this folder)
- Switcher pending invites collapsible section + accept/decline endpoints
- ErrorBoundary, offline banner, persist versioning, AppState foreground hook (this commit)
