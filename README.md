# Enterprise Creator

Mobile app for internal creators of enterprise companies. Built with Expo / React Native.

## New here?

- **CTO / new lead**: read `docs/handoff/CTO_KT.md` first - 30-minute orientation, security posture, exact backend wiring steps.
- **Backend developer**: read `docs/handoff/README.md` and run `bash docs/handoff/BACKEND_SMOKE_TESTS.sh` against staging.
- **Anyone touching the code**: read `CLAUDE.md` for hard rules and `docs/handoff/FLOW_AUDIT.md` for an inventory of every flow.

## Quick start

```bash
npm install
npx expo start
```

Press `i` for iOS simulator, `a` for Android emulator, or scan the QR code with Expo Go.

In SCAFFOLD mode (the default), log in with any email and OTP `123456`. No backend required.

## Operating mode

Defaults to **SCAFFOLD** - mocked APIs, stubbed video upload, English fully translated. To run against the real backend, set `EXPO_PUBLIC_MOCK_API=false` and `EXPO_PUBLIC_API_BASE_URL` in your env (see `.env.example`).

## Project structure

See `CLAUDE.md` for the full layout and rules. See `docs/handoff/CTO_KT.md` §5 for the architecture pillars.

## Spec

The full product spec lives in `docs/`. Start with `docs/00-rules-and-mode.md`.

## Hard rules

- Hyphens only. No em dashes or en dashes anywhere.
- No "Blinklink" in user-visible code.
- No emoji icons (lucide-react-native only).
- Light + dark mode parity, every screen.
- RTL is explicitly disabled (Arabic renders inside LTR layout).

The pre-commit hook in `scripts/check-file-rules.sh` enforces these.

## Useful commands

- `/check-rules` - greps codebase for forbidden patterns
- `/review` - invokes qa-reviewer subagent
- `/build-screen <name>` - invokes screen-builder subagent
- `bash docs/handoff/BACKEND_SMOKE_TESTS.sh` - run against staging to verify backend parity
