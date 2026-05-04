// In-memory mock state for SCAFFOLD mode. Mutable so create / patch / delete operations
// reflect in subsequent fetches within the same session. Deterministic - never random.
//
// Source of truth for shapes: types/api.ts (which mirrors docs/06-api-contracts.md).

import AsyncStorage from '@react-native-async-storage/async-storage';
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

// Persisted across cold starts so a returning JWT lands on the right
// screen (profile vs profile-setup). Cleared when the user signs out.
const KEY_HAS_CREATOR_PROFILE = 'ec.mock.hasCreatorProfile';

export async function readPersistedHasCreatorProfile(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(KEY_HAS_CREATOR_PROFILE);
    return raw === 'true';
  } catch {
    return false;
  }
}

export async function writePersistedHasCreatorProfile(value: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY_HAS_CREATOR_PROFILE, value ? 'true' : 'false');
  } catch {
    // ignore - mock storage is best-effort.
  }
}

export async function clearPersistedHasCreatorProfile(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY_HAS_CREATOR_PROFILE);
  } catch {
    // ignore.
  }
}

// Tracks whether the user has joined at least one workspace (via redeemInvite
// or requestInvite). Until it's true, /me returns an empty memberships list
// so a fresh sign-up sees the "no workspaces yet" empty state instead of
// pre-seeded sample data. Cleared on signOut so the next session starts
// fresh.
const KEY_HAS_JOINED_ANY_WORKSPACE = 'ec.mock.hasJoinedAnyWorkspace';

export async function readPersistedHasJoinedAnyWorkspace(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(KEY_HAS_JOINED_ANY_WORKSPACE);
    return raw === 'true';
  } catch {
    return false;
  }
}

export async function writePersistedHasJoinedAnyWorkspace(value: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(
      KEY_HAS_JOINED_ANY_WORKSPACE,
      value ? 'true' : 'false',
    );
  } catch {
    // ignore.
  }
}

export async function clearPersistedHasJoinedAnyWorkspace(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY_HAS_JOINED_ANY_WORKSPACE);
  } catch {
    // ignore.
  }
}

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
    type: 'document',
    label: 'Read the docs',
    style: 'primary',
    url: 'https://example.com/docs',
    iconName: 'book-open',
    background: { kind: 'gradient', colors: ['#5B7CFA', '#8E5BFA'] },
    textColor: '#FFFFFF',
  },
  {
    id: 'cta_static_buy',
    kind: 'static',
    type: 'link',
    label: 'Buy now',
    style: 'primary',
    url: 'https://example.com/buy',
    iconName: 'shopping-bag',
    background: { kind: 'solid', colors: ['#0E8A6F'] },
    textColor: '#FFFFFF',
  },
  {
    id: 'cta_dynamic_link',
    kind: 'dynamic',
    type: 'link',
    label: 'Detail page',
    style: 'primary',
    iconName: 'link',
    background: { kind: 'solid', colors: ['#9B7B53'] },
    textColor: '#FFFFFF',
  },
  {
    id: 'cta_dynamic_form',
    kind: 'dynamic',
    type: 'document',
    label: 'Must read',
    style: 'primary',
    iconName: 'file-text',
    background: { kind: 'solid', colors: ['#A6C24B'] },
    textColor: '#FFFFFF',
  },
];

const acmeSocialCtas: CTA[] = [
  {
    id: 'cta_static_follow',
    kind: 'static',
    type: 'link',
    label: 'Chat with us now',
    style: 'primary',
    url: 'https://example.com/follow',
    iconName: 'headphones',
    background: { kind: 'solid', colors: ['#16A34A'] },
    textColor: '#FFFFFF',
  },
  {
    id: 'cta_dynamic_share',
    kind: 'dynamic',
    type: 'link',
    label: 'Share link',
    style: 'primary',
    iconName: 'message-circle',
    background: { kind: 'gradient', colors: ['#F59E0B', '#EF4444'] },
    textColor: '#FFFFFF',
  },
];

// ---- Workspaces -------------------------------------------------------------

export const seedWorkspaces: Workspace[] = [
  {
    id: 'ws_skills_acme',
    type: 'skills',
    name: 'Pinecrest Sales',
    handle: 'pinecrest-sales',
    brand: {
      id: 'brand_pinecrest',
      name: 'Pinecrest Properties',
      logoUrl: MOCK_ASSETS.brands.pinecrest.logoUrl,
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
    name: 'Pinecrest Stories',
    handle: 'pinecrest-stories',
    brand: {
      id: 'brand_pinecrest',
      name: 'Pinecrest Properties',
      logoUrl: MOCK_ASSETS.brands.pinecrest.logoUrl,
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
    name: 'Velocity Showroom',
    handle: 'velocity-showroom-team',
    brand: {
      id: 'brand_velocity',
      name: 'Velocity Motors',
      logoUrl: MOCK_ASSETS.brands.velocity.logoUrl,
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
    name: 'Cascade Concierge',
    handle: 'cascade-concierge-partners',
    brand: {
      id: 'brand_cascade',
      name: 'Cascade Hotels',
      logoUrl: MOCK_ASSETS.brands.cascade.logoUrl,
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
    displayName: 'Kiran Patel',
    workspaceUsername: 'kiran.sales',
    workspaceAvatarUrl: MOCK_ASSETS.workspaces.pinecrestSales.avatarUrl,
    bannerUrl: MOCK_ASSETS.workspaces.pinecrestSales.bannerUrl,
    bio: 'Senior agent sharing buyer-side training and listing walkthroughs.',
    postCount: 12,
    totalViews: 184230,
    totalClicks: 9821,
    totalLikes: 22107,
    joinedAt: isoOffset(2),
  },
  {
    membershipId: 'mem_social_acme',
    workspace: seedWorkspaces[1],
    status: 'active',
    displayName: 'Kiran from Pinecrest',
    workspaceUsername: 'kiran.stories',
    workspaceAvatarUrl: MOCK_ASSETS.workspaces.pinecrestStories.avatarUrl,
    bannerUrl: MOCK_ASSETS.workspaces.pinecrestStories.bannerUrl,
    bio: 'Behind-the-scenes from the Pinecrest social team.',
    postCount: 0,
    totalViews: 0,
    totalClicks: 0,
    totalLikes: 0,
    joinedAt: isoOffset(8),
  },
  {
    membershipId: 'mem_skills_globex',
    workspace: seedWorkspaces[2],
    status: 'pending_invite',
    workspaceUsername: '',
    workspaceAvatarUrl: MOCK_ASSETS.workspaces.velocityShowroom.avatarUrl,
    bannerUrl: MOCK_ASSETS.workspaces.velocityShowroom.bannerUrl,
    bio: '',
    postCount: 0,
    totalViews: 0,
    totalClicks: 0,
    totalLikes: 0,
    joinedAt: null,
  },
  {
    membershipId: 'mem_partner_initech',
    workspace: seedWorkspaces[3],
    status: 'pending_request',
    workspaceUsername: '',
    workspaceAvatarUrl: MOCK_ASSETS.workspaces.cascadeConcierge.avatarUrl,
    bannerUrl: MOCK_ASSETS.workspaces.cascadeConcierge.bannerUrl,
    bio: '',
    postCount: 0,
    totalViews: 0,
    totalClicks: 0,
    totalLikes: 0,
    joinedAt: null,
  },
];

// ---- Tag topology (only ws_skills_acme has full topology) ------------------

export const seedTagTopology: Record<string, TagCategory[]> = {
  ws_skills_acme: [
    {
      id: 'cat_property_type',
      name: 'Property type',
      tags: [
        { id: 'property/single-family', name: 'Single family' },
        { id: 'property/condo', name: 'Condo' },
        { id: 'property/townhouse', name: 'Townhouse' },
        { id: 'property/apartment', name: 'Apartment' },
        { id: 'property/land', name: 'Land' },
      ],
    },
    {
      id: 'cat_topic',
      name: 'Topic',
      tags: [
        { id: 'topic/buying', name: 'Buying' },
        { id: 'topic/selling', name: 'Selling' },
        { id: 'topic/mortgage', name: 'Mortgage' },
        { id: 'topic/staging', name: 'Staging' },
        { id: 'topic/neighborhood', name: 'Neighborhood' },
      ],
    },
    {
      id: 'cat_audience',
      name: 'Audience',
      tags: [
        { id: 'audience/first-time-buyer', name: 'First-time buyer' },
        { id: 'audience/seller', name: 'Seller' },
        { id: 'audience/investor', name: 'Investor' },
        { id: 'audience/renter', name: 'Renter' },
        { id: 'audience/agent', name: 'Agent' },
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
  // Derived engagement counts so the dataset shows realistic ratios without
  // needing to hand-tune every seed entry.
  const likes = Math.round(views * 0.12);
  const dislikes = Math.round(views * 0.01);
  const shares = Math.round(views * 0.03);
  return {
    views,
    clicks,
    watchThroughRate: wtr,
    avgWatchSeconds: avg,
    likes,
    dislikes,
    shares,
  };
}

function buildPost(workspaceId: string, input: SeedPostInput): Post {
  const cta = input.cta;
  // Vertical 9:16 source @ 720p. Approx file size at 720p H264 60fps high
  // bitrate: ~3.5MB per 10s. Compute deterministically so the specs bubble
  // shows believable but stable values.
  const mediaWidth = 720;
  const mediaHeight = 1280;
  const fileSizeBytes = Math.round(input.durationSeconds * 0.35 * 1024 * 1024);
  // Derive lifecycle timestamps from status. Approve happens ~1 day after
  // upload; live publishes ~half a day after approval.
  const createdAt = isoOffset(input.daysFromEpoch);
  const approvedAt: string | undefined =
    input.status === 'approved' ||
    input.status === 'live' ||
    input.status === 'needs_edits'
      ? isoOffset(input.daysFromEpoch + 1)
      : undefined;
  const publishedAt: string | undefined =
    input.status === 'live'
      ? isoOffset(input.daysFromEpoch + 1.5)
      : undefined;
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
    createdAt,
    approvedAt,
    publishedAt,
    stats: buildStats(input.views, input.ctrPercent, input.watchThroughRate, input.avgWatchSeconds),
    fileSizeBytes,
    mediaWidth,
    mediaHeight,
  };
}

const acmeSkillsPostInputs: SeedPostInput[] = [
  // 4 live
  {
    id: 'post_live_1',
    status: 'live',
    title: 'Walking buyers through a coastal condo',
    description: 'A 60-second tour of the new oceanfront listing on Marina Drive.',
    tagIds: ['property/condo', 'topic/buying'],
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
    title: 'Three mortgage tips first-time buyers should hear',
    description: 'Pre-approval, points, and the rate-lock window in plain English.',
    tagIds: ['topic/mortgage', 'audience/first-time-buyer'],
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
    title: 'Neighborhood spotlight: Maplewood Heights',
    description: 'Schools, walkability, and what the comps look like this quarter.',
    tagIds: ['topic/neighborhood', 'audience/first-time-buyer'],
    cta: acmeSkillsCtas[2],
    ctaUrl: 'https://wiki.example.com/maplewood',
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
    title: 'Open house tips that close more visitors',
    description: 'A practical look at staging, signage, and the follow-up cadence.',
    tagIds: ['topic/staging', 'audience/agent'],
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
    title: 'Closing checklist in 60 seconds',
    description: 'Title search, escrow, walk-through, keys.',
    tagIds: ['topic/buying'],
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
    title: 'Listing photos that actually sell',
    description: 'When to reach for wide-angle, and when natural light wins.',
    tagIds: ['topic/staging', 'audience/seller'],
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
    title: 'Home inspection essentials before you offer',
    description: 'Walking through a real inspection report with the buyer.',
    tagIds: ['topic/buying', 'audience/first-time-buyer'],
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
    title: 'Q2 market update for downtown condos',
    description: 'Inventory, days on market, and where prices are heading.',
    tagIds: ['property/condo', 'audience/investor'],
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
    title: 'Virtual staging on a budget',
    description: 'Three tools agents are using to stage empty listings.',
    tagIds: ['topic/staging'],
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
    title: 'Open house pitch that converts in 30 seconds',
    description: 'A peek at how the team opens conversations with new visitors.',
    tagIds: ['audience/agent'],
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
    title: 'Hot take on a competing brokerage',
    description: 'A rant.',
    tagIds: ['property/single-family'],
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
    title: 'Quick weekly stand-up notes',
    description: 'Three things that worked for our squad this week.',
    tagIds: ['audience/agent'],
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
  // false until the user joins their first workspace (via redeemInvite or
  // requestInvite). Gates whether /me returns memberships at all.
  hasJoinedAnyWorkspace: boolean;
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
    hasJoinedAnyWorkspace: false,
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
