// Two notification kinds for now. Each is rendered with its own icon, copy
// template, and tap behaviour on the notifications screen. The list lives
// in lib/notifications/mockFeed.ts in SCAFFOLD; FULL mode will swap that
// out for a backend-fed feed without touching the screen.

export type NotificationKind = 'post_live' | 'post_traction';

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  workspaceId: string;
  postId: string;
  postTitle: string;
  postThumbnail?: string;
  // Numeric value relevant to the kind. For post_traction this is the view
  // count milestone hit (e.g. 10000). For post_live it's unused.
  metric?: number;
  createdAt: string;
}
