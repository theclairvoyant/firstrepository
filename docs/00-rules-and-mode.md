# Rules and Operating Mode

## Hard rules - apply to every file

1. Hyphens only. No em dashes (`—`) or en dashes (`–`) anywhere - not in code, comments, strings, JSDoc, or markdown.
2. The string "Blinklink" or any other parent brand name must never appear in user-visible code (screens, components, strings, i18n keys, splash, errors, About).
3. App name everywhere user-facing is "Enterprise Creator".
4. No emoji icons. `lucide-react-native` only.
5. Light + dark mode parity on every screen. No drop shadows on cards in dark mode.
6. RTL is disabled. `I18nManager.allowRTL(false)` and `forceRTL(false)` at boot.
7. Uploaded video must reach the upload endpoint as H.264 MP4, 720p or below.
8. All user-visible strings go through i18n.

## Operating modes

### SCAFFOLD mode (default)

The app builds out fully but with these specific stubs:

| Surface | SCAFFOLD behavior |
|---------|------------------|
| All API calls | Hit `lib/api/mocks/*.ts` regardless of `EXPO_PUBLIC_MOCK_API` |
| Video upload | 3s simulated progress timer, returns `{ mediaKey: 'mock_<timestamp>' }` |
| SSO buttons | Visible on method screen, tap shows "SSO setup pending" toast |
| Push notifications | Settings toggle exists but writes only to local prefs |
| Sentry | `lib/monitoring/sentry.ts` exists with init code commented out |
| i18n | English fully translated; Spanish, French, Hindi, Arabic JSON files have same key structure with empty values (fall back to English) |

### FULL mode

Replace each SCAFFOLD stub with the real implementation. Real SSO config, real signed-URL upload, real Sentry DSN, real push token registration, full translations.

To switch modes, edit `CLAUDE.md` and change `operatingMode: SCAFFOLD` to `operatingMode: FULL`.

## Definition of done for any feature

- TypeScript compiles
- `/check-rules` passes
- Light and dark mode visually verified
- Empty, loading, error states all handled
- All strings via i18n
- No console.* statements
- Accessibility roles and labels on all pressables
- Min tap target 44x44
