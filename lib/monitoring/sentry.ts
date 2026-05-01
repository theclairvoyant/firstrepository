import { MOCK_API } from '@/lib/api/config';

// SCAFFOLD: this file is a no-op shim. To switch to FULL, install
// @sentry/react-native, uncomment the Sentry block below, set
// EXPO_PUBLIC_SENTRY_DSN, and wrap the root with Sentry.wrap.

// import * as Sentry from '@sentry/react-native';
// Sentry.init({
//   dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
//   enabled: !__DEV__,
//   tracesSampleRate: 0.2,
//   environment: process.env.EXPO_PUBLIC_ENVIRONMENT ?? 'production',
// });

export type MonitoringContext = Readonly<Record<string, string | number | boolean | null>>;

export function initMonitoring(): void {
  if (MOCK_API) return;
  // FULL: Sentry.init({ ... }) here, then attach native handlers.
}

export function setMonitoringUser(userId: string | null): void {
  if (MOCK_API) return;
  void userId;
  // FULL: Sentry.setUser(userId ? { id: userId } : null)
}

export function captureException(error: unknown, context?: MonitoringContext): void {
  if (MOCK_API) return;
  void error;
  void context;
  // FULL: Sentry.captureException(error, { extra: context })
}

export function captureMessage(message: string, context?: MonitoringContext): void {
  if (MOCK_API) return;
  void message;
  void context;
  // FULL: Sentry.captureMessage(message, { extra: context })
}

export function addBreadcrumb(category: string, message: string, data?: MonitoringContext): void {
  if (MOCK_API) return;
  void category;
  void message;
  void data;
  // FULL: Sentry.addBreadcrumb({ category, message, data })
}
