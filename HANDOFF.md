# Enterprise Creator - Backend Handoff

This document hands the SCAFFOLD-mode build off to the platform / backend team for production wiring.

> **Read this first**: `docs/handoff/CTO_KT.md` is the focused 30-minute orientation for the CTO. This file (`HANDOFF.md`) is the deeper backend-implementation doc - SCAFFOLD/FULL boundaries, env vars, decisions still needed, real-device checks. Use both together. The flow audit at `docs/handoff/FLOW_AUDIT.md` and the runnable smoke test at `docs/handoff/BACKEND_SMOKE_TESTS.sh` round out the package.

Also worth reading before deeper work: `BUILD.md`, `CLAUDE.md`, and `docs/00-rules-and-mode.md`.

## Project status

- **Branch**: `claude/restart-enterprise-creator-OlJtw`
- **Operating mode**: SCAFFOLD (mocked APIs, simulated upload, English fully translated, sample translations in es/fr/hi/ar, Sentry / push / SSO not wired).
- **TypeScript**: `npx tsc --noEmit` clean.
- **Hard rules**: `/check-rules` clean (no em / en dashes anywhere user-visible, no parent brand name, no raw hex outside `lib/theme/`, no console.\*, no `any`).
- **QA verdict**: PASS_WITH_WARNINGS (Phase 8 audit, 0 FAIL findings; remaining WARNs are token-discipline cosmetics covered below).
- **App entry**: `app/index.tsx` is the boot router; `expo-router` drives navigation.

To switch to FULL mode, edit `CLAUDE.md` and change `operatingMode: SCAFFOLD` to `operatingMode: FULL`. The next session implements every item below.

## API contracts to wire

The API surface is fully described in `docs/06-api-contracts.md`. 32 endpoints across 8 groups. The client side is already typed against this spec via `types/api.ts` and the wrapper modules in `lib/api/`. Switch the `MOCK_API` flag in `lib/api/config.ts` from `true` to `false` and point `EXPO_PUBLIC_API_BASE_URL` at staging - the wrappers will start hitting axios instead of the in-memory mocks.

Headers the client sends:
```
Authorization: Bearer {jwt}
X-Workspace-Id: {activeWorkspaceId}     // omitted for global endpoints
X-Client: enterprise-creator-mobile
X-Client-Version: {appVersion}
X-Client-Platform: ios|android
Accept-Language: {activeLocale}
```

The 401 single-flight refresh + retry-once flow is wired in `lib/api/client.ts`. On terminal failure it calls `dispatchUnauthorized()` which clears stores and routes to `(auth)/welcome` via the handler installed in `app/_layout.tsx`.

## SCAFFOLD stubs that need replacement

Each location has a SCAFFOLD vs FULL boundary documented inline.

| File | What is stubbed | What FULL needs |
|---|---|---|
| `lib/api/config.ts` | `MOCK_API: boolean = true` | Flip to `false`. |
| `lib/api/mocks/__seed.ts` | In-memory seed (1 creator, 4 workspaces, 12 posts, 3 tag categories, 4 CTAs) | Replace with real API responses; the wrappers already select between mock and axios via `MOCK_API`. |
| `lib/api/mocks/{auth,identity,tenants,workspaces,posts,upload,pushTokens}.ts` | Deterministic 200..600 ms latency stubs | None - delete or keep alongside; only the `MOCK_API` switch matters. |
| `lib/video/uploader.ts` | 3 s simulated progress timer; SCAFFOLD branch returns `{ mediaKey: 'mock_<timestamp>' }` | Uncomment the FULL branch (search for `FULL mode flow (Phase 9)` block) which calls `signUpload` -> `expo-file-system createUploadTask` PUT -> `completeUpload`. The orchestrator in `lib/video/uploadDriver.ts` already enforces the hard rule that the upload boundary always sees `mime: 'video/mp4'`. |
| `lib/notifications/register.ts` | `MOCK_API` early-return; `setNotificationPreference` persists locally only | Uncomment the FULL block which calls `Notifications.requestPermissionsAsync` + `Notifications.getExpoPushTokenAsync({ projectId })` + `POST /v1/identity/push-tokens`. Set `EXPO_PUBLIC_EAS_PROJECT_ID`. Wire `unregisterPushNotifications(tokenId)` to call `DELETE /v1/identity/push-tokens/{id}` on sign-out. |
| `lib/monitoring/sentry.ts` | No-op shim with full Sentry block commented in | Install `@sentry/react-native`, uncomment the init block, set `EXPO_PUBLIC_SENTRY_DSN`, and wrap the root with `Sentry.wrap(App)`. The capture / breadcrumb / setUser exports already have FULL bodies in comments. |
| `app/(auth)/method.tsx` | SSO buttons toast `auth.sso.pending` | Wire Google / Microsoft via `expo-auth-session` and Apple via `expo-apple-authentication`. Server exchanges idToken via `POST /v1/auth/sso/exchange`. |

## Decisions still needed

These came up during the build and need confirmation before FULL wiring:

1. **`signOut.pushTokenId` semantics** - body field is documented as optional. Does absence mean "sign out current session only" or "revoke all tokens"?
2. **`usernameAvailable` case-folding rules** - is `Kiran` distinct from `kiran`? The mock uses lowercase comparison; the FULL UI's debounced check needs to match server casing.
3. **Upload S3 multipart vs single PUT** - the mock returns `method: 'PUT'` with a single `uploadUrl`. Does the real backend use multipart for files near the 200 MB capability cap? The `SignUploadResponse` type already supports `partSize` + `fields` for multipart; the FULL uploader should branch on whichever is returned.
4. **`requestInvite` return shape** - sync membership object or `{ ok: true }` with a follow-up `/me` refresh? The mock returns the membership immediately.
5. **`byDomain` auth requirement** - the discovery screen has a JWT but no creator profile yet (email-verified only). Does the server accept that token?
6. **`requestId` surfacing** - the spec documents `requestId` on every error envelope. Is it also returned as `X-Request-Id` so Sentry breadcrumbs can attach it without parsing the body?
7. **`creatorJoinPolicy` values across workspace types** - mock uses `invite_only`, `open`, `request`. Confirm the real values per workspace tier.

## Apple Sign In setup

1. In Apple Developer, enable "Sign In with Apple" capability for the bundle id `com.enterprisecreator.app`.
2. In Xcode (or via EAS), add the `Sign In with Apple` entitlement.
3. Server: register the team id + key id + private key for token verification.
4. App: install `expo-apple-authentication` (already in `package.json`). Wire the button on `app/(auth)/method.tsx` (currently toasting `auth.sso.pending`) to call `appleAuthentication.signInAsync()` and pass the `identityToken` to `POST /v1/auth/sso/exchange`.
5. Apple is already gated to iOS only via `Platform.OS === 'ios'` in the method screen.
6. App Store Guideline 4.8 requires Apple alongside any other SSO provider on iOS - already satisfied because Google + Microsoft are also offered.

## EAS Project ID setup

1. Run `npx eas init` (or `eas init` if globally installed) inside the project root. This writes `extra.eas.projectId` into `app.json`.
2. Set `EXPO_PUBLIC_EAS_PROJECT_ID` in your build profile env (`eas.json`) to the same id - `lib/notifications/register.ts` reads `process.env.EXPO_PUBLIC_EAS_PROJECT_ID` when calling `Notifications.getExpoPushTokenAsync`.
3. Configure iOS push key + Android FCM credentials with EAS: `eas credentials`.
4. Verify push by sending a test notification from `https://expo.dev/notifications` to the registered token.

## Environment variables

Already referenced in code; document and set per environment:

- `EXPO_PUBLIC_API_BASE_URL` - axios base url (FULL mode).
- `EXPO_PUBLIC_PRIVACY_URL` - opens in `app/settings/legal.tsx`. If unset, the legal screen renders an EmptyState rather than crashing.
- `EXPO_PUBLIC_TERMS_URL` - same pattern.
- `EXPO_PUBLIC_SUPPORT_EMAIL` - mailto link in Settings. If unset, the row toasts `settings.support.notConfigured`.
- `EXPO_PUBLIC_SENTRY_DSN` - Sentry DSN (FULL mode).
- `EXPO_PUBLIC_EAS_PROJECT_ID` - push registration (FULL mode).
- `EXPO_PUBLIC_ENVIRONMENT` - `production` / `staging` / `development`. Sentry uses this.

## Real-device-only checks

These flows cannot be proven in a simulator and need to run on physical hardware before shipping FULL:

- **iPhone HEVC clip** - shoot on iPhone with HEIF/HEVC default, pick via gallery, confirm OS shows the "Compressing..." progress bar (AVAssetExportSession transcoding HEVC -> H.264 720p) and the resulting asset has aspect 9:16 within tolerance.
- **Android long video** - pick a 90-second clip from a workspace with `maxVideoSeconds=60`, verify `validateMedia` fires `DURATION_TOO_LONG` before any upload starts.
- **Cellular toggle** - enable Airplane Mode, then enable cellular only. With a >25 MB file, confirm `CellularWarningSheet` opens (when `settingsStore.warnBeforeCellular` is on). Tap Wait for Wi-Fi, switch back to Wi-Fi, confirm the root NetInfo listener resumes the queued job (banner transitions from `waiting_wifi` to `uploading`).
- **iOS background suspension** - start an upload, immediately background the app. SCAFFOLD's 3 s timer keeps running on the JS thread; FULL mode needs a real device to validate iOS suspending after ~30 s.
- **Permission denial** - revoke camera or microphone permission in Settings, return to `/composer/record`, confirm the EmptyState appears with a working Open Settings button.
- **Recording duration cap** - record continuously, confirm native `maxDuration` stops at `maxVideoSeconds` and the JS safety stop (250 ms past) does not double-fire.
- **iOS Safari -> deep link round trip** - `enterprisecreator://w/{id}`, `enterprisecreator://post/{postId}`, `enterprisecreator://invite/{code}` all need to resume from cold start and from foreground.

## Translation status

- `locales/en.json` - fully translated, source of truth.
- `locales/{es,fr,hi,ar}.json` - sample translations for high-traffic surfaces (`common.*`, `auth.welcome.*`, `tabs.*`, `settings.theme.*`, `settings.language.*`). Untranslated keys fall back to English via `i18next` `fallbackLng`.

To complete a language: copy the `en.json` tree, translate the leaf strings, drop em / en dashes (forbidden by hard rules - hyphens only). Adding a new language is the 4-step contract documented in `docs/07-platform-infrastructure.md`.

## Known deferrals (out of SCAFFOLD scope)

Many items previously deferred are now built. The current state:

- **Edit global profile** - DONE. `app/edit-global-profile.tsx` is the inline editor for name / username / phone / avatar. Email change uses the dedicated OTP flow at `app/edit-global-email.tsx`.
- **Edit workspace profile** - DONE. `app/edit-membership.tsx` handles cover, avatar, display name, username, bio with live availability check.
- **Avatar upload** - DONE. Wired to `POST /v1/identity/avatar` and `POST /v1/memberships/{id}/avatar` (multipart) via the FULL upload paths.
- **Workspace discovery by verified email** - DONE. `app/search-by-email.tsx` is the three-step flow (enter -> OTP verify -> results) with the inherited-email skip when the global profile already has a verified address.
- **Pending invite accept / decline** - DONE. `app/tenant-switcher.tsx` collapsible pending section. New endpoints `POST /v1/memberships/{id}/accept` and `POST /v1/memberships/{id}/decline` documented in `docs/06-api-contracts.md`.
- **Settings: default workspace, notifications, language** - DONE. See `app/settings/{default-workspace,notifications,language}.tsx`.
- **Compose with edit-existing-post** - DONE. `editingPostId` flag on the draft re-uses the composer pipeline; old post is deleted at submit time.

Still deferred:

- **Cross-workspace post deeplink resolution** - `app/video/[postId].tsx` shows post-not-found if the postId is not in the active workspace's recent feed. FULL should fetch the post by id first to resolve its workspace, then `setActive` and load.
- **expo-clipboard** - Copy link in the video detail overflow falls back to `Share.share` because `expo-clipboard` is not installed. `npm i expo-clipboard` and swap `Share.share` for `Clipboard.setStringAsync` in `app/video/[postId].tsx`.
- **Real notifications endpoint** - `app/settings/notifications.tsx` is wired to a mock feed derived from seed posts. When push goes live, build `GET /v1/notifications` (proposed schema in `docs/handoff/CTO_KT.md` §3.2.5) and replace `lib/notifications/mockFeed.ts`.
- **Token-discipline cosmetics** - a handful of token-equivalent raw paddings (`24`, `12`, `16`) and font sizes in the button family. Documented in `docs/handoff/FLOW_AUDIT.md` §"Worth noting but not fixed". Cosmetic, not functional.

## Where to find things

```
app/                  - Expo Router screens (file-based routes)
  (auth)/             - welcome, method, email, otp, invite-code, profile-setup
  (tabs)/             - profile, upload, _layout (TopBar header)
  composer/           - record, edit, preview
  settings/           - index, language, legal, delete-account
  video/[postId].tsx  - PagerView swipe between own posts
  tenant-switcher.tsx - modal sheet
  add-tenant.tsx      - invite + by-domain
  global-profile.tsx  - right drawer
  index.tsx           - boot router
  _layout.tsx         - root Stack + providers + Linking + NetInfo wifi resume
components/           - 22 components incl. TopBar, ModalSheet, Drawer, VideoTile, CTAPicker, UploadProgressBanner, CellularWarningSheet
lib/
  api/                - axios client, 8 wrapper modules, mocks/, queries.ts (TanStack Query), config.ts (MOCK_API switch)
  store/              - zustand stores (auth, tenant, draft, upload, theme, language, settings)
  theme/              - tokens, light/dark surfaces, ThemeProvider, useTheme, fonts loader
  video/              - errors, pickFromGallery, recordWithCamera, validateMedia, uploader (SCAFFOLD/FULL switch), uploadDriver
  i18n/               - i18next + expo-localization wiring
  deeplinks/          - parser + intentStore
  notifications/      - register (SCAFFOLD stub)
  monitoring/         - sentry (SCAFFOLD shim)
  toast.ts            - toast store
locales/              - en (full), es/fr/hi/ar (sample)
docs/                 - 8 spec files (rules, design system, identity, app shell, screens, video pipeline, API contracts, platform infra)
types/api.ts          - every API shape from docs/06-api-contracts.md
```

## Acceptance checklist (all 20 items)

| # | Status | Notes |
|---|---|---|
| 1 | PASS | New user flow: welcome -> method -> email -> otp ("123456") -> profile-setup -> tabs/profile. Invite path: welcome -> invite-code -> resolve -> email -> otp -> profile-setup. Pick / record -> validate -> composer/edit -> composer/preview -> publish -> tile appears with status `pending` (when `requireApproval` is true). |
| 2 | PASS | The seed includes 4 workspaces. The boot router selects the first active membership when no `lastActive` is persisted. |
| 3 | PASS | TopBar is rendered as the Tabs header in `(tabs)/_layout.tsx` so it persists across both tab screens. |
| 4 | PASS | Theme tokens cover light + dark; ThemeProvider honors system + manual override. No drop shadows on cards in dark mode. |
| 5 | PASS | `app/composer/record.tsx` reads `activeWorkspace.capabilities.maxVideoSeconds` for the recording cap. |
| 6 | PASS | All edge cases traced in Phase 6 commit: cancel mid-upload via banner, force-quit recovery via persisted uploadStore + manual Resume, single-active queue (concurrent runUpload calls go to `queued`), CellularWarningSheet > 25 MB gated on `settingsStore.warnBeforeCellular`, composer discard-draft sheet on tenant switch. |
| 7 | PASS | `app/(tabs)/profile.tsx` renders the membership status banner for `pending_invite` (info), `pending_request` (warning), `revoked` (danger). `(tabs)/_layout.tsx` hides the Upload tab via `href: null` when membership is not `active`. |
| 8 | PASS | `app/(tabs)/profile.tsx` VideoTile onPress routes to `/video/[postId]`. The detail screen uses `react-native-pager-view` for chronological swipe between own posts. |
| 9 | PASS | `/check-rules` blinklink sweep returns empty across `app/`, `components/`, `locales/`, `lib/`. |
| 10 | PASS | `/check-rules` em/en dash sweep returns empty across all source. |
| 11 | PASS | `app/settings/language.tsx` calls `changeLanguage(code)` which writes to `useLanguageStore` and calls `i18n.changeLanguage(resolved)`. All `useTranslation` consumers re-render live. |
| 12 | PASS | `app/_layout.tsx` calls `I18nManager.allowRTL(false)` and `forceRTL(false)` at module load. |
| 13 | PASS | `app/settings/delete-account.tsx` requires the user to type "DELETE" exactly before enabling the destructive button. On confirm, mutates `useDeleteMe`, clears all stores, queryClient.clear, replaces to `(auth)/welcome`. |
| 14 | PASS | `app/composer/preview.tsx` opens `CellularWarningSheet` when `NetInfo.fetch().type === 'cellular'` AND file size > 25 MB AND `settingsStore.warnBeforeCellular` is on. |
| 15 | PASS | `lib/api/client.ts` interceptor implements single-flight 401 refresh; concurrent 401s share the same in-flight `inFlightRefresh` promise. |
| 16 | PASS | `lib/deeplinks/parser.ts` parses `enterprisecreator://w/{id}`. The boot router consumes the intent and `setActive(workspaceId)` -> `(tabs)/profile` (or `add-tenant` if not a member). |
| 17 | PASS | `lib/notifications/register.ts` is only invoked when the user toggles the Settings row. Cold start never requests permissions. |
| 18 | UNVERIFIED | Cannot be proven in this build sandbox. Run `npx expo start` and verify on iOS / Android. |
| 19 | PASS | `MOCK_API: boolean = true` in `lib/api/config.ts`. Every wrapper short-circuits to its mock. |
| 20 | PASS | Phase 8 `qa-reviewer` returned PASS_WITH_WARNINGS, 0 FAILs. Top-priority WARNs were addressed in the Phase 8 polish commit; remaining WARNs are token-discipline cosmetics documented above. |

## Security posture

A full security audit ran on 2026-05-05. Verdict: **READY FOR PRODUCTION**. Token storage, HTTPS enforcement, deep link parsing, WebView config, CTA URL validation, workspace header isolation, idempotency keys, sign-out cleanup, and permission scopes all verified clean. Zero HIGH / CRITICAL `npm audit` findings (15 moderate findings are all in Expo's dev-tool transitive chain - never ship in the runtime bundle).

Full breakdown and pre-launch checklist: `docs/handoff/CTO_KT.md` §4.

## Post-handoff first commit

When the platform team picks this up, the recommended first FULL-mode commit is:

1. Set `EXPO_PUBLIC_API_BASE_URL`.
2. Flip `MOCK_API` to `false` in `lib/api/config.ts`.
3. Run `npx expo start`, sign in with a real test account, verify the home and at least one upload round-trip.
4. Open the seven decisions in the section above with the API team and turn each into a small follow-up PR.
