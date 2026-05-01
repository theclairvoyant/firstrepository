# Enterprise Creator

Mobile app for internal creators of enterprise companies. Built with Expo / React Native.

## Quick start

```bash
npm install
npx expo start
```

Press `i` for iOS simulator, `a` for Android emulator, or scan the QR code with Expo Go.

## Operating mode

Currently running in **SCAFFOLD** mode (mocked APIs, stubbed video upload, English-only translations). To switch to FULL mode, edit `CLAUDE.md` and change `operatingMode: SCAFFOLD` to `operatingMode: FULL`.

## Project structure

See `CLAUDE.md` for the full layout and rules.

## Spec

The full product spec lives in `docs/`. Start with `docs/00-rules-and-mode.md`.

## Hard rules

- Hyphens only. No em dashes or en dashes anywhere.
- No "Blinklink" in user-visible code.
- No emoji.
- Light + dark mode parity.

## Useful commands

- `/check-rules` - greps codebase for forbidden patterns
- `/review` - invokes qa-reviewer subagent
- `/build-screen <name>` - invokes screen-builder subagent
