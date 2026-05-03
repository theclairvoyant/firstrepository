// In-memory mock state for SCAFFOLD mode. Mutable so create / patch / delete operations
// reflect in subsequent fetches within the same session. Deterministic - never random.
//
// Source of truth for shapes: types/api.ts (which mirrors docs/06-api-contracts.md).

import type {
  CTA,
  EnterpriseCreator,
  Post,
  PostStatus,
  PostStats,
  TagCategory,
  Workspace,
  WorkspaceMembership,
} from '@/types/api';
import { MOCK_ASSETS } from './assets';

// Deterministic time anchor: 30 days ago. Seed timestamps are derived from this via
// fixed offsets so the data set is stable across runs in a single session.
const NOW = Date.now();
const DAY = 24 * 60 * 60 * 1000;
const SEED_EPOCH = NOW - 30 * DAY;

function isoOffset(daysFromSeedEpoch: number): string {
  return new Date(SEED_EPOCH + daysFromSeedEpoch * DAY).toISOString();
}

// ---- Creator ----------------------------------------------------------------

export const seedCreator: EnterpriseCreator = {
  id: 'creator_kiran',
  globalUsername: 'kiran',
  firstName: 'Kiran',
  lastName: 'Patel',
  avatarUrl: MOCK_ASSETS.creator.avatar,
  email: 'kiran@example.com',
  emailVerified: true,
  phone: '+15551234567',
  phoneVerified: false,
  createdAt: isoOffset(0),
};

// ---- CTAs (per workspace allowedCtas) --------------------------------------

const acmeSkillsCtas: CTA[] = [
  {
    id: 'cta_static_docs',
    kind: 'static',
    label: 'Read the docs',
    style: 'primary',
    url: 'https://example.com/docs',
  },
  {
    id: 'cta_static_buy',
    kind: 'static',
    label: 'Buy now',
    style: 'secondary',
    url: 'https://example.com/buy',
  },
  {
    id: 'cta_dynamic_link',
    kind: 'dynamic',
    label: 'Custom link',
    style: 'primary',
  },
  {
    id: 'cta_dynamic_form',
    kind: 'dynamic',
    label: 'Open form',
    style: 'ghost',
  },
];

const acmeSocialCtas: CTA[] = [
  {
    id: 'cta_static_follow',
    kind: 'static',
    label: 'Follow brand',
    style: 'primary',
    url: 'https://example.com/follow',
  },
  {
    id: 'cta_dynamic_share',
    kind: 'dynamic',
    label: 'Share link',
    style: 'secondary',
  },
];

// ---- Workspaces -------------------------------------------------------------

export const seedWorkspaces: Workspace[] = [
  {
    id: 'ws_skills_acme',
    type: 'skills',
    name: 'Global Learning',
    brand: {
      id: 'brand_acme',
      name: 'Acme Inc.',
      logoUrl: MOCK_ASSETS.brands.acme.logoUrl,
      primaryColor: '#2A6DF4',
    },
    capabilities: {
      creatorTagsEnabled: true,
      requireApproval: true,
      maxVideoSeconds: 60,
      maxFileSizeMB: 200,
      requiredAspectRatio: '9:16',
      allowedCtas: acmeSkillsCtas,
      creatorJoinPolicy: 'invite_only',
    },
  },
  {
    id: 'ws_social_acme',
    type: 'social',
    name: 'Brand Social',
    brand: {
      id: 'brand_acme',
      name: 'Acme Inc.',
      logoUrl: MOCK_ASSETS.brands.acme.logoUrl,
      primaryColor: '#2A6DF4',
    },
    capabilities: {
      creatorTagsEnabled: false,
      requireApproval: false,
      maxVideoSeconds: 60,
      maxFileSizeMB: 200,
      requiredAspectRatio: '9:16',
      allowedCtas: acmeSocialCtas,
      creatorJoinPolicy: 'open',
    },
  },
  {
    id: 'ws_skills_globex',
    type: 'skills',
    name: 'Globex Skills',
    brand: {
      id: 'brand_globex',
      name: 'Globex',
      logoUrl: MOCK_ASSETS.brands.globex.logoUrl,
      primaryColor: '#0E8A6F',
    },
    capabilities: {
      creatorTagsEnabled: true,
      requireApproval: true,
      maxVideoSeconds: 60,
      maxFileSizeMB: 200,
      requiredAspectRatio: '9:16',
      allowedCtas: acmeSkillsCtas,
      creatorJoinPolicy: 'request',
    },
  },
  {
    id: 'ws_partner_initech',
    type: 'partner',
    name: 'Initech Partner',
    brand: {
      id: 'brand_initech',
      name: 'Initech',
      logoUrl: MOCK_ASSETS.brands.initech.logoUrl,
      primaryColor: '#7B3AB5',
    },
    capabilities: {
      creatorTagsEnabled: true,
      requireApproval: true,
      maxVideoSeconds: 60,
      maxFileSizeMB: 200,
      requiredAspectRatio: '9:16',
      allowedCtas: acmeSkillsCtas,
      creatorJoinPolicy: 'request',
    },
  },
];

// ---- Memberships ------------------------------------------------------------

export const seedMemberships: WorkspaceMembership[] = [
  {
    membershipId: 'mem_skills_acme',
    workspace: seedWorkspaces[0],
    status: 'active',
    workspaceUsername: 'kiran.skills',
    workspaceAvatarUrl: MOCK_ASSETS.workspaces.acmeGlobalLearning.avatarUrl,
    bio: 'Senior engineer sharing internal training videos.',
    postCount: 12,
    totalViews: 184230,
    totalClicks: 9821,
    joinedAt: isoOffset(2),
  },
  {
    membershipId: 'mem_social_acme',
    workspace: seedWorkspaces[1],
    status: 'active',
    workspaceUsername: 'kiran.social',
    workspaceAvatarUrl: MOCK_ASSETS.workspaces.acmeSocial.avatarUrl,
    bio: 'Behind-the-scenes from the brand social team.',
    postCount: 0,
    totalViews: 0,
    totalClicks: 0,
    joinedAt: isoOffset(8),
  },
  {
    membershipId: 'mem_skills_globex',
    workspace: seedWorkspaces[2],
    status: 'pending_invite',
    workspaceUsername: '',
    workspaceAvatarUrl: MOCK_ASSETS.workspaces.globexSkills.avatarUrl,
    bio: '',
    postCount: 0,
    totalViews: 0,
    totalClicks: 0,
    joinedAt: null,
  },
  {
    membershipId: 'mem_partner_initech',
    workspace: seedWorkspaces[3],
    status: 'pending_request',
    workspaceUsername: '',
    workspaceAvatarUrl: MOCK_ASSETS.workspaces.initechPartner.avatarUrl,
    bio: '',
    postCount: 0,
    totalViews: 0,
    totalClicks: 0,
    joinedAt: null,
  },
];

// ---- Tag topology (only ws_skills_acme has full topology) ------------------

export const seedTagTopology: Record<string, TagCategory[]> = {
  ws_skills_acme: [
    {
      id: 'cat_skills',
      name: 'Skills',
      tags: [
        { id: 'skills/javascript', name: 'JavaScript' },
        { id: 'skills/typescript', name: 'TypeScript' },
        { id: 'skills/react', name: 'React' },
        { id: 'skills/python', name: 'Python' },
        { id: 'skills/sql', name: 'SQL' },
      ],
    },
    {
      id: 'cat_topics',
      name: 'Topics',
      tags: [
        { id: 'topics/onboarding', name: 'Onboarding' },
        { id: 'topics/security', name: 'Security' },
        { id: 'topics/leadership', name: 'Leadership' },
        { id: 'topics/design', name: 'Design' },
        { id: 'topics/operations', name: 'Operations' },
      ],
    },
    {
      id: 'cat_audience',
      name: 'Audience',
      tags: [
        { id: 'audience/engineers', name: 'Engineers' },
        { id: 'audience/managers', name: 'Managers' },
        { id: 'audience/sales', name: 'Sales' },
        { id: 'audience/support', name: 'Support' },
        { id: 'audience/all-staff', name: 'All staff' },
      ],
    },
  ],
  ws_social_acme: [],
  ws_skills_globex: [],
  ws_partner_initech: [],
};

// ---- Posts ------------------------------------------------------------------

type SeedPostInput = {
  id: string;
  status: PostStatus;
  title: string;
  description: string;
  tagIds: string[];
  cta: CTA | null;
  ctaUrl?: string;
  durationSeconds: number;
  daysFromEpoch: number;
  views: number;
  ctrPercent: number; // 1..15
  watchThroughRate: number; // 0..1
  avgWatchSeconds: number;
  adminNote?: string;
};

function buildStats(views: number, ctrPercent: number, wtr: number, avg: number): PostStats {
  const clicks = Math.round((views * ctrPercent) / 100);
  return {
    views,
    clicks,
    watchThroughRate: wtr,
    avgWatchSeconds: avg,
  };
}

function buildPost(workspaceId: string, input: SeedPostInput): Post {
  const cta = input.cta;
  return {
    id: input.id,
    workspaceId,
    status: input.status,
    adminNote: input.adminNote,
    title: input.title,
    description: input.description,
    tagIds: input.tagIds,
    cta,
    ctaUrl: input.ctaUrl,
    mediaUrl: MOCK_ASSETS.posts.sampleMediaUrl,
    thumbnailUrl: MOCK_ASSETS.posts.thumbnailFor(input.id),
    durationSeconds: input.durationSeconds,
    createdAt: isoOffset(input.daysFromEpoch),
    stats: buildStats(input.views, input.ctrPercent, input.watchThroughRate, input.avgWatchSeconds),
  };
}

const acmeSkillsPostInputs: SeedPostInput[] = [
  // 4 live
  {
    id: 'post_live_1',
    status: 'live',
    title: 'Onboarding tour: pull request etiquette',
    description: 'A 60-second walkthrough of how we file PRs at Acme.',
    tagIds: ['skills/javascript', 'topics/onboarding'],
    cta: acmeSkillsCtas[0],
    durationSeconds: 58,
    daysFromEpoch: 28,
    views: 48230,
    ctrPercent: 12,
    watchThroughRate: 0.82,
    avgWatchSeconds: 47,
  },
  {
    id: 'post_live_2',
    status: 'live',
    title: 'Three TypeScript tips you can ship today',
    description: 'Strict mode, narrowing, and `satisfies` in the wild.',
    tagIds: ['skills/typescript'],
    cta: acmeSkillsCtas[1],
    ctaUrl: 'https://example.com/buy',
    durationSeconds: 55,
    daysFromEpoch: 24,
    views: 19840,
    ctrPercent: 9,
    watchThroughRate: 0.71,
    avgWatchSeconds: 39,
  },
  {
    id: 'post_live_3',
    status: 'live',
    title: 'Security 101 for new hires',
    description: 'Phishing, MFA, and the things you should never paste anywhere.',
    tagIds: ['topics/security', 'audience/all-staff'],
    cta: acmeSkillsCtas[2],
    ctaUrl: 'https://wiki.example.com/security',
    durationSeconds: 52,
    daysFromEpoch: 20,
    views: 12420,
    ctrPercent: 6,
    watchThroughRate: 0.66,
    avgWatchSeconds: 34,
  },
  {
    id: 'post_live_4',
    status: 'live',
    title: 'How we run weekly engineering reviews',
    description: 'A practical look at our review cadence.',
    tagIds: ['topics/leadership', 'audience/managers'],
    cta: acmeSkillsCtas[3],
    durationSeconds: 60,
    daysFromEpoch: 17,
    views: 8420,
    ctrPercent: 4,
    watchThroughRate: 0.58,
    avgWatchSeconds: 30,
  },

  // 2 approved
  {
    id: 'post_approved_1',
    status: 'approved',
    title: 'SQL window functions in 60 seconds',
    description: 'PARTITION BY without the panic.',
    tagIds: ['skills/sql'],
    cta: acmeSkillsCtas[0],
    durationSeconds: 59,
    daysFromEpoch: 14,
    views: 0,
    ctrPercent: 0,
    watchThroughRate: 0,
    avgWatchSeconds: 0,
  },
  {
    id: 'post_approved_2',
    status: 'approved',
    title: 'Python list comprehensions the safe way',
    description: 'When to reach for them and when not to.',
    tagIds: ['skills/python'],
    cta: acmeSkillsCtas[1],
    ctaUrl: 'https://example.com/buy',
    durationSeconds: 50,
    daysFromEpoch: 12,
    views: 0,
    ctrPercent: 0,
    watchThroughRate: 0,
    avgWatchSeconds: 0,
  },

  // 2 pending
  {
    id: 'post_pending_1',
    status: 'pending',
    title: 'Code review checklist for backend changes',
    description: 'Walking through a real PR with the team.',
    tagIds: ['topics/operations', 'audience/engineers'],
    cta: acmeSkillsCtas[2],
    ctaUrl: 'https://example.com/checklist',
    durationSeconds: 47,
    daysFromEpoch: 9,
    views: 0,
    ctrPercent: 0,
    watchThroughRate: 0,
    avgWatchSeconds: 0,
  },
  {
    id: 'post_pending_2',
    status: 'pending',
    title: 'React rendering pitfalls in 2026',
    description: 'StrictMode, suspense boundaries, and the new hooks.',
    tagIds: ['skills/react'],
    cta: acmeSkillsCtas[0],
    durationSeconds: 60,
    daysFromEpoch: 6,
    views: 0,
    ctrPercent: 0,
    watchThroughRate: 0,
    avgWatchSeconds: 0,
  },

  // 2 needs_edits
  {
    id: 'post_needs_edits_1',
    status: 'needs_edits',
    title: 'Working with our design tokens',
    description: 'How to avoid raw hex in the codebase.',
    tagIds: ['topics/design'],
    cta: acmeSkillsCtas[3],
    durationSeconds: 53,
    daysFromEpoch: 5,
    views: 100,
    ctrPercent: 1,
    watchThroughRate: 0.4,
    avgWatchSeconds: 22,
    adminNote: 'Please replace the third example to match brand guidelines, then resubmit.',
  },
  {
    id: 'post_needs_edits_2',
    status: 'needs_edits',
    title: 'Sales enablement: short demos that convert',
    description: 'A peek at how the team prepares 60-second demos.',
    tagIds: ['audience/sales'],
    cta: acmeSkillsCtas[1],
    ctaUrl: 'https://example.com/buy',
    durationSeconds: 58,
    daysFromEpoch: 4,
    views: 240,
    ctrPercent: 2,
    watchThroughRate: 0.5,
    avgWatchSeconds: 26,
    adminNote: 'Trim the intro by ~5 seconds and verify the closing CTA URL.',
  },

  // 2 rejected
  {
    id: 'post_rejected_1',
    status: 'rejected',
    title: 'Hot take on the latest framework drama',
    description: 'A rant.',
    tagIds: ['skills/javascript'],
    cta: acmeSkillsCtas[2],
    ctaUrl: 'https://example.com/elsewhere',
    durationSeconds: 49,
    daysFromEpoch: 3,
    views: 0,
    ctrPercent: 0,
    watchThroughRate: 0,
    avgWatchSeconds: 0,
    adminNote: 'Off topic for this workspace. See the content policy in the handbook.',
  },
  {
    id: 'post_rejected_2',
    status: 'rejected',
    title: 'Quick stand-up tips',
    description: 'Three things that worked for our squad.',
    tagIds: ['audience/managers'],
    cta: acmeSkillsCtas[0],
    durationSeconds: 44,
    daysFromEpoch: 1,
    views: 0,
    ctrPercent: 0,
    watchThroughRate: 0,
    avgWatchSeconds: 0,
    adminNote: 'Audio quality below threshold. Please rerecord with the lavalier mic.',
  },
];

// Live state slot. Mutable. Wrappers append / mutate / remove from these arrays.
// hasCreatorProfile is true once the user completes profile-setup (or comes
// back via SSO, where the existing identity is treated as already set up).
// The /me mock returns creator: null while this flag is false so the boot
// router can route a freshly-verified email user to /(auth)/profile-setup.
type SeedState = {
  creator: EnterpriseCreator;
  hasCreatorProfile: boolean;
  workspaces: Workspace[];
  memberships: WorkspaceMembership[];
  tagTopology: Record<string, TagCategory[]>;
  postsByWorkspace: Record<string, Post[]>;
  ctasByWorkspace: Record<string, CTA[]>;
};

function buildInitialState(): SeedState {
  const creator: EnterpriseCreator = { ...seedCreator };
  const workspaces: Workspace[] = seedWorkspaces.map((w) => ({
    ...w,
    capabilities: { ...w.capabilities, allowedCtas: [...w.capabilities.allowedCtas] },
    brand: { ...w.brand },
  }));
  const memberships: WorkspaceMembership[] = seedMemberships.map((m) => ({ ...m }));

  const tagTopology: Record<string, TagCategory[]> = {};
  for (const ws of workspaces) {
    const cats = seedTagTopology[ws.id] ?? [];
    tagTopology[ws.id] = cats.map((c) => ({ ...c, tags: c.tags.map((t) => ({ ...t })) }));
  }

  const ctasByWorkspace: Record<string, CTA[]> = {};
  for (const ws of workspaces) {
    ctasByWorkspace[ws.id] = ws.capabilities.allowedCtas.map((c) => ({ ...c }));
  }

  const postsByWorkspace: Record<string, Post[]> = {
    ws_skills_acme: acmeSkillsPostInputs.map((p) => buildPost('ws_skills_acme', p)),
    ws_social_acme: [],
    ws_skills_globex: [],
    ws_partner_initech: [],
  };

  return {
    creator,
    hasCreatorProfile: false,
    workspaces,
    memberships,
    tagTopology,
    postsByWorkspace,
    ctasByWorkspace,
  };
}

export const seedState: SeedState = buildInitialState();

// ---- Helpers (deterministic, mutate seedState) ------------------------------

let postCounter = 1000;
let pushTokenCounter = 1;
let refreshCounter = 1;

export function nextPostId(): string {
  postCounter += 1;
  return `post_user_${postCounter}`;
}

export function nextPushTokenId(): string {
  pushTokenCounter += 1;
  return `pt_${pushTokenCounter}`;
}

export function nextRefreshJwt(): string {
  refreshCounter += 1;
  return `mock_jwt_${refreshCounter}`;
}

export function findWorkspace(id: string): Workspace | undefined {
  return seedState.workspaces.find((w) => w.id === id);
}

export function findMembershipByWorkspace(workspaceId: string): WorkspaceMembership | undefined {
  return seedState.memberships.find((m) => m.workspace.id === workspaceId);
}

export function findPost(postId: string): { workspaceId: string; post: Post } | undefined {
  for (const [workspaceId, posts] of Object.entries(seedState.postsByWorkspace)) {
    const post = posts.find((p) => p.id === postId);
    if (post) return { workspaceId, post };
  }
  return undefined;
}

// Latency simulation: deterministic per-call. Caller passes a fixed offset; clamps to 200..600.
export function simulateLatency(ms: number): Promise<void> {
  const clamped = Math.max(200, Math.min(600, ms));
  return new Promise((resolve) => setTimeout(resolve, clamped));
}
