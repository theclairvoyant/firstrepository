// Centralized storage hygiene. Owns the pruning rules so the app does not
// accumulate orphan drafts, terminal upload jobs, or third-party caches over
// time. Two entry points:
//
//   runStartupMaintenance() - called once on app boot after auth + tenant
//     stores have hydrated. Cheap, idempotent, never throws.
//
//   clearAppCache()        - user-triggered from Settings. Same scope as
//     startup, plus expo-image disk cache. Returns a summary so the UI can
//     toast "freed N items" or similar.
//
// Storage we deliberately do NOT touch:
//   - JWT / refresh tokens (in expo-secure-store; cleared only on signOut /
//     deleteAccount).
//   - User preferences (theme, language, settings, defaultWorkspaceId).
//   - Active or in-flight uploads (terminal-only pruning).

import { Image as ExpoImage } from 'expo-image';
import { useDraftStore } from '@/lib/store/draftStore';
import { useUploadStore } from '@/lib/store/uploadStore';
import { useTenantStore } from '@/lib/store/tenantStore';
import type { WorkspaceMembership } from '@/types/api';

// Cap the number of terminal upload jobs we retain. Just enough so the user
// can scroll back through recent activity in the upload banner without the
// list growing unbounded over months of usage.
const MAX_TERMINAL_UPLOADS = 20;

export type MaintenanceSummary = {
  uploadsPruned: number;
  draftsPruned: number;
};

export type ClearCacheSummary = MaintenanceSummary & {
  imageCacheCleared: boolean;
};

// Best-effort. Each step is wrapped so a failure in one does not block the
// others. We never surface errors to the user from the boot path.
export async function runStartupMaintenance(
  memberships: ReadonlyArray<WorkspaceMembership>,
): Promise<MaintenanceSummary> {
  const summary: MaintenanceSummary = {
    uploadsPruned: 0,
    draftsPruned: 0,
  };

  try {
    summary.uploadsPruned = useUploadStore
      .getState()
      .pruneTerminal(MAX_TERMINAL_UPLOADS);
  } catch {
    // ignore; persistence layer occasionally rejects on cold boot.
  }

  try {
    // Active memberships only. A pending_invite or pending_request workspace
    // is not one the user can compose to anyway.
    const activeIds = memberships
      .filter((m) => m.status === 'active')
      .map((m) => m.workspace.id);
    if (activeIds.length > 0) {
      // Also keep drafts for the currently active workspace even if the
      // memberships list hasn't loaded that one yet (avoids a race on first
      // boot where memberships query is still in flight).
      const activeWorkspaceId = useTenantStore.getState().activeWorkspaceId;
      const allowed: string[] = activeWorkspaceId
        ? Array.from(new Set([...activeIds, activeWorkspaceId]))
        : activeIds;
      summary.draftsPruned = useDraftStore.getState().pruneFor(allowed);
    }
  } catch {
    // ignore.
  }

  return summary;
}

// User-initiated. Same as startup plus the expo-image disk cache (which is
// the largest accumulator over time - thumbnails, banners, avatars).
export async function clearAppCache(
  memberships: ReadonlyArray<WorkspaceMembership>,
): Promise<ClearCacheSummary> {
  const base = await runStartupMaintenance(memberships);
  let imageCacheCleared = false;

  try {
    // Force-trim every terminal upload (not just the cap), since the user
    // explicitly asked.
    useUploadStore.getState().clearTerminal();
  } catch {
    // ignore.
  }

  try {
    await ExpoImage.clearMemoryCache();
    await ExpoImage.clearDiskCache();
    imageCacheCleared = true;
  } catch {
    // ignore.
  }

  return { ...base, imageCacheCleared };
}
