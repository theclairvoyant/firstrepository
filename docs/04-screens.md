# Screens

## Profile screen (current workspace)

Mirrors an Instagram profile scoped to the active workspace.

### Layout, top to bottom

1. **Upload status banner** (only when uploadStore has an active or queued job): sticky above the header card. Shows "Uploading - 47%" with progress bar and cancel link, or "Upload failed - tap to retry", or "Resume upload from yesterday" if a persisted job is found on app boot.

2. **Header card**: 80px avatar, @workspace_username (mono), bio, stats row (Posts / Views / Clicks - numbers in Sora 700, labels in mono caption), two buttons: "Edit profile" (secondary), "Share profile" (secondary, opens system share sheet with deep link `enterprisecreator://w/{workspaceId}/u/{username}`).

3. **Membership status banner** if status is not active:
   - pending_invite: info color: "Invite pending. The admin has not yet activated your access."
   - pending_request: warning color: "Request pending. You will be notified when approved."
   - revoked: danger color: "Access revoked."

4. **Posts grid**: 3-column FlashList, aspectRatio 9/16, gap 2px, paginated via cursor.

5. **Empty state** (no posts yet, status active): centered icon, "No posts yet", subtext, primary "Upload now". Hidden if status is not active.

### VideoTile

Top-left overlay: status badge. Bottom row overlay: views icon + count, clicks icon + count. Overlays use bgOverlay 65% pill backgrounds. Tap -> `video/[postId]`.

### Status badge values

| Value | Dot | i18n key |
|-------|-----|----------|
| pending | warning | `status.pending` |
| approved | success | `status.approved` |
| live | success | `status.live` |
| rejected | danger | `status.rejected` |
| needs_edits | warning | `status.needsEdits` |

Tap any non-live badge to open a popover with the admin note if any.

## Upload composer

### Upload tab

The Upload tab itself is the pick screen. No intermediate route.

Two large tap targets:
- "Choose from gallery" -> launches gallery picker (see video pipeline doc)
- "Record now" -> opens composer/record.tsx

Below the tap targets, when on cellular and user has set "warn before cellular upload" preference, show a small info row.

### Record screen
Full-screen expo-camera, vertical only.
- Top bar: close, flash, flip, microphone toggle
- Center: viewfinder
- Bottom: timer ring around record button. Max duration = workspace.capabilities.maxVideoSeconds (default 60). Tap to start, tap again to stop. Long-press for tap-and-hold.
- After recording, route to composer/edit.tsx with local file URI and recorded duration.

### Edit screen

Three collapsible sections. Section 1 expanded by default.

**Section 1 - Title and description**
- Title: single line, max 80 chars, char counter
- Description: multi-line, max 500 chars, char counter

**Section 2 - Tags** (only visible if workspace.capabilities.creatorTagsEnabled)
- Each tag category renders as a sub-section: heading + selected bubbles + "+ Add tag" button. Button opens a bottom sheet with all tags in that category for multi-select.
- Source: GET `/v1/workspaces/{id}/tag-topology`. Users cannot create new tags or categories.

**Section 3 - Conversion (CTA)**
- List of pre-designed CTAs from workspace.capabilities.allowedCtas. Each row shows a rendered button preview.
- kind 'static': URL is locked, shown in muted text
- kind 'dynamic': URL input appears below selection with validation
- "No CTA" is always an option

**Sticky bottom bar**: Cancel link + Primary "Preview" (disabled until title is filled).

### Preview screen

Top: phone-frame video preview at 9:16, autoplay muted, tap to unmute. Below: title, description, tag chips, CTA preview. Bottom buttons:
- Secondary "Edit"
- Primary - label depends on workspace.capabilities.requireApproval:
  - true (default): "Send for approval"
  - false: "Publish"

On submit, run the upload pipeline. Server respects requireApproval and returns either status pending or live.

## Video detail screen (`video/[postId].tsx`)

Top to bottom, no scroll on main view:

1. **Top half (50% of screen)**: 9:16 video player via expo-video. Tap to play/pause. Controls hide after 2s idle. Volume toggle.
2. **Status row**: status badge + admin note (one line, ellipsis, tap to expand).
3. **Stats grid (2x2)**: Views / Clicks / Watch-through rate (%) / Avg watch time (s). Numbers in Sora 700, labels in mono caption.
4. **Meta**: title, description, tag chips, CTA preview (visual only).
5. **Footer**: "Posted on {date}" + overflow menu (delete, share, copy link).

Swipe left/right between own posts in chronological order via react-native-pager-view. Video pauses when off-screen.

## Settings

Settings is a stack with sub-screens.

### Index

| Row | Action |
|-----|--------|
| Theme | System / Light / Dark - persisted in themeStore |
| Language | Opens settings/language.tsx |
| Notifications | Toggle. First toggle-on triggers OS permission prompt + push token registration (FULL mode) or just persists locally (SCAFFOLD). |
| Cellular uploads | Toggle "Warn before uploading on cellular" (default on) |
| Privacy Policy | Opens settings/legal.tsx with EXPO_PUBLIC_PRIVACY_URL in WebView |
| Terms of Service | Opens settings/legal.tsx with EXPO_PUBLIC_TERMS_URL in WebView |
| Help and support | mailto link to EXPO_PUBLIC_SUPPORT_EMAIL |
| About | App version, build number. No parent brand mentioned. |
| Delete account | Opens settings/delete-account.tsx (destructive) |
| Sign out | Bottom of list, destructive |

### Language sub-screen
List of available languages with active checkmarked. Tapping calls `i18n.changeLanguage(code)`, persists to languageStore, triggers soft re-render. Immediate, no app restart.

### Delete account sub-screen
Centered warning icon, heading "Delete your account", body explaining cascade behavior. Two buttons:
- Secondary "Cancel"
- Destructive "Delete my account"

On confirm: type "DELETE" into a confirm input, then DELETE `/v1/identity/me`. On 200, clear all stores, sign out, route to welcome with toast: "Your account has been deleted."

### Legal WebView
Generic WebView screen with top close button. Loads either privacy or terms URL passed as route param.
