# Platform Infrastructure

## Localization

Architecture: i18next + react-i18next + expo-localization.

Languages at v1: English (default, fully translated), Arabic, Hindi, Malayalam (scaffolded with same key structure, fall back to English).

RTL is explicitly not supported. Set `I18nManager.allowRTL(false)` and `forceRTL(false)` at boot. Layout stays LTR for every locale.

Locale detection: on first launch, use expo-localization. Match against supported codes; fall back to English. After first launch, user's choice in Settings overrides.

Number, date, currency formatting: use Intl with active locale.

## Deep linking

URL scheme: `enterprisecreator://`.

| URL | Behavior |
|-----|----------|
| `enterprisecreator://w/{workspaceId}` | If user is active member, switch and navigate to Profile. If pending, navigate to Profile (banner shows). If not member, route to add-tenant with workspace pre-selected. If not signed in, store intent and resume after auth. |
| `enterprisecreator://w/{workspaceId}/u/{username}` | V1: same as above. Per-creator highlighting deferred. |
| `enterprisecreator://post/{postId}` | If signed in, navigate to video/{postId}. Otherwise store intent. |
| `enterprisecreator://invite/{code}` | Auto-fills invite code, routes to invite-code screen. |

## Push notifications

Permission flow: never at app start. Triggered when user toggles notifications on in Settings, or after first successful upload via primer sheet.

Registration:

```ts
// FULL mode only
const { status } = await Notifications.requestPermissionsAsync();
if (status !== 'granted') return null;

const token = (await Notifications.getExpoPushTokenAsync({
  projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID,
})).data;

await api.post('/v1/identity/push-tokens', { token, platform: Platform.OS, appVersion });
```

In SCAFFOLD: settings toggle persists locally only.

On sign out: DELETE /v1/identity/push-tokens/{id}.

Notification types: post_approved, post_rejected, post_went_live, edits_requested, invite_received, request_approved. Tapping any deep-links to relevant post or workspace.

## Crash and error reporting

Sentry via @sentry/react-native (FULL mode only).

```ts
// lib/monitoring/sentry.ts
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  enabled: !__DEV__,
  tracesSampleRate: 0.2,
  environment: process.env.EXPO_PUBLIC_ENVIRONMENT ?? 'production',
});

// After sign-in: Sentry.setUser({ id: creator.id }) - no email, only id
```

Wrap root with Sentry.wrap(App). Capture caught upload errors, API failures, unhandled promise rejections with requestId tag.

In SCAFFOLD: file exists with init code commented out and TODO.

## Permissions

Request at moment of need.

| Permission | Trigger |
|------------|---------|
| Camera + microphone | First tap of "Record now" |
| Photo library | First tap of "Choose from gallery" |
| Notifications | Settings toggle, or after first successful upload |

If denied, show inline empty state with "Open settings" button using `Linking.openSettings()`.

## Loading, empty, error states

Every list screen has all three.

- Loading: skeleton matching final layout. Spinners only for inline actions.
- Empty: lucide icon at 48px in textMuted, headline (heading), supporting text (body), optional CTA.
- Error: lucide AlertCircle, "Something went wrong" (heading), supporting text, retry button. requestId in mono caption below.

Network errors never crash. Error boundaries per route.
