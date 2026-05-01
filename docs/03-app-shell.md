# App Shell

## Top bar - persistent on every tab screen

Layout, left to right:

- Tenant switcher trigger (left, takes most of width): 24px brand logo + brand name + slash + workspace name + workspace type badge + chevron-down. Tap opens tenant switcher modal.
- Global profile circle (right, 32px): shows global avatar. Tap opens global profile drawer.

If user has no workspaces, trigger reads "No workspace selected" and tapping opens switcher in "Add" mode.

## Bottom tab bar

| Tab | Icon | Action |
|-----|------|--------|
| Profile | lucide `User` | Profile inside current workspace |
| Upload | lucide `Plus` in filled circle, larger | Upload entry |

Active tab uses accent.primary. Inactive uses textMuted. Upload tab is hidden if active membership is not in `active` status.

## Tenant switcher (bottom sheet, 90% height)

1. Sticky header with close icon
2. Search input filtering by brand or workspace name
3. Active memberships list - rows of: 40px logo, brand name (heading), workspace name (body), type badge, post count (mono caption). Tap selects, closes sheet, updates tenantStore, navigates to Profile.
4. Pending list (if any) - same row layout with status pill on right ("Invite pending" or "Request pending"). Long-press shows "Cancel request".
5. "Add a workspace" button -> add-tenant.tsx

Behavior during composer: if user is in any composer screen and taps the tenant switcher, show a confirmation sheet: "Switching workspaces will discard your draft. Continue?" with destructive primary "Discard and switch" and secondary "Stay here".

## Add tenant screen

Two stacked options:
1. Enter invite code (same input as the auth invite-code flow)
2. Find by company email - calls GET `/v1/discovery/by-domain`. Lists matching workspaces with "Request invite" button each.

## Global profile drawer

Slides in 90% width from the right.

- 80px avatar, full name (title), @globalUsername (mono caption)
- Email row with verified checkmark
- "Member since {date}" caption
- Section "My workspaces" - all memberships including pending. Tap active to switch.
- Section "Account" - Edit profile, Settings, Sign out (destructive)

Edit profile opens an inline editor for name, username, avatar.

## App boot routing (in `app/index.tsx`)

1. If a deep link triggered launch, parse it and store intent.
2. Read JWT from secure store. If absent or unrefreshable, route to (auth)/welcome.
3. GET `/v1/identity/me`. If no creator profile, route to profile-setup.
4. Apply stored deep link intent (switch workspace, open post).
5. Resolve active workspace:
   a. If lastActiveWorkspaceId is in membership list with active status, use it.
   b. Otherwise pick first active membership.
   c. If none, navigate to (tabs)/profile in empty state.
