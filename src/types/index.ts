// User and Authentication Types
export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  phoneNumber?: string;
  bio?: string;
  createdAt: string;
  verified: boolean;
}

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  phoneNumber?: string;
}

// Content Types
export enum ContentType {
  VIDEO = 'video',
  IMAGE = 'image',
  AUDIO = 'audio',
  DOCUMENT = 'document',
}

export enum ContentStatus {
  DRAFT = 'draft',
  PROCESSING = 'processing',
  PUBLISHED = 'published',
  FAILED = 'failed',
}

export interface ContentMetadata {
  title: string;
  description: string;
  tags: string[];
  category: string;
  visibility: 'public' | 'private' | 'unlisted';
}

export interface Content {
  id: string;
  userId: string;
  type: ContentType;
  metadata: ContentMetadata;
  status: ContentStatus;
  fileUrl?: string;
  thumbnailUrl?: string;
  duration?: number;
  size: number;
  uploadedAt: string;
  publishedAt?: string;
  views: number;
  likes: number;
  earnings: number;
}

export interface UploadProgress {
  contentId: string;
  progress: number;
  status: 'uploading' | 'processing' | 'complete' | 'error';
  error?: string;
}

// Tenant/Platform Types
export interface Tenant {
  id: string;
  name: string;
  logo: string;
  description: string;
  category: string;
  isActive: boolean;
}

export interface TenantProfile {
  tenantId: string;
  userId: string;
  displayName: string;
  bio: string;
  avatar?: string;
  followers: number;
  following: number;
  totalContent: number;
  totalEarnings: number;
  isPublic: boolean;
  customFields: Record<string, any>;
}

// Earnings Types
export interface EarningSource {
  id: string;
  name: string;
  type: 'views' | 'subscriptions' | 'tips' | 'ads' | 'other';
  amount: number;
  currency: string;
  date: string;
}

export interface EarningsSummary {
  totalEarnings: number;
  thisMonth: number;
  lastMonth: number;
  pendingPayment: number;
  currency: string;
  sources: EarningSource[];
}

export interface PaymentMethod {
  id: string;
  type: 'bank' | 'paypal' | 'stripe' | 'crypto';
  label: string;
  details: Record<string, any>;
  isDefault: boolean;
  verified: boolean;
}

export interface Payout {
  id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  paymentMethodId: string;
  requestedAt: string;
  completedAt?: string;
}

// Analytics Types
export interface AnalyticsData {
  views: number;
  likes: number;
  shares: number;
  comments: number;
  earnings: number;
  period: 'day' | 'week' | 'month' | 'year';
  data: {
    date: string;
    value: number;
  }[];
}

// Navigation Types
export type RootStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
  Login: undefined;
  Register: undefined;
  Main: undefined;
  ContentUpload: undefined;
  ContentDetail: { contentId: string };
  ProfileEdit: undefined;
  TenantProfileEdit: { tenantId: string };
  Earnings: undefined;
  PayoutRequest: undefined;
  Settings: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Content: undefined;
  Upload: undefined;
  Earnings: undefined;
  Profile: undefined;
};

// API Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// Config Types
export interface AppConfig {
  apiBaseUrl: string;
  apiTimeout: number;
  maxUploadSize: number;
  supportedContentTypes: ContentType[];
  enableAnalytics: boolean;
}
