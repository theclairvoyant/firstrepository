# Enterprise Creator - Flow Audit

Audited: 2026-05-05
Scope: every route in `app/` against the implemented behavior in code, with notes for backend handoff.

This document is structured for two audiences:
1. **Backend developer** - needs to know which endpoints get called, in what order, with what assumptions about state.
2. **Product / design reviewer** - needs to confirm the flows behave as intended end-to-end.

For the runnable smoke test, see `BACKEND_SMOKE_TESTS.sh` in this same folder.

---

## 1. App-level architecture

### Modes
The app has one runtime configuration knob:
- `MOCK_API` (resolved from `EXPO_PUBLIC_MOCK_API` and overridden by `operatingMode: SCAFFOLD` in `CLAUDE.md`). When true, every API call hits `lib/api/mocks/*.ts`. When false, every call hits `API_BASE_URL` via the axios client in `lib/api/client.ts`.
- All API wrappers in `lib/api/{auth,identity,tenants,workspaces,posts,tags,ctas,upload,pushTokens}.ts` follow the pattern `if (MOCK_API) return mock.fn(); return http(...)`. There is exactly one branch point per endpoint.

### State
- **Server state** lives in TanStack Query under stable keys defined in `lib/api/queries.ts` (`keys.me`, `keys.memberships`, `keys.workspace(id)`, `keys.myPosts(id)`, etc.). Mutations invalidate the relevant keys on success.
- **Client state** lives in five Zustand stores:
  - `authStore` - `jwt`, `creator`, `signIn`, `signOut`. JWT persisted via `expo-secure-store`.
  - `tenantStore` - `activeWorkspaceId`, `lastActiveWorkspaceId`, `defaultWorkspaceId`. Persisted via AsyncStorage.
  - `draftStore` - composer draft (title, description, tags, cta, localUri, editingPostId). Persisted.
  - `uploadStore` - active upload jobs and their progress.
  - `settingsStore`, `themeStore`, `languageStore` - user preferences. Persisted.

### Boot sequence (`app/index.tsx`)
1. Hydrate `authStore` and `tenantStore`.
2. If no JWT -> `replace('/(auth)/welcome')`.
3. Call `useMe()`. If response has no `creator` -> `replace('/(auth)/profile-setup')`.
4. Resolve which workspace to land in: `defaultWorkspaceId` > `lastActiveWorkspaceId` > first active membership.
5. Call `setActive(id)`, then `replace('/(tabs)/profile')`.

If a deep link intent is pending in `deeplinks/intentStore`, it's preserved across the auth boundary so e.g. an invite code sent to a logged-out user is consumed after they finish signing in.

### Routes
35 route files total. Grouped:
- **Auth** (7): `(auth)/{welcome,method,email,otp,profile-setup,invite-code}`
- **Tabs** (3): `(tabs)/{profile,upload}` + custom tab bar
- **Composer** (5): `composer/{record,edit,tags,cta,preview}`
- **Settings** (8): `settings/{index,language,legal,support,notifications,default-workspace,delete-account}`
- **Workspace** (2): `tenant-switcher`, `add-tenant`
- **Global profile** (4): `global-profile`, `edit-global-profile`, `edit-global-email`, `edit-membership`
- **Discovery** (1): `search-by-email`
- **Video** (1): `video/[postId]`
- **Boot/dev** (3): `_layout`, `index`, `_design-preview`

---

## 2. Flow inventory

Every flow below is documented with its **trigger**, **steps**, **endpoints called**, and **exit conditions**.

### 2.1 First-time sign-up (cold start, no account)

```
boot -> /(auth)/welcome
welcome -> /(auth)/method  [Sign in / Sign up]
method  -> /(auth)/email   [Email]
email   -> POST /v1/auth/email/start   {email}
        -> /(auth)/otp?email=...
otp     -> POST /v1/auth/email/verify  {email, code}
        -> on success: signIn(jwt), persist
        -> /(auth)/profile-setup
profile-setup -> POST /v1/identity/profile {firstName, lastName, globalUsername, phone?, avatarUrl?}
              -> setCreator(creator)
              -> /
boot router -> /(tabs)/profile (no workspace yet -> empty state)
```

Endpoints: `POST /v1/auth/email/start`, `POST /v1/auth/email/verify`, `POST /v1/identity/profile`.

Edge cases handled:
- Resend OTP after 30s cooldown (UI countdown in `otp.tsx`).
- Username taken -> 409 CONFLICT, displayed as "That username is taken" inline.
- User backs out of `profile-setup` -> Alert confirming sign-out (since the JWT is already minted).

### 2.2 Returning user sign-in

```
boot   -> /(auth)/welcome (if JWT was cleared)
        OR
boot   -> /(tabs)/profile (if JWT persisted, /v1/identity/me returns creator)
```

If `/v1/identity/me` returns `creator: null` (JWT valid but profile somehow missing), boot routes to `profile-setup` so the user can complete it. This is recovery, not normal path.

### 2.3 Sign-in via invite code (deep link)

```
deeplink -> intentStore.set({kind:'invite', code:'XXXX2345'})
boot     -> /(auth)/welcome
welcome  -> /(auth)/invite-code
invite-code -> POST /v1/invites/resolve {code}
            -> /(auth)/method (continue to email auth)
method     -> ... email -> otp -> profile-setup ...
profile-setup completion -> /
boot      -> /add-tenant (intent consumed there) OR /(tabs)/profile
```

The deep link intent flows through the entire auth funnel and is consumed in the first screen that knows what to do with it.

### 2.4 Add a workspace via invite code

```
profile (empty state) OR tenant-switcher (Add) -> /add-tenant
add-tenant InviteCard -> POST /v1/invites/resolve {code}
                      -> show workspace card
                      -> POST /v1/invites/redeem {code}
                      -> setActive(id)
                      -> /(tabs)/profile
```

Endpoints: `POST /v1/invites/resolve`, `POST /v1/invites/redeem`.

Errors:
- `INVITE_EXPIRED` (410), `INVITE_ALREADY_USED` (409), `WORKSPACE_FULL` (cap reached) -> mapped to friendly messages via `addTenant.errors.*`.

### 2.5 Add a workspace via verified work email

```
profile (empty state) OR add-tenant EmailCard -> /search-by-email
search-by-email step 1 (enter):
  if email is the creator's verified global email -> skip to step 3
  else -> POST /v1/auth/email/start {email} -> step 2
search-by-email step 2 (verify):
  POST /v1/auth/email/verify {email, code}
  -> step 3
search-by-email step 3 (results):
  GET /v1/discovery/by-domain
  for each row, user can:
    POST /v1/workspaces/{id}/request-invite -> success toast -> back
  if no results: CTA back to /add-tenant invite code path
```

The verified email is a hard gate: a workspace cannot be joined unless it whitelists a verified email domain. This matches the contract that admin-side allowlists drive discovery.

Endpoints: `POST /v1/auth/email/start`, `POST /v1/auth/email/verify`, `GET /v1/discovery/by-domain`, `POST /v1/workspaces/{id}/request-invite`.

### 2.6 Accept an admin invite (incoming)

```
tabs top bar workspace menu -> /tenant-switcher
tenant-switcher: Pending section is collapsed by default
tap chevron to expand -> shows two subsections:
  INVITES TO YOU (status=pending_invite)
  REQUESTS YOU SENT (status=pending_request)
each invite card:
  Accept -> POST /v1/memberships/{id}/accept -> setActive -> /(tabs)/profile
  Decline -> Alert confirm -> POST /v1/memberships/{id}/decline -> refetch
each request card:
  Cancel -> DELETE /v1/workspaces/{id}/request-invite -> refetch
```

Endpoints (NEW for backend): `POST /v1/memberships/{id}/accept`, `POST /v1/memberships/{id}/decline`. Documented in `docs/06-api-contracts.md`.

A `pending_invite` membership carries `invitedAt` (ISO) and `invitedBy` (display name) so the UI can show "from Priya Shah".

### 2.7 Switch active workspace

```
tabs top bar workspace menu -> /tenant-switcher
ACTIVE section: tap row -> setActive(id) -> /(tabs)/profile
```

Endpoints: `GET /v1/memberships` (already cached).

### 2.8 Profile feed (active workspace)

```
/(tabs)/profile
GET /v1/workspaces/{id}
GET /v1/memberships (cached)
GET /v1/workspaces/{id}/posts/me?cursor=&limit=6 (infinite query)
```

Filter pills toggle between Live (`status=live`) and In Review (`status=processing|in_review`). Filtering is client-side over the already-fetched pages; backend returns all statuses for `/me`.

Tap post tile -> `/video/[postId]`.

### 2.9 Edit workspace profile

```
profile -> Edit profile button -> /edit-membership
PATCH /v1/memberships/{id} {workspaceUsername?, bio?, displayName?, bannerUrl?}
POST /v1/memberships/{id}/avatar [multipart] for avatar pick
```

Bio rejects URLs (validator in `lib/validators/bio.ts`). Username availability is debounced 350ms via `useUsernameAvailable`.

`bannerUrl` and `displayName` are extensions to `PatchMembershipInput`. Confirm backend supports them - flagged in `docs/06-api-contracts.md`.

### 2.10 Edit global profile

```
tabs avatar -> /global-profile drawer -> Edit Profile -> /edit-global-profile
PATCH /v1/identity/profile {firstName?, lastName?, globalUsername?, phone?, avatarUrl?}
POST /v1/identity/avatar [multipart] for avatar pick
```

Email field is a Pressable that routes to `/edit-global-email` (read-only here on purpose).

### 2.11 Change global email

```
edit-global-profile email row -> /edit-global-email
step 1: POST /v1/auth/email/start {email: new}
step 2: POST /v1/auth/email/verify {email: new, code}
        PATCH /v1/identity/profile {email: new}
        success Alert -> back
```

The verify step is the security gate. Backend should enforce that a verified-email change requires the OTP path; the mock trusts the caller because the verify step happened just before.

### 2.12 Compose a new post (gallery pick)

```
upload tab -> /(tabs)/upload
gallery picker -> sets draft.localUri -> /composer/edit
edit screen:
  /composer/tags (modal) -> patches draft.tags
  /composer/cta (modal)  -> patches draft.ctaId / ctaUrl
preview button -> /composer/preview
preview submit -> uploadDriver.runUpload(draft, workspaceId)
  POST /v1/uploads/sign {workspaceId, filename, mime, sizeBytes}
  PUT signed URL with H.264 MP4
  POST /v1/uploads/complete {mediaKey}
  POST /v1/workspaces/{id}/posts {title, description, tagIds, ctaId, ctaUrl?, mediaKey}
on success: clearDraft, dismissAll, /(tabs)/profile, success toast
```

Endpoints: `POST /v1/uploads/sign`, `POST /v1/uploads/complete`, `POST /v1/workspaces/{id}/posts`.

### 2.13 Compose a new post (in-app camera)

```
upload tab -> Record -> /composer/record
on stop -> sets draft.localUri (recorded MP4) -> /composer/edit
... same as 2.12 from edit onward
```

### 2.14 Edit an existing post

```
video detail More menu -> Edit -> Alert confirm -> setDraft({...post fields, localUri: post.mediaUrl, editingPostId: post.id})
                       -> /composer/edit
... edit / tags / cta / preview ...
preview submit detects draft.editingPostId:
  DELETE /v1/posts/{originalId} (fire-and-forget)
  ... then runs the normal upload + create flow ...
```

The edit flow re-uploads the media. We do NOT use `PATCH /v1/posts/{id}` for media changes because the upload pipeline can't selectively swap media in-place.

`PATCH /v1/posts/{id}` exists in the contract for metadata-only edits but is not currently wired through any UI - dead hook `usePatchPost` is exported but unused. See section 6 below.

### 2.15 View / share / delete a post

```
profile grid tap -> /video/[postId]
PagerView swipes between posts in the same query result
More menu:
  Share -> native Share sheet
  Copy link -> Clipboard
  Edit -> see 2.14
  Delete -> Alert confirm -> DELETE /v1/posts/{id} -> back
```

### 2.16 Settings

```
tabs settings circle -> /settings
top-level rows route to:
  /settings/language     - language preference
  /settings/legal?url=&title=  - WebView for privacy/terms
  /settings/support      - mailto link
  /settings/notifications - mock notification feed (post_live, post_traction)
  /settings/default-workspace - radio list of active memberships
  /settings/delete-account - DELETE confirmation flow
Sign out -> POST /v1/auth/sign-out -> clear stores -> /(auth)/welcome
```

### 2.17 Delete account

```
settings -> /settings/delete-account
type "DELETE" to enable button
DELETE /v1/identity/me
clear all stores (auth, tenant, draft, upload) -> /(auth)/welcome
```

### 2.18 Boot tab visibility rules

- Upload tab is HIDDEN if there is no active workspace (no `activeWorkspaceId`). The empty profile state is the only way for a brand-new user to see the upload nav.
- The settings circle is always visible.

---

## 3. Cross-flow / linked flows

These are flows that span multiple top-level entries and need to behave consistently.

### 3.1 Auth -> Onboarding -> Workspace gating

| Stage | State on completion | Routes to |
|-------|---------------------|-----------|
| Welcome | nothing | `/(auth)/method` or `/(auth)/invite-code` |
| Email + OTP | `jwt` set, `creator` from `/v1/identity/me` may be null | `/(auth)/profile-setup` if no creator |
| Profile setup | `creator` set, `hasCreatorProfile=true` | `/` (re-runs boot) |
| Boot post-profile | no memberships -> `/(tabs)/profile` empty state | profile shows `pasteInviteCode` + `searchByEmail` CTAs |
| First workspace join | `hasJoinedAnyWorkspace=true`, `activeWorkspaceId` set | `/(tabs)/profile` workspace view |

The `hasJoinedAnyWorkspace` flag is mock-only - in FULL mode it's implicit (memberships array length).

### 3.2 Composer state machine

```
[upload tab]
   |
   |--gallery--> draft.localUri set --> [edit]
   |
   |--record---> [record] --> on stop --> draft.localUri set --> [edit]

[edit]
   |--tags--> [tags modal] --> back to [edit]
   |--cta---> [cta modal]  --> back to [edit]
   |--discard--> Alert -> clearDraft -> back
   |--preview--> [preview]

[preview]
   |--back--> [edit]
   |--submit-->
        if draft.editingPostId: DELETE /v1/posts/{id} (fire-and-forget)
        upload pipeline ->
        create post ->
        clearDraft -> dismissAll -> /(tabs)/profile
```

Draft is persisted, so backgrounding the app does not lose the in-flight composition.

### 3.3 Workspace switch ripple

When `setActive(workspaceId)` is called from anywhere (tenant switcher, accept invite, redeem invite, deep link):
1. `tenantStore.activeWorkspaceId` updates and persists.
2. `lastActiveWorkspaceId` updates.
3. Profile tab re-renders (subscribes to `activeWorkspaceId`).
4. The upload tab visibility flips on (becomes available).
5. Existing TanStack queries keyed on `workspace(id)` re-fetch lazily.

### 3.4 Email-verification trust path

The mock layer trusts that a `PATCH /v1/identity/profile {email}` call has been preceded by a successful `POST /v1/auth/email/verify {email, code}`. The backend MUST enforce this server-side - do not rely on the client to gate it.

Same for `POST /v1/workspaces/{id}/request-invite` after `/v1/discovery/by-domain` - the server should re-verify the email is verified for the requesting user.

### 3.5 Notifications -> Post detail

`/settings/notifications` derives a mock feed from seed posts; tapping a notification routes to `/video/[postId]`. In FULL mode, the backend should provide a `GET /v1/notifications` endpoint and a `POST /v1/notifications/{id}/read` for marking. **Not yet implemented in the contract** - flag for backend.

### 3.6 Push tokens (deferred)

The push token endpoints (`POST /v1/identity/push-tokens`, `DELETE /v1/identity/push-tokens/{id}`) exist in the contract and have wrapper + mock + unused hooks (`useRegisterPushToken`, `useDeletePushToken`). The actual `expo-notifications` registration is stubbed in SCAFFOLD. When push is wired in FULL mode, the registration call should fire on app boot after auth.

---

## 4. Inconsistencies found and resolved

### 4.1 RESOLVED: Cramped inline pending workspace rows (tenant switcher)

**Before**: pending invites and requests rendered alongside active rows with avatar + name + handle + type badge + status chip in a single row, causing "V…" / "@VELO…" truncation.

**After**: `/tenant-switcher` now has a collapsed pending section with subsections "INVITES TO YOU" and "REQUESTS YOU SENT". Each pending workspace renders as a card with workspace info on top, status dot + chip in the middle, and Accept+Decline (invites) or Cancel (requests) at the bottom. Plenty of room.

### 4.2 RESOLVED: Cramped domain-discovery results card (add-tenant)

**Before**: `/add-tenant` had an inline `DomainCard` that called `/v1/discovery/by-domain` and rendered each result in a single row that truncated. Also bypassed email verification entirely.

**After**: Replaced with `EmailCard` that simply CTAs into the verified `/search-by-email` flow. Both entry points (profile empty state, add-tenant) now go through the same gated flow.

### 4.3 RESOLVED: Search-by-email locale keys missing

**Before**: screen rendered raw `searchByEmail.title`, `searchByEmail.heading`, etc.

**After**: `locales/en.json` has the full `searchByEmail.*` block including pluralized `resultsBody_one` / `resultsBody_other`.

### 4.4 KNOWN: 4 dead query hook exports

`lib/api/queries.ts` exports `useCreatePost`, `usePatchPost`, `useRegisterPushToken`, `useDeletePushToken` - none are imported by any screen. Reasons:
- `useCreatePost` is bypassed by `lib/video/uploadDriver.ts` calling `postsApi.createPost` directly (the upload pipeline needs to coordinate the upload steps with the create step in one driver).
- `usePatchPost` would back a metadata-only edit-in-place flow; we currently re-upload on edit.
- Push hooks are stubbed pending real expo-notifications wiring.

**Disposition**: leave the hooks in place - they're cheap to keep and avoid having to re-author them when the matching UI is built. Do not treat as a bug.

### 4.5 KNOWN: SCAFFOLD comments

Four `// SCAFFOLD` comments remain, all flagging the backend-replacement points:
- `app/edit-membership.tsx:149` - cover URI persistence is local URI in mock; backend should swap to CDN URL.
- `app/edit-membership.tsx:189` - avatar multipart upload behavior.
- `app/edit-global-profile.tsx:101` - avatar URL handling parity.
- `app/settings/notifications.tsx:2` - notification mock feed; backend needs to replace with `GET /v1/notifications`.

**Disposition**: these are intentional handoff markers, not bugs.

---

## 5. Endpoints used by the app (complete list)

Grouped by surface. Backend should confirm each one is wired in staging.

### Auth (3)
- `POST /v1/auth/email/start` - send 6-digit code
- `POST /v1/auth/email/verify` - verify code, return `{accessToken, refreshToken, creator?}`
- `POST /v1/auth/sign-out` - revoke tokens

### Identity (5)
- `GET /v1/identity/me` - current creator + memberships
- `POST /v1/identity/profile` - first-time profile create
- `PATCH /v1/identity/profile` - edit name/username/email/phone/avatarUrl
- `DELETE /v1/identity/me` - delete account
- `POST /v1/identity/avatar` - multipart avatar upload
- `POST /v1/identity/push-tokens` - register expo-notifications token (deferred)
- `DELETE /v1/identity/push-tokens/{id}` - revoke token (deferred)
- `GET /v1/identity/username-available?u=...` - username uniqueness check

### Invites & discovery (5)
- `POST /v1/invites/resolve` - look up workspace from invite code
- `POST /v1/invites/redeem` - join via code
- `GET /v1/discovery/by-domain` - list workspaces matching the verified email's domain
- `POST /v1/workspaces/{id}/request-invite` - send a request
- `DELETE /v1/workspaces/{id}/request-invite` - cancel a request

### Memberships (6)
- `GET /v1/memberships` - all my memberships (active + pending)
- `GET /v1/memberships/{id}` - single membership
- `PATCH /v1/memberships/{id}` - edit `{workspaceUsername?, bio?, displayName?, bannerUrl?}`
- `POST /v1/memberships/{id}/avatar` - multipart avatar upload
- `POST /v1/memberships/{id}/accept` - accept a pending_invite **NEW**
- `POST /v1/memberships/{id}/decline` - decline a pending_invite **NEW**

### Workspace metadata (3)
- `GET /v1/workspaces/{id}` - workspace + brand + capabilities
- `GET /v1/workspaces/{id}/tag-topology` - tag categories for composer
- `GET /v1/workspaces/{id}/ctas` - allowed CTAs for composer

### Posts (5)
- `GET /v1/workspaces/{id}/posts/me?cursor=&limit=24` - my posts in this workspace
- `GET /v1/posts/{postId}` - single post
- `POST /v1/workspaces/{id}/posts` - create post (after upload)
- `PATCH /v1/posts/{postId}` - metadata edit (currently unused by UI)
- `DELETE /v1/posts/{postId}` - delete post

### Uploads (2)
- `POST /v1/uploads/sign` - signed URL + mediaKey for an MP4
- `POST /v1/uploads/complete` - mark upload complete, kick processing

**Total: 32 endpoints + 2 new (`memberships accept/decline`).**

---

## 6. Open questions for backend

These are design decisions that the SCAFFOLD couldn't resolve:

1. **Notifications endpoint**: the app surfaces notifications in `/settings/notifications`, derived from a mock feed. We need a `GET /v1/notifications?cursor=&limit=` and `POST /v1/notifications/{id}/read`. Schema: `{id, kind: 'post_live' | 'post_traction', postId, workspaceId, createdAt, readAt?}`.

2. **Membership patch fields**: the app calls `PATCH /v1/memberships/{id}` with `displayName` and `bannerUrl` in addition to the documented `workspaceUsername` and `bio`. Confirm backend accepts these. Updated in `docs/06-api-contracts.md`.

3. **Identity profile patch fields**: the app calls `PATCH /v1/identity/profile` with `email` for the change-email flow. Confirm backend accepts and re-checks the verify trust path server-side.

4. **Pending invite metadata**: `WorkspaceMembership` has new optional fields `invitedAt` and `invitedBy` for `pending_invite` rows. Backend should populate these on read.

5. **`/v1/memberships/{id}/accept` and `/decline`**: net-new endpoints to support inviting a creator by email (admin issues the invite, the creator accepts in-app). See section 2.6.

6. **Idempotency**: the upload pipeline (`POST /v1/uploads/sign`, `POST /v1/uploads/complete`, `POST /v1/workspaces/{id}/posts`) generates an `Idempotency-Key` header for `/uploads/sign` and `/posts`. Backend must honor this so a retry after a network blip doesn't double-create.

7. **Cellular warning threshold**: the app warns before uploading on cellular if the file is over 25 MB. This is a client-side rule and doesn't need backend involvement.

---

## 7. Test plan

The backend smoke test (`BACKEND_SMOKE_TESTS.sh`) runs through every flow above as a sequence of `curl` calls. It exits non-zero if any step fails, with a clear error message.

To run:

```bash
export API_BASE_URL="https://staging.your-backend.example.com"
export TEST_EMAIL="qa+enterprise-creator@your-domain.com"
bash docs/handoff/BACKEND_SMOKE_TESTS.sh
```

The script is idempotent in the sense that it cleans up the resources it creates (deletes the test post, declines the test invite). It does not delete the test account - you'll want to retain that across runs.

Manual UX tests (per flow) the QA tester should walk:

- [ ] Sign up new account end-to-end with a real email; receive OTP; complete profile.
- [ ] Sign out and back in; land in the right workspace by default.
- [ ] Add workspace via invite code (positive); via expired code (negative); via used code (negative).
- [ ] Add workspace via verified email; verify with OTP; request access to a discovered workspace.
- [ ] Open switcher; expand pending section; accept an invite; verify it lands in the active section.
- [ ] Open switcher; decline an invite; verify it disappears.
- [ ] Compose a post via gallery; tag, set CTA, preview, submit; verify it appears in the profile feed in `processing` then `live`.
- [ ] Compose a post via in-app camera; verify duration cap enforces.
- [ ] Edit a post; verify the original is deleted and the new one appears.
- [ ] Delete a post.
- [ ] Edit global profile; change email via the OTP flow; verify the new email is reflected.
- [ ] Edit workspace profile; change cover, avatar, bio, display name; verify persisted on reload.
- [ ] Open settings; toggle theme, language, cellular warning, push notifications; verify each persists.
- [ ] Delete account; verify all local state is wiped and the user lands on welcome.

---

## 8. Files of note for the backend dev

- `docs/06-api-contracts.md` - canonical endpoint table.
- `lib/api/mocks/__seed.ts` - sample data shapes the FE expects.
- `types/api.ts` - the TypeScript types every response is parsed against.
- `lib/api/client.ts` - axios setup including auth header, workspace header, idempotency, error mapping.
- `lib/api/queries.ts` - how each endpoint is consumed (cache keys, invalidation rules).
- `docs/05-video-pipeline.md` - the upload pipeline contract (sign + PUT + complete + create).
