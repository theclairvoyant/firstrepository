# Locales

This folder is the source of truth for every user-visible string in the app.

`en.json` is canonical. The other four locales (`ar.json`, `es.json`, `fr.json`, `hi.json`) mirror its key structure exactly. At runtime, missing keys fall back to English via `i18next` `fallbackLng: 'en'`.

---

## Structure conventions

The file is organized by surface, not by feature. Each top-level key is a screen, a flow, or a shared concern. Keep this convention so the file scales without becoming a flat dump.

```
common/             - Strings used in 3+ places (Continue, Cancel, Back, Save, etc.)
auth/               - Welcome, method, email, OTP, invite-code, profile-setup
status/             - Post status labels (pending, approved, live, ...)
shell/              - Top bar, drawer, modal, session
tabs/               - Tab labels
boot/               - Boot screen
profileTab/         - The Profile tab
editGlobalEmail/    - Change-email flow
searchByEmail/      - Workspace discovery by verified email
editGlobalProfile/  - Edit global profile screen
editMembership/     - Edit workspace profile screen
uploadTab/          - Upload tab
composer/           - Composer (edit, preview, record, tags, cta)
videoErrors/        - Upload pipeline error codes (PERMISSION_DENIED, etc.)
cellularSheet/      - Cellular upload warning sheet
switcher/           - Tenant switcher modal
addTenant/          - Add workspace screen (invite code + email card)
videoTile/          - Profile grid tile a11y
ctaPicker/          - CTA picker
uploadBanner/       - Upload status banner on Profile
globalProfile/      - Global profile drawer
settings/           - Settings index + every settings/* subscreen
notifications/      - Settings > Notifications screen
video/              - Video detail screen
```

A new screen gets a new top-level key. Don't tuck strings into `common` unless they're genuinely reused.

---

## Adding or changing a key

When you add a new key to en.json, add the same key to ar/es/fr/hi.json *in the same order*. The runtime tolerates missing keys (fallback to English), but every PR should sync them.

Run the parity check before opening a PR:

```bash
bash locales/check-parity.sh
```

It exits non-zero if any locale is missing keys (or has stale ones not in en.json).

If you're adding a string with pluralization, use the `_one` and `_other` suffix convention - `i18next` with `intl-pluralrules` handles the rest. Arabic, Russian, and other languages with more plural forms can add `_zero`, `_two`, `_few`, `_many` if the key warrants it.

```json
"postsCount_one": "{{count}} post",
"postsCount_other": "{{count}} posts"
```

---

## Translation voice guidelines

### English (canonical)
Direct, contemporary, no marketing fluff. Sentence case for body. Title case for screen titles and primary CTAs. Imperative for actions ("Save", "Send code"). No em or en dashes - hyphens only.

### Arabic (ar)
Modern MSA with mobile cadence. Avoid classical/literary register. Drop redundancy ("حدث خطأ ما" -> "حدث خطأ"). Use imperative directly ("احفظ" not "قم بالحفظ"). Brand names stay in Latin script ("Enterprise Creator", "Google", "Microsoft", "Apple"). Toast messages should feel conversational, not like a manual.

### Spanish (es)
Spain Spanish (vosotros NOT used; second person singular "tú" is the default). Concise. Use "Ajustes" for Settings (iOS standard), "espacio" for workspace. Avoid Latin American regionalisms.

### French (fr)
Standard French (France). Use "vous" for the user (not "tu") - it's the platform-standard polite form on mobile. Apostrophes are typed straight ('), not curly. Use "Réglages" for Settings (iOS standard), "espace" for workspace, "publication" for post.

### Hindi (hi)
Devanagari script. Modern conversational Hindi - the kind of register a Mumbai or Delhi professional uses on a mobile app, not formal Doordarshan Hindi. English loanwords are fine where they're idiomatic ("लाइक", "अपलोड", "वर्कस्पेस", "क्लिक"). Avoid heavy Sanskritization. Use "साइन इन" not "लॉगिन" to match what most apps do.

---

## What to NOT translate

- Brand names: "Enterprise Creator", "Google", "Microsoft", "Apple", "Wi-Fi"
- Format placeholders inside curlies: `{{email}}`, `{{count}}`, `{{date}}` etc. - keep them exactly as-is
- Code examples and URL placeholders: "https://example.com/landing", "ABCD2345"
- Technical strings the user copy-pastes: "DELETE" (the confirmation word)
- Acronyms that don't have native equivalents: "SSO", "URL", "SMS" (translate when natural; keep when not)

---

## Adding a new language

1. Copy `en.json` to `locales/<code>.json`. Keep all keys, replace English values with native equivalents.
2. In `lib/store/languageStore.ts`, add the new code to `SUPPORTED_LANGUAGES`.
3. In `lib/i18n/index.ts`, import the new file and add it to the `resources` map.
4. In `en.json` and every other locale, add `settings.language.<code>` (label) and `settings.language.<code>Native` (native script).
5. Run the parity check.

---

## Pluralization quick reference

i18next with `intl-pluralrules` handles CLDR plural categories per locale:

| Locale | Categories used |
|---|---|
| en, es, fr, hi | one, other |
| ar | zero, one, two, few, many, other (we currently provide one, other - others fall back to other) |

If a key needs better Arabic grammar (e.g. "1 post" vs "2 posts" vs "11 posts"), expand it:

```json
"postsCount_zero": "لا توجد منشورات",
"postsCount_one": "منشور واحد",
"postsCount_two": "منشوران",
"postsCount_few": "{{count}} منشورات",
"postsCount_many": "{{count}} منشورًا",
"postsCount_other": "{{count}} منشور"
```
