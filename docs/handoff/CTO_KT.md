# Enterprise Creator - CTO Knowledge Transfer

A focused 30-minute orientation for the CTO inheriting this codebase.

You will end this doc knowing:
1. What the app is and how it's structured.
2. How to run it locally and what mode it's in.
3. Exactly what you need to do to wire it to the Blinklink backend.
4. The security posture, tested today, and the specific items you should audit before launch.
5. Where to find the rest of the documentation.

> If you only have 5 minutes, read sections 1, 2, and 4. The rest you can come back to.

---

## 1. What this app is

A cross-platform mobile app (iOS + Android) for internal creators of Blinklink-customer companies. They sign in, switch between the workspaces of the companies they belong to, and upload short vertical videos for admin approval.

- **Stack**: Expo SDK 54, React Native 0.81, React 19, TypeScript strict, Expo Router, TanStack Query, Zustand, react-native-reanimated v4, expo-camera + expo-image-picker + expo-file-system, expo-secure-store.
- **Layout**: file-based routes under `app/`, shared components under `components/`, all infrastructure under `lib/` (api, store, theme, video, i18n, deeplinks, notifications, monitoring).
- **Deployment target**: Expo Application Services (EAS) builds for both stores. `app.config.ts` is the source of truth for build config.
- **Status**: SCAFFOLD-mode complete. All 35 routes are implemented end-to-end against the in-memory mock layer. No real backend is hit yet.

The product spec is in `docs/00..07-*.md`. The recent flow audit is in `docs/handoff/FLOW_AUDIT.md`.

---

## 2. Run it in 60 seconds

```bash
npm install
npx expo start
```

Press `i` for iOS simulator, `a` for Android emulator, or scan the QR with Expo Go on a physical device.

The app boots into SCAFFOLD mode (`EXPO_PUBLIC_MOCK_API` defaults to true). You'll land on the welcome screen. To log in:

- Email: anything (`qa@example.com`).
- OTP: `123456` (hardcoded in the mock).

Once in, you can exercise every flow without a backend.

---

## 3. Wire it to the Blinklink backend

### 3.1 The toggle

`lib/api/config.ts` reads `EXPO_PUBLIC_MOCK_API` at build time. Default is `true` (SCAFFOLD). Set it to `false` and the wrappers in `lib/api/{auth,identity,tenants,workspaces,posts,tags,ctas,upload,pushTokens}.ts` start dispatching every call through axios at `EXPO_PUBLIC_API_BASE_URL`.

Every wrapper has the same shape:

```ts
if (MOCK_API) return mock.fn(...);
return http(...);
```

There is exactly one branch point per endpoint. No partial-mode, no cherry-picking.

### 3.2 Steps in order

1. **Provision the env vars** in your EAS build profile (`eas.json` already has `development`, `preview`, `production` profiles - point each at the right backend host). The complete list:

   | Var | Purpose | Required when |
   |---|---|---|
   | `EXPO_PUBLIC_MOCK_API` | `true` for SCAFFOLD, `false` for FULL | always (defaults to true) |
   | `EXPO_PUBLIC_API_BASE_URL` | axios base URL, no trailing slash | `MOCK_API=false` |
   | `EXPO_PUBLIC_PRIVACY_URL` | https URL for the Privacy WebView | always (else row is hidden) |
   | `EXPO_PUBLIC_TERMS_URL` | https URL for the Terms WebView | always (else row is hidden) |
   | `EXPO_PUBLIC_SUPPORT_EMAIL` | mailto target on the support row | always (else row toasts a notice) |
   | `EXPO_PUBLIC_SENTRY_DSN` | Sentry DSN | when monitoring is wired |
   | `EXPO_PUBLIC_EAS_PROJECT_ID` | for `Notifications.getExpoPushTokenAsync` | when push is wired |
   | `EXPO_PUBLIC_ENVIRONMENT` | one of `production` / `staging` / `development` | always |

2. **Run the smoke test against staging** to confirm the backend matches the contract:

   ```bash
   export API_BASE_URL=https://api.staging.blinklink.example
   export TEST_EMAIL=qa+ec@blinklink.example
   bash docs/handoff/BACKEND_SMOKE_TESTS.sh
   ```

   This walks every endpoint in roughly the order a real user hits them. Exits non-zero on the first failure with a clear message.

3. **Implement the two new endpoints** that the FE depends on but aren't in the original contract:
   - `POST /v1/memberships/{id}/accept` -> `{ membership }`
   - `POST /v1/memberships/{id}/decline` -> `{ ok }`

   See `docs/06-api-contracts.md` and `docs/handoff/FLOW_AUDIT.md` §2.6 for full schema.

4. **Confirm extension fields** the FE sends/expects on existing payloads (full list in `FLOW_AUDIT.md` §6):
   - `WorkspaceMembership.invitedAt?`, `invitedBy?` for `pending_invite` rows.
   - `PatchMembershipInput` accepts `displayName?` and `bannerUrl?` in addition to `workspaceUsername` and `bio`.
   - `PatchMeInput` accepts `email?` for the change-email flow.

5. **Decide on notifications**: there is no `GET /v1/notifications` endpoint yet. The Settings > Notifications screen shows a mock feed derived from seed posts. When push goes live, build the endpoint with shape `{id, kind: 'post_live'|'post_traction', postId, workspaceId, createdAt, readAt?}` and replace `lib/notifications/mockFeed.ts` with a real query.

6. **Wire the deferred surfaces** (each has a SCAFFOLD/FULL boundary documented inline):
   - `lib/video/uploader.ts` - the FULL branch is already implemented; just runs when MOCK_API=false.
   - `lib/notifications/register.ts` - uncomment the FULL block (calls `Notifications.requestPermissionsAsync` + `Notifications.getExpoPushTokenAsync({projectId})` + `POST /v1/identity/push-tokens`).
   - `lib/monitoring/sentry.ts` - install `@sentry/react-native`, uncomment the init block, set `EXPO_PUBLIC_SENTRY_DSN`.
   - `app/(auth)/method.tsx` - SSO buttons currently toast "SSO setup pending". Wire Google/Microsoft via `expo-auth-session`, Apple via `expo-apple-authentication`. Server exchange via `POST /v1/auth/sso/exchange`.

7. **Do the real-device-only checks** (full list in `HANDOFF.md` §"Real-device-only checks"). The most important:
   - iPhone HEVC clip transcoding to H.264.
   - Android long-video duration cap.
   - Cellular toggle behavior > 25 MB.
   - iOS background suspension during upload.
   - Permission denial recovery.
   - Deep link round trips.

---

## 4. Security posture

A full security audit ran on 2026-05-05 against this codebase. The verdict was **READY FOR PRODUCTION**. Specific findings:

### Already correct
- **Token storage**: JWT and refresh token live in `expo-secure-store` (Keychain on iOS, EncryptedSharedPreferences on Android). Never AsyncStorage, never plaintext.
- **HTTPS-only**: `app.config.ts` sets `ITSAppUsesNonExemptEncryption: false` for iOS. Android has no `usesCleartextTraffic` flag and only requests `INTERNET`-adjacent permissions when actually needed. The axios client refuses to fire any request unless `EXPO_PUBLIC_API_BASE_URL` is a real value (the sentinel `https://api.example.invalid` triggers a hard refusal).
- **Deep link parser** (`lib/deeplinks/parser.ts`): strict whitelist of 4 intent kinds, regex-validates every segment, rejects unknown schemes. A malicious deep link cannot route the user anywhere unexpected.
- **WebView** (`app/settings/legal.tsx`): `originWhitelist: ['https://*']`, no `injectedJavaScript`, URLs come from build-time env vars only - deep links cannot reach this route.
- **CTA URL validation** (`app/composer/cta.tsx`): zod schema enforces `https?://` plus a valid URL shape. No `javascript:`, `data:`, or `file:` schemes pass.
- **Workspace header isolation** (`lib/api/config.ts`): `isGlobalPath()` blocks `X-Workspace-Id` from leaking on auth/identity/invites/discovery endpoints.
- **Idempotency keys** (`lib/api/client.ts`): RFC 4122 v4 UUIDs auto-set on every POST/PATCH/DELETE, preventing duplicate creates on retry.
- **Sign-out cleanup**: `signOut()` clears auth, tenant, draft, and upload stores plus invalidates the React Query cache. Theme/language/settings preferences are intentionally retained.
- **Permissions**: only camera, microphone, photo library (iOS) / READ_MEDIA_VIDEO/IMAGES (Android), and ACCESS_NETWORK_STATE - all justified by actual app functionality, all with meaningful descriptions.
- **No console.log of secrets**: only one `console.error` exists, in the FULL-mode "base URL not configured" guard - it logs the URL path, not any token.
- **No hardcoded customer data**: seed data uses `example.com` and `+1555...` placeholders only.
- **Error envelope sanitization**: the axios error mapper extracts only `code`, `message`, `requestId` - never raw body, stack trace, or internal IDs.

### Items the CTO should personally verify before launch
1. **Run `npm audit --audit-level=high`** - latest run had **0 HIGH/CRITICAL** findings. The 15 moderate findings are all in Expo's dev-tool transitive chain (`xcode`, `ip`, `tar` inside `@expo/cli` and `@expo/prebuild-config`) which never ships in the runtime bundle. Acceptable for production. Re-run before each release.
2. **Backend error envelope shape**: the FE expects `{ error: { code, message, requestId? } }`. Confirm every backend error path matches.
3. **Workspace header server-side enforcement**: the FE always sets `X-Workspace-Id` correctly, but the backend MUST 403 if the user is not a member of the specified workspace - never trust the header alone.
4. **Email-verify trust path**: `PATCH /v1/identity/profile {email}` and `POST /v1/workspaces/{id}/request-invite` are gated client-side by a preceding successful `/v1/auth/email/verify`. The backend MUST re-enforce this server-side.
5. **Idempotency-Key dedup window**: the FE generates a fresh UUID per mutation. Backend should dedupe within at least 5 minutes.
6. **Apple Sign In setup** and **EAS Project ID setup**: see `HANDOFF.md` for the step-by-step.

### What is NOT yet protected
- Network security configuration files (iOS `NSAppTransportSecurity` JSON dictionary, Android `network_security_config.xml`) - we rely on the OS defaults plus the absence of cleartext flags. Defense-in-depth would add explicit ATS dictionaries pinning to the production hosts. Add this if your security review demands it.
- Certificate pinning - not implemented. Adds friction for cert rotation; only justify if Blinklink security policy requires it.

---

## 5. Architecture pillars

| Pillar | Where | What |
|---|---|---|
| Routing | `app/_layout.tsx`, `app/index.tsx` | Boot router decides where to send the user; root layout wires providers, the 401 handler, and the deep link listener. |
| API | `lib/api/` | One wrapper module per resource group + a typed mock per resource group + the axios client + the queries hook layer. The `MOCK_API` switch is the only branch point. |
| State | `lib/store/` | Five Zustand stores: auth, tenant, draft, upload, settings + theme + language. Persisted via expo-secure-store (sensitive) and AsyncStorage (preferences). |
| Theme | `lib/theme/` | Light + dark token surfaces, ThemeProvider, useTheme. Every screen renders correctly in both modes. |
| Video | `lib/video/` | Pick + record + validate + uploader (SCAFFOLD timer, FULL pipeline) + uploadDriver orchestrator. |
| i18n | `lib/i18n/` | i18next + expo-localization. en is fully translated; es/fr/hi/ar have sample translations. Falls back to en for missing keys. |
| Deep links | `lib/deeplinks/` | Strict parser + intent store. Cold-start and runtime intent both flow through the same code path. |

---

## 6. Definition of done for any change

Inherited from `CLAUDE.md` (also enforced by the pre-commit hook in `scripts/check-file-rules.sh`):

- `npx tsc --noEmit` clean.
- `bash scripts/check-file-rules.sh <files>` clean (no em/en dashes anywhere, no "Blinklink" in user-visible strings, no emoji icons).
- Light + dark mode both render correctly.
- No new console.log / console.error / console.warn introduced.
- If a screen is added, it appears in the navigation flow it belongs to.
- If API code is touched, the mocks still work end-to-end.

---

## 7. Where to find the rest

| Doc | Purpose |
|---|---|
| `CLAUDE.md` | Hard rules (dashes, brand, RTL, etc.), tech stack, project structure |
| `docs/00-rules-and-mode.md` | The hard rules in spec form |
| `docs/01-design-system.md` | Tokens, typography, components |
| `docs/02-identity-and-onboarding.md` | Auth flows, identity model |
| `docs/03-app-shell.md` | Tab bar, top bar, switcher, drawer |
| `docs/04-screens.md` | Profile, upload, video detail, settings |
| `docs/05-video-pipeline.md` | The upload pipeline contract |
| `docs/06-api-contracts.md` | All endpoints, error codes, headers |
| `docs/07-platform-infrastructure.md` | i18n, deep links, push, Sentry |
| `docs/handoff/FLOW_AUDIT.md` | Every flow, every cross-flow, every endpoint, every open question |
| `docs/handoff/BACKEND_SMOKE_TESTS.sh` | Runnable bash + curl smoke test |
| `docs/handoff/README.md` | Backend dev's entry point |
| `HANDOFF.md` | Original SCAFFOLD-to-FULL handoff (kept for historical context; this doc supersedes for the CTO view) |
| `BUILD.md` | The original Claude Code build plan; historical |

---

## 8. Open decisions for product / backend

These are still on the table and worth a short conversation before launch:

1. `signOut.pushTokenId` semantics - sign out current session only, or revoke all tokens?
2. `usernameAvailable` case-folding rules - is `Kiran` distinct from `kiran`?
3. Upload S3 multipart vs single PUT for files near the 200 MB cap.
4. `requestInvite` return shape - sync membership object or `{ ok: true }` with a follow-up `/me` refresh?
5. `byDomain` auth requirement - the discovery screen has a JWT but no creator profile yet (email-verified only). Does the server accept that token?
6. `requestId` header surfacing - returned as `X-Request-Id` for Sentry breadcrumbs?
7. `creatorJoinPolicy` values across workspace types - confirm the real values per workspace tier.
8. Notifications schema - confirm or revise the proposed `{kind, postId, workspaceId, createdAt, readAt?}` shape.
9. Network security config - want explicit iOS ATS dictionary + Android `network_security_config.xml` pinning to production hosts?
10. Certificate pinning - is Blinklink security policy strict enough to require it?

---

## Welcome aboard

Anything not covered here lives in code with a comment explaining why. The pre-commit hook will catch most of the hard-rule violations. The smoke test will catch backend divergence. The flow audit doc will tell you what every screen does without you having to read it.

If you have a question that isn't answered by this doc, the spec, or the code itself - that's a doc gap and worth filing.
