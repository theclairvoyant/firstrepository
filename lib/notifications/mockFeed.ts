// SCAFFOLD-only feed of in-app notifications. Derived from the seed posts
// so the notification copy stays consistent with whatever the user sees on
// their workspace profile. FULL mode replaces this with a real subscription.

import { seedState } from '@/lib/api/mocks/__seed';
import type { AppNotification } from './types';

const TRACTION_THRESHOLD = 10000;

export function getMockNotifications(workspaceId: string): AppNotification[] {
  const posts = seedState.postsByWorkspace[workspaceId] ?? [];
  const out: AppNotification[] = [];
  for (const p of posts) {
    if (p.publishedAt) {
      out.push({
        id: `notif_live_${p.id}`,
        kind: 'post_live',
        workspaceId,
        postId: p.id,
        postTitle: p.title,
        postThumbnail: p.thumbnailUrl,
        createdAt: p.publishedAt,
      });
    }
    if (p.stats.views >= TRACTION_THRESHOLD) {
      out.push({
        id: `notif_traction_${p.id}`,
        kind: 'post_traction',
        workspaceId,
        postId: p.id,
        postTitle: p.title,
        postThumbnail: p.thumbnailUrl,
        metric: p.stats.views,
        createdAt: p.createdAt,
      });
    }
  }
  return out.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
