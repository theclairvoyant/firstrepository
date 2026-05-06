# API Contracts

Total: 32 endpoints across 8 groups.

Base URL: `process.env.EXPO_PUBLIC_API_BASE_URL`. JWT bearer in Authorization. Active workspace in X-Workspace-Id for per-workspace endpoints.

## Auth (5)

| Method | Path | Body | Response |
|--------|------|------|----------|
| POST | /v1/auth/email/start | { email } | { ok, ttlSeconds } |
| POST | /v1/auth/email/verify | { email, code } | { jwt, refreshToken, identity: EnterpriseCreator | null } |
| POST | /v1/auth/sso/exchange | { provider, idToken } | { jwt, refreshToken, identity } |
| POST | /v1/auth/refresh | { refreshToken } | { jwt, refreshToken } |
| POST | /v1/auth/signout | { pushTokenId? } | { ok: true } |

## Identity (8)

| Method | Path | Body | Response |
|--------|------|------|----------|
| GET | /v1/identity/me | - | { creator, memberships } |
| POST | /v1/identity/profile | { firstName, lastName, globalUsername, avatarUrl? } | EnterpriseCreator |
| PATCH | /v1/identity/me | { firstName?, lastName?, globalUsername? } | EnterpriseCreator |
| DELETE | /v1/identity/me | - | { ok, deletedAt } |
| POST | /v1/identity/avatar | multipart | { avatarUrl } |
| GET | /v1/identity/username/available?candidate=foo | - | { available } |
| POST | /v1/identity/push-tokens | { token, platform, appVersion } | { id } |
| DELETE | /v1/identity/push-tokens/{id} | - | { ok } |

## Invites and discovery (5)

| Method | Path | Body | Response |
|--------|------|------|----------|
| POST | /v1/invites/resolve | { code } | { brand, workspace, requiresVerification } |
| POST | /v1/invites/redeem | { code } | { membership } |
| GET | /v1/discovery/by-domain | - | { workspaces: { workspace, joinPolicy, autoJoined }[] } |
| POST | /v1/workspaces/{id}/request-invite | - | { membership } |
| DELETE | /v1/workspaces/{id}/request-invite | - | { ok } |

## Memberships (6)

| Method | Path | Body | Response |
|--------|------|------|----------|
| GET | /v1/memberships | - | WorkspaceMembership[] |
| GET | /v1/memberships/{id} | - | WorkspaceMembership |
| PATCH | /v1/memberships/{id} | { workspaceUsername?, bio?, displayName?, bannerUrl? } | WorkspaceMembership |
| POST | /v1/memberships/{id}/avatar | multipart | { workspaceAvatarUrl } |
| POST | /v1/memberships/{id}/accept | - | { membership } |
| POST | /v1/memberships/{id}/decline | - | { ok } |

`accept` only valid on `pending_invite` memberships; flips status to `active` and assigns a workspaceUsername.
`decline` only valid on `pending_invite`; removes the membership.
A `pending_invite` membership carries `invitedAt` (ISO timestamp) and `invitedBy` (display name of the admin who issued the invite).

## Workspace metadata (3)

| Method | Path | Response |
|--------|------|----------|
| GET | /v1/workspaces/{id} | Workspace |
| GET | /v1/workspaces/{id}/tag-topology | TagCategory[] |
| GET | /v1/workspaces/{id}/ctas | CTA[] |

`Workspace.supportEmail: string` is REQUIRED on every workspace. Surfaced in
the FE only when the user's membership is `revoked` (the only action they
have left in that workspace is to email this address). Admins set this in
the admin console; backend should validate it as a real email and reject
workspace creation without it.

## Posts (5)

| Method | Path | Body | Response |
|--------|------|------|----------|
| GET | /v1/workspaces/{id}/posts/me?cursor=...&limit=24 | - | { posts, nextCursor? } |
| GET | /v1/posts/{postId} | - | Post |
| POST | /v1/workspaces/{id}/posts | { title, description, tagIds, ctaId, ctaUrl?, mediaKey } | Post |
| PATCH | /v1/posts/{postId} | { title?, description?, tagIds?, ctaId?, ctaUrl? } | Post |
| DELETE | /v1/posts/{postId} | - | { ok } |

## Uploads (2)

| Method | Path | Body | Response |
|--------|------|------|----------|
| POST | /v1/uploads/sign | { workspaceId, filename, mime: 'video/mp4', sizeBytes } | { uploadUrl, mediaKey, method, fields?, partSize?, expiresAt } |
| POST | /v1/uploads/complete | { mediaKey } | { ok, processingState } |

## Shapes

```ts
type CTA =
  | { id: string; kind: 'static'; label: string; style: 'primary'|'secondary'|'ghost'; url: string }
  | { id: string; kind: 'dynamic'; label: string; style: 'primary'|'secondary'|'ghost' };

type TagCategory = { id: string; name: string; tags: { id: string; name: string }[] };

type Post = {
  id: string;
  workspaceId: string;
  status: 'pending' | 'approved' | 'live' | 'rejected' | 'needs_edits';
  adminNote?: string;
  title: string;
  description: string;
  tagIds: string[];
  cta: CTA | null;
  ctaUrl?: string;
  mediaUrl: string;
  thumbnailUrl: string;
  durationSeconds: number;
  createdAt: string;
  stats: { views: number; clicks: number; watchThroughRate: number; avgWatchSeconds: number };
};
```

## Standard error envelope

```json
{ "error": { "code": "INVALID_OTP", "message": "...", "requestId": "req_..." } }
```

## Codes the client handles specifically

| Code | Behavior |
|------|----------|
| INVALID_OTP | Inline error, stay on OTP screen |
| EMAIL_NOT_VERIFIED | Route to email entry |
| INVITE_EXPIRED | Show error, allow retry |
| INVITE_ALREADY_USED | Show error |
| EMAIL_DOMAIN_NOT_PROVISIONED | "No workspaces found for your email yet" |
| WORKSPACE_FULL | Show error |
| MEMBERSHIP_REVOKED | Force sign out of that workspace |
| UPLOAD_TOO_LARGE | Show with limit |
| UPLOAD_INVALID_FORMAT | Show error |
| RATE_LIMITED | Exponential backoff |
| UNAUTHENTICATED | 401 refresh flow |

## Headers

```
Authorization: Bearer {jwt}
X-Workspace-Id: {activeWorkspaceId}     // omitted for global endpoints
X-Client: enterprise-creator-mobile
X-Client-Version: {appVersion}
X-Client-Platform: ios|android
Accept-Language: {activeLocale}
```

## 401 refresh logic

1. On 401 from non-refresh request, attempt POST /v1/auth/refresh with stored refresh token.
2. If refresh succeeds, store new JWT and retry original request once.
3. If refresh fails or retry returns 401, clear stores, route to welcome with "session expired" toast.
4. Concurrent 401s share single in-flight refresh promise (no parallel refreshes).

## Global vs per-workspace

- Global (no X-Workspace-Id): /v1/auth/*, /v1/identity/*, /v1/invites/*, /v1/discovery/*, /v1/memberships, /v1/memberships/{id}, /v1/uploads/sign
- Per-workspace: /v1/workspaces/{id}/*, /v1/posts/*
