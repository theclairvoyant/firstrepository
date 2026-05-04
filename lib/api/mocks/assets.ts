// Centralized hardcoded assets for SCAFFOLD mode.
//
// Every URL the mock layer needs (creator avatar, brand logos, workspace
// avatars, post thumbnails, post media) is defined here. Nothing else in
// lib/api/mocks/ should reference an asset URL directly.
//
// To wipe all SCAFFOLD assets and connect a real backend (S3, CDN, etc.):
//
//   Option A - flip MOCK_API to false in lib/api/config.ts. The wrappers in
//   lib/api/ will start hitting axios and the real API responses bring their
//   own URLs; this file is no longer consulted at runtime.
//
//   Option B - keep MOCK_API true but point this file at your CDN. Replace
//   the picsum/Big Buck Bunny placeholders with your own asset URLs. The
//   shape of MOCK_ASSETS is the contract; do not rename the keys without
//   updating __seed.ts.
//
// Sample video is Big Buck Bunny (Creative Commons, hosted by Google's GTV
// videos bucket). Replace with any direct-access MP4. The video pipeline
// uploads to a separate signed URL flow; this is purely for previewing
// already-published posts in the video detail screen.

const PICSUM = (seed: string, w: number, h: number): string =>
  `https://picsum.photos/seed/${seed}/${w}/${h}`;

const SAMPLE_VIDEO_MP4 =
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';

export const MOCK_ASSETS = {
  creator: {
    // Square portrait. 240x240 is enough for the largest avatar usage (80px @3x).
    avatar: PICSUM('ec-kiran', 240, 240),
  },

  // Neutral silhouette placeholders shown on profile-setup. Each entry is a
  // `silhouette:#RRGGBB` sentinel URI that the Avatar component renders as a
  // face icon over the given background. Zero-bandwidth and locale-neutral.
  //
  // SCAFFOLD-ONLY: these strings must never reach the backend. The wrappers
  // in lib/api/identity.ts (createProfile / patchMe) strip any `avatarUrl`
  // beginning with `silhouette:` before sending. If you add a new code path
  // that submits an avatar URL (e.g. /v1/identity/avatar JSON variant), add
  // the same scrub there too.
  presetAvatars: [
    'silhouette:#64748B', // slate
    'silhouette:#475569', // slate dark
    'silhouette:#0E8A6F', // teal
    'silhouette:#2A6DF4', // blue
    'silhouette:#7B3AB5', // violet
    'silhouette:#C2410C', // ember
  ],

  brands: {
    // Square logo placeholders. Real logos should be square SVG / PNG with
    // transparent background; the UI wraps them in a 1px border so light
    // logos do not vanish on light bg.
    acme: { logoUrl: PICSUM('ec-brand-acme', 120, 120) },
    globex: { logoUrl: PICSUM('ec-brand-globex', 120, 120) },
    initech: { logoUrl: PICSUM('ec-brand-initech', 120, 120) },
  },

  workspaces: {
    // Per-membership avatars and cover banners. The user can override these in
    // the (deferred) edit-profile editor. Banners are wider 800x300 picsum
    // tiles rendered as the IG-style cover behind the avatar.
    acmeGlobalLearning: {
      avatarUrl: PICSUM('ec-ws-acme-skills', 240, 240),
      bannerUrl: PICSUM('ec-ws-acme-skills-banner', 800, 300),
    },
    acmeSocial: {
      avatarUrl: PICSUM('ec-ws-acme-social', 240, 240),
      bannerUrl: PICSUM('ec-ws-acme-social-banner', 800, 300),
    },
    globexSkills: {
      avatarUrl: PICSUM('ec-ws-globex-skills', 240, 240),
      bannerUrl: PICSUM('ec-ws-globex-skills-banner', 800, 300),
    },
    initechPartner: {
      avatarUrl: PICSUM('ec-ws-initech-partner', 240, 240),
      bannerUrl: PICSUM('ec-ws-initech-partner-banner', 800, 300),
    },
  },

  posts: {
    // Single sample MP4 reused for every post in SCAFFOLD - good enough to
    // prove the player wiring without 12 separate uploads.
    sampleMediaUrl: SAMPLE_VIDEO_MP4,

    // 9:16 vertical thumbnails, 540x960 source. The grid tile renders at
    // ~half-screen-width so this is plenty.
    thumbnailFor(postId: string): string {
      return PICSUM(`ec-${postId}`, 540, 960);
    },
  },
} as const;
