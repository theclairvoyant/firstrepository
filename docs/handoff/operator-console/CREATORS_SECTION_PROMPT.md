# Operator console: Creators section

Drop this whole document into a fresh Claude chat and paste the operator console screenshots alongside it. The agent will produce wireframes / HTML / React for a new "Creators" section that lets admins onboard, browse, and govern thousands of internal creators on the Enterprise Creator mobile app.

---

## What you are doing

I am extending an existing operator console that admins use to govern a media platform (screenshots attached). I just shipped a companion mobile app called **Enterprise Creator** - internal creators of customer brands sign in, switch between workspaces, and upload short vertical videos for admin approval. The console already handles content moderation (the Uploads view in the screenshots). I need ONE more section added to the left sidebar: **Creators**.

Goal: launch the app and manage thousands of creators end to end. Onboarding, identity, status lifecycle, per-creator detail. Content moderation already exists - do not duplicate it.

---

## Study the existing console first

Before designing anything new, read the screenshots:

1. **Sidebar layout**: dark purple gradient, workspace context block at top ("rider-training / Skills Workspace"), section list (Conversions, Uploads, Feeds, Assets, Courses, Users, Experience, Answers), then a separated "Analytics" header with sub-items (Engagement, Distribution, Skills). User profile card pinned to bottom-left.
2. **Top bar**: page title on the left (e.g. "Upload and Moderate Content"), tab strip when relevant (Approve / Revision / Reported), then "Invite" button + workspace switcher pill on the right.
3. **List screens** (Uploads grid, Users table, Courses table): search bar + secondary action + primary gradient button right-aligned at the top, then a grid or table of rows, then bottom-right pagination.
4. **Right side panels**: slide in from the right with their own header + close X. Used for picker-style or short interactions (the "Upload" panel with Upload Content / Upload in Bulk / Custom Source / Enterprise Studio cards).
5. **Detail screens** (Single Asset Upload): two-column layout. Left has form panels stacked, right is a sticky preview pane. Back arrow + page title in the top bar.
6. **Modals** (Business Groups): centered overlay with a dim backdrop. Tabs at the top, search + filter chips below, sectioned content with kebab menus per row.
7. **Pills and badges**: status pills (Created, Active, Suspended, Deleted) with semantic color, license type pills with brand colors (Workplace orange, Workplace Learning blue, Sales green, Publisher light blue, Commerce gray, Learning purple), inherited / mine pills on group cards.
8. **Buttons**: primary is a purple-to-pink gradient with white text. Secondary is outlined or ghost. Destructive uses red text in kebab menus ("Remove").

Match this visual language exactly. Reuse the same sidebar, same top bar shape, same pill / table / right-panel / modal patterns.

---

## What the Enterprise Creator mobile app looks like (the data the console governs)

### Core entities

```
Creator (global identity, one per real person)
  id, firstName, lastName, globalUsername, email, emailVerified,
  phone?, phoneVerified, avatarUrl, createdAt

Workspace (one per customer team / brand)
  id, type ('skills' | 'social' | 'partner'),
  name, handle (e.g. 'pinecrest-sales'),
  brand: { id, name, logoUrl, primaryColor },
  capabilities: {
    creatorTagsEnabled, requireApproval, maxVideoSeconds,
    maxFileSizeMB, requiredAspectRatio, allowedCtas[],
    creatorJoinPolicy ('invite_only' | 'open' | 'request')
  },
  supportEmail (REQUIRED - shown to revoked creators as their only contact)

Membership (links a creator to a workspace, one per creator/workspace pair)
  membershipId, creatorId, workspaceId,
  status ('active' | 'pending_invite' | 'pending_request' | 'revoked'),
  workspaceUsername, displayName?, workspaceAvatarUrl, bannerUrl?, bio,
  postCount, totalViews, totalClicks, totalLikes,
  joinedAt, invitedAt?, invitedBy?

Post (a video uploaded by a creator into a workspace)
  id, workspaceId, creatorId,
  status ('pending' | 'approved' | 'live' | 'rejected' | 'needs_edits'),
  title, description, tagIds[], cta, ctaUrl?,
  mediaUrl, thumbnailUrl, durationSeconds,
  createdAt, approvedAt?, publishedAt?,
  stats { views, clicks, watchThroughRate, avgWatchSeconds, likes, dislikes, shares },
  fileSizeBytes, mediaWidth, mediaHeight, adminNote?

Invite (8-char alphanumeric code, lets a new creator join)
  code, workspaceId, role, createdBy, expiresAt, redeemedBy?, redeemedAt?
```

### Key flows that the console must support

- **Single invite**: admin enters one email, picks a workspace + role, system mints an invite code and emails it.
- **Bulk invite**: admin uploads a CSV of emails, system mints one invite per row, sends them.
- **Domain auto-provision**: any email matching a configured domain (e.g. `*@pinecrest.com`) is auto-added to a specific workspace on first sign-in. Admin manages the domain allowlist per workspace.
- **Shareable invite link**: a single deep link (`enterprisecreator://invite/{code}`) any creator can open to join, scoped per workspace, can have a max-uses cap and an expiry.
- **Revoke a creator**: flips their membership status to `revoked`. The mobile app then shows them a deactivated screen with only an "Email workspace support" button targeting the workspace's `supportEmail`.
- **Re-invite a revoked creator**: a re-invite resets status to `pending_invite` with a fresh code.
- **Force-update a creator's display name** (e.g. during corporate rebrands): per-membership PATCH.
- **View a creator's posts**: see what they've published in this workspace, status of each, engagement stats.

---

## What to build

A new section in the sidebar called **Creators**, formatted like the existing "Analytics" section: a section header with sub-items beneath it. Sub-tabs:

1. **Directory**
2. **Invites**
3. **Policy**

Place it directly above the "Analytics" header (so the sidebar reads ... Answers / Creators (Directory, Invites, Policy) / Analytics (...)). Use a `Users`-style icon for the section header.

---

### Tab 1: Directory

The all-creators table for the current workspace. Top of every admin's day: "who's in this workspace and what's their status?"

**Page header**: "Manage Creators"
**Top bar**: Search box "Search 1,200 creators" (count is dynamic), filter chips row, then "Export CSV" outlined button + "+ Invite" gradient button.

**Filter chips** (inline, dismissible):
- Status: All / Active / Pending Invite / Pending Request / Revoked
- Joined: All time / Last 7d / Last 30d / Last 90d
- Activity: All / Posted in last 30d / Inactive 30d+ / Never posted
- Sort: Last active / Joined date / Post count / Total views

**Table columns**:
| Creator | Workspace handle | Status | Posts | Total views | Joined | Last active | (kebab) |

- Creator cell: avatar + display name + `@workspaceUsername` in mono muted underneath
- Workspace handle: the creator's workspaceUsername (since this is workspace-scoped)
- Status: pill (Active green, Pending invite blue, Pending request amber, Revoked red)
- Posts: number with a tiny breakdown tooltip (X live, Y in review, Z rejected)
- Total views: comma-formatted number
- Joined: relative date (e.g. "2 weeks ago"), full date on hover
- Last active: relative date
- Kebab menu: View profile / Send message / Resend invite (if pending) / Revoke access (if active) / Re-invite (if revoked) / Remove (with confirm)

**Row click**: opens a right-side **Creator Detail panel** (slides in, dim background optional). Panel shows:

- Sticky header: avatar (large), display name, `@workspaceUsername`, status pill, kebab menu
- Tab strip: Overview / Posts / Activity
- Overview tab: Profile facts (email + verified badge, phone if present, joined date, invited by, last active), per-workspace stats card (postCount / totalViews / totalLikes), bio block, "Banner" thumbnail
- Posts tab: scrollable list of their posts in this workspace, each row showing thumbnail + title + status pill + view count + relative date, click-through to the existing content moderation surface
- Activity tab: chronological log of admin actions affecting this creator (invited by X on date, activated, role changed, revoked by X on date with note, etc.)

**Empty state**: "No creators yet. Send your first invite to get started." with the same `+ Invite` gradient CTA.

---

### Tab 2: Invites

The onboarding control surface. Three sub-modes via a top tab strip: **Pending** / **Sent** / **Settings**.

**Top bar**: "Invite creators to {workspace}" page title. Right side: "Bulk invite (CSV)" outlined button + "+ New invite" gradient button.

**Pending tab** (default): shows all unredeemed invites.

| Invitee | Code | Role | Sent by | Sent | Expires | (kebab) |

- Invitee: email address (no creator yet)
- Code: monospaced 8-char (e.g. `ABCD2345`) with a small copy icon
- Role: pill (Creator, Editor, etc. - whatever admin roles exist)
- Sent by: admin name + avatar
- Sent: relative date
- Expires: relative date with red tint if < 24h
- Kebab: Copy code / Copy invite link / Resend / Revoke invite

**Sent tab**: shows redeemed invites (joined creators with a join-via-invite trail). Same shape but with "Joined" column instead of Expires.

**Settings tab**: per-workspace onboarding configuration (long form):

1. **Single invite** quick form (top): Email field + Role select + Expires-in select + "Send" gradient button. This is the fast path.

2. **Bulk invite (CSV)** card: drag-and-drop zone, CSV template download link, sample rows shown ("email,role,first_name,last_name"), "Process" button. Shows progress (parsing / sending / done) and a per-row results table.

3. **Domain auto-provision** card: list of domains that auto-grant access to this workspace. Each row: domain (e.g. `pinecrest.com`), assigned role, added by, date. Plus + Add domain button that opens a modal (domain text + role picker + confirmation that the admin owns the domain). Toggle to enable/disable the entire auto-provision feature for this workspace.

4. **Shareable invite link** card: shows the current public link (`enterprisecreator://invite/{code}`) with copy button. Configuration: max uses (number or unlimited), expiry, role granted to redeemers, enabled toggle. Regenerate button (which invalidates the old link).

5. **Default invite policy** card: default role for new invites, default expiry (24h / 7d / 30d / never), email template preview.

---

### Tab 3: Policy

Per-workspace creator policy settings. One scrollable form.

**Page header**: "Workspace creator policy"

Sections (each a card matching the Single Asset Upload form pattern):

1. **Workspace identity**
   - Workspace name (read-only or editable depending on admin role)
   - Handle (read-only)
   - Brand name + brand logo (uploader)
   - Brand primary color (color picker)
   - Workspace type pill (skills / social / partner) - read-only

2. **Creator support contact** (NEW - critical, populates the revoked-state mailto in the mobile app)
   - `supportEmail` field with validation (must be a real email)
   - Helper text: "Shown to creators when their access is revoked. The only way they can reach this workspace after revocation."

3. **Creator content rules**
   - Require admin approval before content goes live (toggle)
   - Max video length in seconds (slider 15-180, default 60)
   - Max file size in MB (slider 50-500, default 200)
   - Required aspect ratio (radio: 9:16 / 1:1 / both)
   - Allowed CTAs (multi-select picker; opens a sub-modal listing the workspace's CTA templates)
   - Tagging enabled by creators (toggle)

4. **How creators join**
   - Join policy (radio: Invite only / Open / Request and approve)
   - If "Open": warning banner about the implications
   - If "Request and approve": notification preference (every request / daily digest)

5. **Engagement caps** (optional, nice-to-have)
   - Max creators in this workspace (number with "no limit" toggle)
   - Max active uploads per creator per week (slider)

6. **Danger zone** (red border)
   - Pause uploads (toggle, with confirmation)
   - Archive workspace (button, opens a multi-step confirmation modal)

Form has a sticky footer with "Discard changes" ghost + "Save changes" gradient button. Disabled until something changes.

---

## Cross-cutting components and behaviors

- **Invite creation modal** (used in multiple places): centered modal with email field, role picker, workspace picker (if admin manages multiple), expires-in picker, optional personal message field, "Send invite" gradient button. On success, toast + the invite appears at the top of the Invites > Pending list.

- **Confirm-revoke modal**: lists the creator, their post count, an optional reason text area (saved to the audit log), checkbox "Notify the creator via email of this change", red "Revoke access" button.

- **Bulk action bar**: when one or more rows are checked in the Directory or Invites table, a sticky footer slides up showing the selection count and bulk actions (Revoke, Resend invite, Export selected, Send message). Matches the rhythm of how the existing Courses checkboxes likely work.

- **Empty states**: every table needs one. Use a centered illustration + headline + subhead + the obvious primary CTA. Match the pattern of the existing console.

- **Loading states**: skeleton rows for tables, skeleton card for the right-side detail panel. No raw spinners.

- **Accessibility**: every interactive element needs a label. Status pills get text plus color (not color alone). Modals trap focus and close on Esc.

---

## Visual / token reference (read from the screenshots)

- **Sidebar**: deep purple gradient, ~220px wide, sub-items indented 8px, selected item has a soft purple highlight + left accent bar.
- **Main bg**: very pale lavender, almost white.
- **Cards**: white, 12-16px radius, very soft border + shadow.
- **Primary buttons**: linear-gradient(135deg, #7C3AED, #DB2777) approximately, white text, 12px radius, 36-40px height.
- **Secondary buttons**: outlined, neutral border, 12px radius, same height.
- **Pills / badges**: 999px radius, 8-12px horizontal padding, 4px vertical, semantic backgrounds at low alpha (~12-20%).
- **Tables**: 56-64px row height, hover state with a subtle bg shift, divider lines at low contrast.
- **Right side panels**: ~440px wide on desktop, full-height, white bg, 24px header padding, 20px content padding.
- **Modals**: 480-560px wide, centered, 12% black backdrop, 24px padding, close X top right.
- **Status colors**: Active green ~#10B981, Pending blue ~#3B82F6, Pending Request amber ~#F59E0B, Revoked red ~#EF4444, Suspended gray ~#6B7280, Deleted darker gray.
- **Type / fonts**: appears to be Inter or similar humanist sans. Usernames in a monospaced font at smaller size + muted color.

---

## What to deliver in your output

Pick one of these formats based on what's most useful for the console team:

**Option A** (fastest to use): high-fidelity static HTML pages, one per tab + per major modal / panel state. Inline CSS. Match the screenshots' visual language. Include a `creators-section.html` index that links to all states.

**Option B**: React component sketches with Tailwind classes, one tsx per surface. Include a small README with route map.

**Option C**: Figma-spec-style markdown wireframes with ASCII sketches + component breakdowns, suitable for the design team to implement against the existing design system.

Default to Option A unless told otherwise.

For each surface, include:
- Default state
- Empty state
- Loading state (where it matters)
- The main interactive state (panel open / modal open / row hover)

---

## Hard rules (inherited from the mobile app codebase)

- No em dashes or en dashes anywhere. Hyphens only.
- The brand name "Blinklink" must never appear in user-visible code.
- The mobile app is called "Enterprise Creator". Use that name when referring to it from the console.
- No emoji icons in UI (use lucide-react or similar line-icon sets).
- Light + dark mode parity if you're showing both modes; otherwise pick light to match the screenshots.

---

## Open product questions worth flagging in your output

1. Roles: the console has roles (Moderator visible bottom-left). Should creators have differentiated roles in the Enterprise Creator app (creator vs lead creator vs editor)? Today the mobile app has one creator role.
2. Can a single creator belong to multiple workspaces in the same console session, or does the admin always view through one workspace lens? (Assumption: workspace-lensed; the workspace switcher in the top bar already proves this.)
3. Does revoke also delete the creator's posts, or just hide them from the live feed? (Mobile app assumes posts persist; only the creator's access flips.)
4. Audit log retention - ship at 90 days?
5. Bulk-message channel - email, in-app banner, both?

End your output with a concrete list of these open questions plus any new ones you surface during the design.
