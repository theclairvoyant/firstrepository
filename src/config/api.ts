import { AppConfig } from '@types/index';

// API Configuration
export const API_CONFIG: AppConfig = {
  apiBaseUrl: process.env.API_BASE_URL || 'https://api.blinklinks.io',
  apiTimeout: 30000,
  maxUploadSize: 500 * 1024 * 1024, // 500MB
  supportedContentTypes: ['video', 'image', 'audio', 'document'] as any,
  enableAnalytics: true,
};

// API Endpoints
export const API_ENDPOINTS = {
  // Auth
  AUTH_LOGIN: '/auth/login',
  AUTH_REGISTER: '/auth/register',
  AUTH_LOGOUT: '/auth/logout',
  AUTH_REFRESH: '/auth/refresh',
  AUTH_VERIFY: '/auth/verify',

  // User
  USER_PROFILE: '/user/profile',
  USER_UPDATE: '/user/update',
  USER_DELETE: '/user/delete',

  // Content
  CONTENT_LIST: '/content/list',
  CONTENT_GET: '/content/:id',
  CONTENT_UPLOAD: '/content/upload',
  CONTENT_UPDATE: '/content/:id',
  CONTENT_DELETE: '/content/:id',
  CONTENT_PUBLISH: '/content/:id/publish',

  // Tenants
  TENANT_LIST: '/tenants',
  TENANT_GET: '/tenants/:id',
  TENANT_PROFILE: '/tenants/:id/profile',
  TENANT_PROFILE_UPDATE: '/tenants/:id/profile',

  // Earnings
  EARNINGS_SUMMARY: '/earnings/summary',
  EARNINGS_SOURCES: '/earnings/sources',
  EARNINGS_HISTORY: '/earnings/history',

  // Payouts
  PAYOUT_METHODS: '/payouts/methods',
  PAYOUT_REQUEST: '/payouts/request',
  PAYOUT_HISTORY: '/payouts/history',

  // Analytics
  ANALYTICS_CONTENT: '/analytics/content/:id',
  ANALYTICS_OVERVIEW: '/analytics/overview',
};

// Storage Keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: '@enterprise_creator/auth_token',
  REFRESH_TOKEN: '@enterprise_creator/refresh_token',
  USER_DATA: '@enterprise_creator/user_data',
  ONBOARDING_COMPLETE: '@enterprise_creator/onboarding_complete',
  THEME: '@enterprise_creator/theme',
};

// App Constants
export const APP_CONSTANTS = {
  APP_NAME: 'Enterprise Creator',
  SUPPORT_EMAIL: 'support@blinklinks.io',
  TERMS_URL: 'https://blinklinks.io/terms',
  PRIVACY_URL: 'https://blinklinks.io/privacy',
  MIN_PASSWORD_LENGTH: 8,
  PAGINATION_PAGE_SIZE: 20,
};
