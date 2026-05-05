# Admin Console - Requirements v1

A 2-page brief for the designer building the admin operating console for the Enterprise Creator platform. The admin console is a separate web product from the mobile creator app; it is what brand admins use to bring creators in, set policy, moderate content, and track performance.

---

## Context

The mobile app (already built) is what an internal creator uses to record / pick a vertical video, fill out metadata, and submit to a workspace. Each workspace belongs to one brand. A workspace has a type (skills / social / partner) and a set of capabilities the admin controls.

**The admin is the workspace owner.** They invite creators, approve or reject submitted videos, set the workspace's tag and CTA policy, configure approval rules, and watch performance. A single brand admin may operate several workspaces (e.g. Acme Inc. running both `Global Learning` and `Brand Social`).

**Scale targets that drive every screen:**
- A workspace can hold tens of thousands of creators. Lists must paginate, filter, search, and bulk-act.
- A workspace can receive hundreds of pending submissions per day. Moderation cannot be a one-by-one click flow; bulk approve / reject is required.
- Workspaces are multi-tenant. The admin always operates on one workspace at a time, with a switcher in the top bar matching the mobile pattern.

---

## Page-by-page feature areas

### 1. Creator onboarding (the volume mover)
Designer should treat this as the **single most important** flow because it gates every downstream feature.

Must support:
- **Single invite** by email - generates a one-time invite code; admin sees the code, copy button, optional Slack / email send.
- **Bulk invite** by CSV upload - columns: `email`, `firstName`, `lastName`, optional `workspaceUsername`. UI shows row-by-row validation (duplicates, malformed emails, already-member) before commit. After commit, a job tracker with progress.
- **Bulk invite** by domain auto-provision - admin pastes a domain (`@acme.com`); every existing or future user with that work email is auto-added to the workspace as `pending_invite` until they accept on the mobile app.
- **Invite link** - a single share link that any company-domain user can redeem (still gated by domain match).
- **Pending list** - filterable: invited, requested, expired. Bulk resend, bulk revoke.

Acceptance:
- An admin can invite 1,000 creators in under 60 seconds via CSV.
- The admin sees the same invite code the creator types into the mobile app's invite-code screen.
- Domain auto-provision is reversible (toggling it off does not retroactively remove members, only stops new ones).

### 2. Creator directory
A searchable, filterable table of every creator in the workspace.

Must support:
- Columns: avatar, full name, workspace username, status (active, pending_invite, pending_request, suspended), posts count, total views, total clicks, last active.
- Filters: status, posts range, joined date range.
- Search: name, username, email.
- Row click opens a creator detail panel: their workspace profile (read-only mirror of what the mobile app shows), their global Enterprise Creator identity (read-only - the admin cannot edit a creator's global identity), their recent submissions, audit log.
- Bulk actions: suspend, unsuspend, remove from workspace, send notification, change tag-availability scope (per-creator override).

Acceptance:
- An admin can find a specific creator by username in under 3 seconds with type-ahead.
- The directory loads the first page in under 500 ms even at 50,000 rows.

### 3. Workspace settings and policy
The admin's control panel for what the mobile app's composer can and cannot do.

Must support, per workspace:
- **Auto-approval toggle.** When on, every submission goes straight to `live` without admin review. When off, submissions land in the moderation queue as `pending`. (This is the spec's `requireApproval` capability inverted for clarity.)
- **Tag policy.** Two options:
  1. *Admin-managed*: only the admin defines the tag categories and tags; creators cannot create new ones. They pick from the list. (This is the current `creatorTagsEnabled: true` behavior.)
  2. *Off*: tags section is hidden in the mobile composer entirely. (`creatorTagsEnabled: false`.)
- **CTA policy.** Same shape:
  1. *Admin-managed list*: admin defines the allowed CTAs. Creators pick. Static CTAs lock the URL; dynamic CTAs let the creator paste a URL.
  2. *Off*: CTA section hidden in the composer.
- **Upload limits.** Max video duration (seconds), max file size (MB), required aspect ratio (9:16 only for v1).
- **Join policy.** Open / request / invite_only.
- **Brand identity.** Brand name, logo, primary color, banner image (the cover that shows on every creator's profile in this workspace).

Acceptance:
- A change to any setting takes effect on the next mobile composer open within 30 seconds (cache invalidation).
- The admin can preview what the mobile composer looks like with the current settings without leaving the page.

### 4. Content moderation queue
The bread-and-butter screen for any workspace that is not auto-approve.

Must support:
- A queue of `pending` submissions in chronological order, with thumbnail, title, creator, length, submitted-at.
- Inline video preview on hover or row expand - no need to open a new page to review.
- One-click **Approve** (sets status to `live` and triggers a creator notification) and **Reject** (requires a typed reason, attached to the submission as `adminNote` and shown to the creator on the mobile app's video detail screen).
- **Request edits** (sets status to `needs_edits`, also requires a note).
- **Bulk approve / reject** when nothing in the selected batch needs an explanation.
- A separate **Review history** tab for already-decided submissions, filterable by status and date.

Acceptance:
- An admin can clear a queue of 50 submissions in under 5 minutes when most are clear approves.
- Rejection notes are mandatory; the UI does not let an empty rejection through.

### 5. Notifications and comms
The admin's broadcast channel.

Must support:
- Per-creator: send a one-off notification (templated: "Your post is approved", "Edits requested", or free text with a 280-char limit).
- Workspace-wide announcement: visible as a pinned banner on every creator's mobile profile until dismissed; optional push notification.
- System triggers (auto-sent, no admin action): `post_approved`, `post_rejected`, `post_went_live`, `edits_requested`, `invite_received`, `request_approved`. Admin can toggle each on or off.
- Notification audit log: who sent what, when, to whom.

Acceptance:
- A workspace announcement reaches all active members within 30 seconds.
- The audit log is exportable as CSV for compliance.

### 6. Analytics
Top-level workspace performance, plus per-creator drill-in.

Must support:
- **Workspace dashboard:** total active creators, posts published this period, total views, total click-throughs, average watch-through rate, top tags, top CTAs by click-through.
- **Per-creator drill-in:** the same metrics scoped to a single creator, plus a list of their posts ranked by views.
- **Per-post drill-in:** views, clicks, watch-through curve, geographic breakdown, device breakdown.
- Time range selector (7d / 30d / 90d / custom).
- CSV export on every table.

Acceptance:
- All numbers tie to the mobile app's per-post stats screen exactly.

---

## Top bar and global chrome (matches the mobile app)

- **Workspace switcher** on the left: brand mark + brand name + workspace name + type badge + chevron. Opens a modal with all workspaces the admin manages.
- **Global notifications bell** (admin-side: invites awaiting acceptance, escalations, scheduled exports completed).
- **Admin profile circle** on the right: opens a drawer with admin identity, switch brand admin between brands they belong to (rare but possible), settings, sign out.
- **Persistent on every page.**

---

## Out of scope for v1

These are intentionally not in this brief. Flag them as separate phases:

- Org-level admin (managing multiple brand admins, billing, plan tier).
- Custom workspace types beyond skills / social / partner.
- A/B testing of CTA variants.
- Programmatic API access for admins (OAuth app management).
- Translation management for tag and CTA copy beyond English.

---

## Designer deliverables

For each of the 6 feature areas above:
1. One desktop frame at 1440 width.
2. One empty-state frame.
3. One bulk-action loaded state (where applicable).
4. Component spec: any new patterns this introduces (data table, inline video preview, CSV uploader, ...).

Deliverable target: full set in Figma, ready for engineering review, in 2 weeks.

Tone: restrained, typographically precise, accent-driven - matches the mobile app's design system already documented in `docs/01-design-system.md`. Reuse the same brand accents (indigo primary, orange skills, purple social, teal partner) so an admin and a creator looking at the same workspace see consistent identity.
