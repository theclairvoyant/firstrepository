# Enterprise Creator - Claude Code Build Plan

A self-contained build plan for shipping the Enterprise Creator mobile app using Claude Code on Opus 4.7. Drop this file into an empty directory, open Claude Code, and run the kickoff command at the bottom.

---

## How to use this document

You are Claude Code on Opus 4.7. Your job is to build a production-quality React Native (Expo) mobile app called Enterprise Creator. This document is your full plan.

You will execute in this order:

1. **Phase 0 - Bootstrap**: write every file listed in Section 0 of this document (CLAUDE.md, subagents in `.claude/agents/`, slash commands in `.claude/commands/`, hook scripts in `scripts/`, spec files in `docs/`, `.gitignore`, `README.md`). Each file's full content is inlined in the bootstrap drop and committed to the repo root. Write them verbatim. Do not summarize, paraphrase, or skip any.

2. **Phase 1-9 - Build**: follow the phase plan in Section 1 below. Use the subagents you wrote in Phase 0 for their specialized work. Run the `/check-rules` slash command at the end of every phase before moving to the next.

3. **Operating mode**: SCAFFOLD MODE is the default. This means mocked APIs, stubbed video upload, English-only translations, no Sentry, no real push notifications, no real SSO. The goal is a clickable end-to-end prototype that exercises every screen so the design can be reviewed and the scaffold handed off for backend wiring. The full spec is included so the platform team can complete the production wiring later. To run in FULL MODE instead, the user will edit `CLAUDE.md` and change the `operatingMode` value, and you will then implement the previously-stubbed pieces.

4. **Communication style**: at the start of each phase, post a brief plan and the agents you will use. At the end of each phase, post what was completed, what was skipped (with reasons), and any issues that need user input. Keep updates concise. No emojis. Use hyphens only - no em dashes, no en dashes, ever.

5. **When you are blocked**: if any decision is genuinely ambiguous after reading this document and the spec files, stop and ask the user a single specific question with 2-4 named options. Do not invent answers to substantive product questions. Do not stop for trivial decisions; default to the choice in the spec.

6. **When you encounter platform issues**: real device or simulator issues are the user's responsibility to surface. You can run `expo start` once at the end and report the URL, but do not block on getting the simulator working from inside the agent. Document any device-specific testing the user should do.

When you have read this entire document and Phase 0 is complete, post a message: `Bootstrap complete. Ready to start Phase 1. Type "go" to proceed, or "go --full-mode" to switch to full production mode.`

---

## Section 0 - Bootstrap files

Bootstrap files are written verbatim to the repo root during Phase 0. The full content is committed in this same drop. Files written:

- `CLAUDE.md`
- `.claude/agents/design-engineer.md`
- `.claude/agents/screen-builder.md`
- `.claude/agents/api-integrator.md`
- `.claude/agents/video-specialist.md`
- `.claude/agents/qa-reviewer.md`
- `.claude/commands/check-rules.md`
- `.claude/commands/review.md`
- `.claude/commands/build-screen.md`
- `.claude/settings.json`
- `scripts/check-file-rules.sh`
- `docs/00-rules-and-mode.md`
- `docs/01-design-system.md`
- `docs/02-identity-and-onboarding.md`
- `docs/03-app-shell.md`
- `docs/04-screens.md`
- `docs/05-video-pipeline.md`
- `docs/06-api-contracts.md`
- `docs/07-platform-infrastructure.md`
- `README.md`
- `.gitignore`
- `locales/en.json`
- `locales/ar.json`
- `locales/hi.json`
- `locales/es.json`
- `locales/fr.json`

---

## Section 1 - Phase plan

After Phase 0 completes (all bootstrap files written), the user will type "go" to start the build. Execute these phases in order. Run `/check-rules` at the end of every phase before moving to the next.

### Phase 1 - Project initialization

1. Run `npx create-expo-app@latest . --template blank-typescript` (or the equivalent for the latest Expo SDK).
2. Install Expo Router and configure it as the app entry point.
3. Install all dependencies listed in `CLAUDE.md` Tech Stack section.
4. Create the folder structure listed in `CLAUDE.md`.
5. Configure `app.json` with `scheme: "enterprisecreator"`, bundle ids `com.enterprisecreator.app`, permission strings, and the splash screen.
6. Initialize git, make the first commit "Phase 1: project init".
7. Run `npx tsc --noEmit` to verify TypeScript is happy.
8. Run `/check-rules`.

### Phase 2 - Foundation (parallel)

Use the Task tool to invoke two subagents in parallel:

- `design-engineer`: build `lib/theme/` (tokens, light, dark, useTheme, ThemeProvider) and the base components (PrimaryButton, SecondaryButton, GhostButton, DestructiveButton, ThemedText, ThemedView, Card, Avatar, Input, OTPInput, StatusBadge, WorkspaceTypeBadge, EmptyState, Toast). Create `app/_design-preview.tsx` rendering each component in both modes.
- `api-integrator`: build `types/api.ts`, `lib/api/client.ts` with interceptors, all 8 wrapper modules, and the mock implementations in `lib/api/mocks/`. Build the seed data file. Build TanStack Query hooks for the common fetches.

When both finish, also build:
- `lib/store/` - all stores (authStore, tenantStore, draftStore, themeStore, languageStore, uploadStore)
- `lib/i18n/` - i18next setup, locale detection
- `lib/deeplinks/parser.ts`
- `lib/notifications/register.ts` (stub in SCAFFOLD)
- `lib/monitoring/sentry.ts` (commented out in SCAFFOLD)

Run `/check-rules` at end of phase.

### Phase 3 - Auth flow

Use `screen-builder` for each, in order: welcome, method, email, otp, invite-code, profile-setup. The `(auth)` group layout sets the back-button behavior and disables the tab bar.

Wire SSO buttons to show "SSO setup pending" toast in SCAFFOLD mode.

End of phase: a user can email-OTP through to profile setup using mocks, and an invite code redemption end-to-end. Run `/check-rules`.

### Phase 4 - App shell

Use `screen-builder`:
- `(tabs)/_layout.tsx` with the persistent top bar (TopBar component) and bottom tab bar
- `tenant-switcher.tsx` modal sheet
- `add-tenant.tsx` screen
- `global-profile.tsx` drawer

Wire the deep link parser to the boot routing logic in `app/index.tsx`.

End of phase: a user can switch workspaces via the modal, request an invite via add-tenant, and open the global profile drawer. Run `/check-rules`.

### Phase 5 - Profile and Upload tab

Use `screen-builder`:
- `(tabs)/profile.tsx` with header card, status banner (when applicable), posts grid, empty state, upload status banner
- `(tabs)/upload.tsx` with the two pick options
- `composer/edit.tsx` with the three collapsible sections (title, tags, CTA)
- `composer/preview.tsx`
- TagSection component (Airtable-style)
- CTAPicker component

Run `/check-rules`.

### Phase 6 - Video pipeline (SCAFFOLD)

Use `video-specialist`:
- `lib/video/pickFromGallery.ts`
- `lib/video/recordWithCamera.ts`
- `lib/video/validateMedia.ts`
- `lib/video/uploader.ts` (3s simulated stub)
- `composer/record.tsx` (in-app camera screen)
- `lib/store/uploadStore.ts` integration with the composer flow
- CellularWarningSheet component
- UploadProgressBanner component on the Profile screen

End of phase: pick -> validate -> fake upload -> post creation via mocks -> tile appears on Profile. Run `/check-rules`.

### Phase 7 - Video detail and Settings

Use `screen-builder`:
- `video/[postId].tsx` with player, status, stats, meta, footer, swipe between own posts
- `settings/index.tsx`, `settings/language.tsx`, `settings/delete-account.tsx`, `settings/legal.tsx`

Run `/check-rules`.

### Phase 8 - Mock data polish and i18n

- Verify `lib/api/mocks/__seed.ts` covers every UI state
- Verify every user-visible string has an i18n key in `locales/en.json`
- Add a few sample translations to `es.json`, `fr.json`, `hi.json`, `ar.json` to prove the language switcher works (e.g., the welcome screen and Settings labels)

Run `/check-rules`.

### Phase 9 - QA and acceptance

1. Invoke `qa-reviewer` on the full codebase.
2. Fix every FAIL-level finding.
3. Re-run `qa-reviewer`. Iterate until PASS or PASS_WITH_WARNINGS.
4. Verify the acceptance checklist below in writing.
5. Generate a `HANDOFF.md` document for the backend team:
   - Project status
   - List of API contracts to wire (point to `docs/06-api-contracts.md`)
   - Locations of every SCAFFOLD stub that needs replacement (`lib/api/mocks/`, `lib/video/uploader.ts`, `lib/notifications/register.ts`, `lib/monitoring/sentry.ts`)
   - List of decisions still needed from Firoz
   - Apple Sign In setup steps
   - EAS Project ID setup steps
6. Make a final git commit with message "Phase 9: scaffold complete, handoff ready".

---

## Acceptance checklist

The build is complete in SCAFFOLD mode when:

1. New user can complete email + OTP flow with mocked OTP "123456", set up profile, redeem invite code, switch to that workspace, "upload" a 9:16 video (validated locally, simulated upload), fill metadata, see post appear with status pending in the grid.
2. User in SCAFFOLD lands with auto-provisioned workspaces visible in tenant switcher.
3. Persistent top bar with tenant switcher and global profile circle on every tab screen.
4. Light and dark mode both render correctly on every screen. System default followed.
5. In-app camera respects maxVideoSeconds from active workspace capability.
6. Pipeline edge cases pass: cancel mid-upload, force-quit recovery, two queued uploads sequential, cellular warning over 25MB, switch workspaces during composer.
7. User with pending_invite or pending_request membership sees correct banner, Upload tab hidden.
8. Tapping a tile opens detail view with stats. Swipe between own posts works.
9. Word "Blinklink" or any parent brand name does not appear anywhere user-visible.
10. No em dashes or en dashes anywhere in code or strings. `/check-rules` passes.
11. Language switcher in Settings switches UI language live.
12. RTL never engages. Layout stays LTR even with Arabic.
13. Account deletion flow requires typing "DELETE", calls mocked endpoint, clears local state.
14. Cellular upload over 25MB shows warning sheet.
15. App handles 401 by silently refreshing once via mock.
16. Deep link `enterprisecreator://w/{id}` routes correctly.
17. Push permission never requested at app start.
18. App builds and runs in iOS simulator and Android emulator (or via Expo Go).
19. With `MOCK_API=true` (the default), every screen and flow works end-to-end.
20. `qa-reviewer` returns PASS or PASS_WITH_WARNINGS.

---

## Kickoff command

After saving this file as `BUILD.md` in an empty directory, open Claude Code and paste:

```
Read BUILD.md and execute Phase 0 - bootstrap. Write every file listed in Section 0 verbatim. When you are done, post the message specified at the end of "How to use this document" and wait for me to type "go".
```

End of plan.
