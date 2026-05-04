// Shared API types. Source of truth: docs/06-api-contracts.md and docs/02-identity-and-onboarding.md.
// No `any`. Every shape exported.

// Identity layer

export type EnterpriseCreator = {
  id: string;
  globalUsername: string;
  firstName: string;
  lastName: string;
  avatarUrl: string;
  email: string;
  emailVerified: boolean;
  // Optional phone is collected during profile setup; verification is a future
  // server feature. Until then phoneVerified will be false.
  phone?: string;
  phoneVerified?: boolean;
  createdAt: string;
};

// Workspace layer

export type WorkspaceType = 'skills' | 'social' | 'partner';

export type CreatorJoinPolicy = 'open' | 'request' | 'invite_only';

export type CtaStyle = 'primary' | 'secondary' | 'ghost';

export type StaticCTA = {
  id: string;
  kind: 'static';
  label: string;
  style: CtaStyle;
  url: string;
};

export type DynamicCTA = {
  id: string;
  kind: 'dynamic';
  label: string;
  style: CtaStyle;
};

export type CTA = StaticCTA | DynamicCTA;

export type WorkspaceCapabilities = {
  creatorTagsEnabled: boolean;
  requireApproval: boolean;
  maxVideoSeconds: number;
  maxFileSizeMB: number;
  requiredAspectRatio: '9:16';
  allowedCtas: CTA[];
  creatorJoinPolicy: CreatorJoinPolicy;
};

export type WorkspaceBrand = {
  id: string;
  name: string;
  logoUrl: string;
  primaryColor?: string;
};

export type Workspace = {
  id: string;
  type: WorkspaceType;
  name: string;
  brand: WorkspaceBrand;
  capabilities: WorkspaceCapabilities;
};

export type MembershipStatus = 'active' | 'pending_invite' | 'pending_request' | 'revoked';

export type WorkspaceMembership = {
  membershipId: string;
  workspace: Workspace;
  status: MembershipStatus;
  // Public-facing display name (e.g. "Kiran Patel"). Optional - falls back
  // to the global creator name if unset.
  displayName?: string;
  workspaceUsername: string;
  workspaceAvatarUrl: string;
  bannerUrl?: string;
  bio: string;
  postCount: number;
  totalViews: number;
  totalClicks: number;
  totalLikes: number;
  joinedAt: string | null;
};

// Tags

export type Tag = {
  id: string;
  name: string;
};

export type TagCategory = {
  id: string;
  name: string;
  tags: Tag[];
};

export type TagTopologyResponse = TagCategory[];

// Posts

export type PostStatus = 'pending' | 'approved' | 'live' | 'rejected' | 'needs_edits';

export type PostStats = {
  views: number;
  clicks: number;
  watchThroughRate: number;
  avgWatchSeconds: number;
  likes?: number;
  dislikes?: number;
  shares?: number;
};

export type Post = {
  id: string;
  workspaceId: string;
  status: PostStatus;
  adminNote?: string;
  title: string;
  description: string;
  tagIds: string[];
  cta: CTA | null;
  ctaUrl?: string;
  mediaUrl: string;
  thumbnailUrl: string;
  durationSeconds: number;
  // Lifecycle timestamps. createdAt is when the post was first uploaded.
  // approvedAt is set when an admin moves it from pending -> approved (or
  // straight to live). publishedAt is set when it goes live to viewers.
  createdAt: string;
  approvedAt?: string;
  publishedAt?: string;
  stats: PostStats;
  // File and source media specs (optional - may be missing on legacy posts).
  fileSizeBytes?: number;
  mediaWidth?: number;
  mediaHeight?: number;
};

export type PostListResponse = {
  posts: Post[];
  nextCursor?: string;
};

export type CreatePostInput = {
  title: string;
  description: string;
  tagIds: string[];
  ctaId: string;
  ctaUrl?: string;
  mediaKey: string;
};

export type PatchPostInput = {
  title?: string;
  description?: string;
  tagIds?: string[];
  ctaId?: string;
  ctaUrl?: string;
};

// Auth

export type EmailStartResponse = {
  ok: true;
  ttlSeconds: number;
};

export type AuthResponse = {
  jwt: string;
  refreshToken: string;
  identity: EnterpriseCreator | null;
};

export type RefreshResponse = {
  jwt: string;
  refreshToken: string;
};

export type SignOutResponse = {
  ok: true;
};

export type SsoProvider = 'google' | 'microsoft' | 'apple';

// Identity endpoints

export type IdentityMeResponse = {
  creator: EnterpriseCreator | null;
  memberships: WorkspaceMembership[];
};

export type CreateProfileInput = {
  firstName: string;
  lastName: string;
  globalUsername: string;
  avatarUrl?: string;
  phone?: string;
};

export type PatchMeInput = {
  firstName?: string;
  lastName?: string;
  globalUsername?: string;
  phone?: string;
};

export type DeleteMeResponse = {
  ok: true;
  deletedAt: string;
};

export type AvatarUploadResponse = {
  avatarUrl: string;
};

export type UsernameAvailableResponse = {
  available: boolean;
};

export type RegisterPushTokenInput = {
  token: string;
  platform: 'ios' | 'android';
  appVersion: string;
};

export type RegisterPushTokenResponse = {
  id: string;
};

export type DeletePushTokenResponse = {
  ok: true;
};

// Invites and discovery

export type ResolveInviteResponse = {
  brand: WorkspaceBrand;
  workspace: Workspace;
  requiresVerification: boolean;
};

export type RedeemInviteResponse = {
  membership: WorkspaceMembership;
};

export type DiscoveryByDomainEntry = {
  workspace: Workspace;
  joinPolicy: CreatorJoinPolicy;
  autoJoined: boolean;
};

export type DiscoveryByDomainResponse = {
  workspaces: DiscoveryByDomainEntry[];
};

export type RequestInviteResponse = {
  membership: WorkspaceMembership;
};

export type CancelRequestInviteResponse = {
  ok: true;
};

// Memberships

export type PatchMembershipInput = {
  workspaceUsername?: string;
  bio?: string;
  displayName?: string;
};

export type MembershipAvatarResponse = {
  workspaceAvatarUrl: string;
};

// Uploads

export type SignUploadInput = {
  workspaceId: string;
  filename: string;
  mime: 'video/mp4';
  sizeBytes: number;
};

export type SignUploadResponse = {
  uploadUrl: string;
  mediaKey: string;
  method: 'PUT' | 'POST';
  fields?: Record<string, string>;
  partSize?: number;
  expiresAt: string;
};

export type CompleteUploadInput = {
  mediaKey: string;
};

export type CompleteUploadResponse = {
  ok: true;
  processingState: 'queued' | 'processing' | 'ready' | 'failed';
};

// Error envelope

export type ApiErrorCode =
  | 'INVALID_OTP'
  | 'EMAIL_NOT_VERIFIED'
  | 'INVITE_EXPIRED'
  | 'INVITE_ALREADY_USED'
  | 'EMAIL_DOMAIN_NOT_PROVISIONED'
  | 'WORKSPACE_FULL'
  | 'MEMBERSHIP_REVOKED'
  | 'UPLOAD_TOO_LARGE'
  | 'UPLOAD_INVALID_FORMAT'
  | 'RATE_LIMITED'
  | 'UNAUTHENTICATED'
  | 'NOT_FOUND'
  | 'BAD_REQUEST'
  | 'CONFLICT'
  | 'INTERNAL';

export type ApiErrorEnvelope = {
  error: {
    code: ApiErrorCode | string;
    message: string;
    requestId?: string;
  };
};

export class ApiError extends Error {
  public readonly code: ApiErrorCode | string;
  public readonly status: number;
  public readonly requestId?: string;

  constructor(params: {
    code: ApiErrorCode | string;
    message: string;
    status: number;
    requestId?: string;
  }) {
    super(params.message);
    this.name = 'ApiError';
    this.code = params.code;
    this.status = params.status;
    this.requestId = params.requestId;
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

// Helpers

export type Cursor = string | undefined;
