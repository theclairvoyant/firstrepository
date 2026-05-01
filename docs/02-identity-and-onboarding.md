# Identity Model and Onboarding Flows

## Identity layers

Two layers, kept strictly separated in state.

### Enterprise Creator (global)

```ts
type EnterpriseCreator = {
  id: string;
  globalUsername: string;     // globally unique
  firstName: string;
  lastName: string;
  avatarUrl: string;
  email: string;
  emailVerified: boolean;
  createdAt: string;
};
```

### WorkspaceMembership (per tenant)

```ts
type WorkspaceMembership = {
  membershipId: string;
  workspace: Workspace;
  status: 'active' | 'pending_invite' | 'pending_request' | 'revoked';
  workspaceUsername: string;
  workspaceAvatarUrl: string;
  bio: string;                // <= 160 chars
  postCount: number;
  totalViews: number;
  totalClicks: number;
  joinedAt: string | null;
};
```

### Workspace

```ts
type Workspace = {
  id: string;
  type: 'skills' | 'social' | 'partner';
  name: string;
  brand: {
    id: string;
    name: string;
    logoUrl: string;
    primaryColor?: string;
  };
  capabilities: {
    creatorTagsEnabled: boolean;
    requireApproval: boolean;
    maxVideoSeconds: number;     // default 60
    maxFileSizeMB: number;       // default 200
    requiredAspectRatio: '9:16';
    allowedCtas: CTA[];
    creatorJoinPolicy: 'open' | 'request' | 'invite_only';
  };
};
```

## Stores

`tenantStore` holds `activeWorkspaceId` and `lastActiveWorkspaceId`. The axios interceptor adds `X-Workspace-Id` from the active id on every per-workspace request.

## Onboarding flows

Three entry paths from the method screen. All produce a verified `EnterpriseCreator` and zero or more `WorkspaceMembership` records.

### Welcome screen
- Wordmark "Enterprise Creator"
- Tagline "Create. Publish. Earn."
- Primary "Get started"
- Text link "I have an invite code"

### Method screen
1. Continue with email -> email entry -> OTP -> profile setup (if new) or main app
2. Continue with Google / Microsoft / Apple. Apple is iOS-only and shown only when at least one of Google or Microsoft is also offered (App Store Guideline 4.8).
3. I have an invite code -> invite code screen

After verification:
- No existing creator profile -> profile-setup
- Existing profile, no memberships -> (tabs)/profile with empty state and "Find your workspace" CTA
- Existing profile, memberships -> (tabs)/profile with `lastActiveWorkspaceId` if still valid, otherwise first active membership

### Invite code flow
1. 8-character input, uppercase A-Z and 2-9 (no 0, O, 1, I), auto-uppercase, paste-friendly
2. POST `/v1/invites/resolve { code }` -> shows brand logo, name, workspace, type badge, confirmation
3. Buttons: "Continue" and "Wrong code"
4. Continue routes to email or SSO. Server attaches the membership via POST `/v1/invites/redeem` after verification.

### Email + OTP flow
1. Email entry with validation
2. POST `/v1/auth/email/start { email }`
3. OTP screen: 6 digit boxes, auto-advance, paste support, 30s resend timer
4. POST `/v1/auth/email/verify { email, code }` -> JWT in secure store
5. GET `/v1/identity/me` -> profile and any auto-provisioned memberships from corporate domain matching

### SSO flow
Standard `expo-auth-session` for Google and Microsoft. `expo-apple-authentication` on iOS. Server issues the same session JWT after exchange. Same domain-based workspace surfacing.

### Profile setup (first time only)
Single screen with sticky bottom CTA:
1. First name + last name (pre-filled from SSO if available)
2. Auto-generated globalUsername shown read-only with "Change" link. Editor checks GET `/v1/identity/username/available` live.
3. Avatar - default initials avatar shown. Tap to upload custom.

POST `/v1/identity/profile` on finish.
