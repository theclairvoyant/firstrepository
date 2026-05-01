# Enterprise Creator - Project Context

This file is loaded by Claude Code at the start of every session. Read it first, every time.

## What this project is

A cross-platform mobile app (Expo / React Native) for internal creators of enterprise companies. They sign in, switch between workspaces of the companies they belong to, and upload short vertical videos for admin approval. The entire UI is built in this project. All data lives behind a REST API documented in `docs/06-api-contracts.md`.

## Operating mode

operatingMode: SCAFFOLD

In SCAFFOLD mode:
- All API calls hit `lib/api/mocks/*.ts` regardless of `EXPO_PUBLIC_MOCK_API` value
- Video upload is stubbed (3-second timer, returns fake mediaKey)
- SSO buttons exist but show "SSO setup pending" toast
- Sentry, push notifications, and real SSO are not wired
- i18n is scaffolded but only English has real strings

To switch to FULL mode, change `operatingMode: SCAFFOLD` to `operatingMode: FULL` above. The next session will implement the previously stubbed pieces.

## Hard rules - non-negotiable

These rules apply to every line of code, comment, string, and documentation in this project:

1. **No em dashes or en dashes anywhere**. Hyphens only. Code comments, strings, variable names, log messages, JSDoc - everywhere. The pre-commit hook will reject any file containing the characters `—` or `–`.
2. **The string "Blinklink" or any other parent brand name must never appear in user-visible code**. Settings, About screen, errors, splash, notifications. Internal package names, technical comments, and the `package.json` author field are fine. The pre-commit hook will flag any user-visible occurrences.
3. **App name everywhere user-facing is "Enterprise Creator"**.
4. **No emoji icons in UI**. `lucide-react-native` only.
5. **Light + dark mode parity**: every screen must render correctly in both. No drop shadows on cards in dark mode.
6. **Hyphen-only also applies to HTML entities** - never use `&mdash;`, `&ndash;`, `—`, or `–`.
7. **RTL layout is explicitly disabled**. `I18nManager.allowRTL(false)` and `forceRTL(false)` at boot. Arabic locale renders inside LTR layout.
8. **Uploaded video must reach the upload endpoint as H.264 MP4, 720p or below**. See `docs/05-video-pipeline.md`.

## Project structure

```
app/                  - Expo Router file-based routes
components/           - shared UI components
lib/
  api/                - axios client, mocks, typed endpoint wrappers
  store/              - Zustand stores
  theme/              - design tokens, light/dark, useTheme
  video/              - upload pipeline (real and stub)
  i18n/               - i18next setup
  notifications/      - push token registration (stubbed in SCAFFOLD)
  deeplinks/          - URL parsing and routing
  monitoring/         - Sentry (stubbed in SCAFFOLD)
  utils/              - format, validators
locales/              - i18n JSON files (en, ar, hi, ml)
docs/                 - the full spec, organized by topic
.claude/
  agents/             - subagent definitions
  commands/           - slash commands
scripts/              - hook scripts (rule checks, etc.)
types/                - shared TypeScript types
```

## Where to find spec details

Do not duplicate spec content in code or comments. Refer to:

- `docs/00-rules-and-mode.md` - hard rules and operating mode reference
- `docs/01-design-system.md` - tokens, typography, components
- `docs/02-identity-and-onboarding.md` - identity model, auth flows
- `docs/03-app-shell.md` - tab bar, top bar, tenant switcher, drawer
- `docs/04-screens.md` - profile, upload composer, video detail, settings
- `docs/05-video-pipeline.md` - the failure-prone part
- `docs/06-api-contracts.md` - all 32 endpoints, error codes, headers
- `docs/07-platform-infrastructure.md` - i18n, deep links, push, Sentry

## Subagents available

Defined in `.claude/agents/`. Use them for their specialty rather than doing everything in the main thread:

- `design-engineer` - design tokens, themed components, visual polish
- `screen-builder` - building full screens against the spec
- `api-integrator` - API client, mocks, types
- `video-specialist` - the upload pipeline (high context cost; use only when needed)
- `qa-reviewer` - reviews diffs for rule violations and design system compliance

## Slash commands available

Defined in `.claude/commands/`:

- `/check-rules` - greps codebase for forbidden patterns (em dashes, "blinklink" in user-visible code, emoji)
- `/review` - invokes qa-reviewer on the latest changes
- `/build-screen <name>` - invokes screen-builder for a specific screen with the right context preloaded

## Tech stack

Always use:
- Expo SDK (latest stable), Expo Router for navigation
- TypeScript strict mode
- TanStack Query for server state, Zustand for client state
- react-hook-form + zod for forms
- axios with interceptors for HTTP
- expo-secure-store for tokens, AsyncStorage for prefs
- expo-camera, expo-image-picker, expo-video, expo-video-thumbnails, expo-file-system
- i18next + react-i18next + expo-localization
- @sentry/react-native (stubbed in SCAFFOLD)
- expo-notifications (stubbed in SCAFFOLD)
- lucide-react-native for icons
- react-native-reanimated v3, gesture handler
- @shopify/flash-list for grids and feeds
- expo-image for caching
- @react-native-community/netinfo for cellular detection
- react-native-webview for legal screens
- Sora, Outfit, JetBrains Mono via expo-google-fonts

Never use:
- `expo-av` (deprecated, use `expo-video`)
- AsyncStorage for tokens (use `expo-secure-store`)
- localStorage / sessionStorage (RN doesn't have them)
- Emoji icons (use lucide)

## Definition of done for any change

- TypeScript compiles with no new errors (`npx tsc --noEmit`)
- `/check-rules` passes
- Light and dark mode both look correct on the screen you changed
- No console.error, console.warn, or unhandled promise rejections introduced
- If you added a screen, it appears in the navigation flow it belongs to
- If you touched API code, the mocks still work end-to-end
