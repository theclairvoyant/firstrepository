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

import {
  cacheDirectory,
  getInfoAsync,
  readDirectoryAsync,
} from 'expo-file-system/legacy';
import { Image as ExpoImage } from 'expo-image';
import { useDraftStore } from '@/lib/store/draftStore';
import { useUploadStore } from '@/lib/store/uploadStore';
import { useTenantStore } from '@/lib/store/tenantStore';
import type { WorkspaceMembership } from '@/types/api';

// Cap the number of terminal upload jobs we retain. Just enough so the user
// can scroll back through recent activity in the upload banner without the
// list growing unbounded over months of usage.
const MAX_TERMINAL_UPLOADS = 20;
// Failed jobs older than this are dropped on startup. Long enough that an
// occasional retry-after-vacation still works; short enough that the list
// doesn't fill with months-old corpses.
const FAILED_JOB_MAX_AGE_DAYS = 14;

export type MaintenanceSummary = {
  uploadsPruned: number;
  staleFailedPruned: number;
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
    staleFailedPruned: 0,
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
    summary.staleFailedPruned = useUploadStore
      .getState()
      .pruneStaleFailed(FAILED_JOB_MAX_AGE_DAYS);
  } catch {
    // ignore.
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

// Walks the app's cache directory and sums file sizes. Best-effort: on
// platforms where cacheDirectory is null (web) or where individual files
// can't be stat'd (rare; symbolic-link weirdness), they're treated as zero.
// Capped at MAX_DEPTH levels of recursion so a malformed cache tree can't
// stall the call.
const MAX_DEPTH = 6;

export async function getCacheSizeBytes(): Promise<number> {
  if (!cacheDirectory) return 0;
  const seen = new Set<string>();

  async function walk(path: string, depth: number): Promise<number> {
    if (depth > MAX_DEPTH) return 0;
    if (seen.has(path)) return 0;
    seen.add(path);
    let info;
    try {
      info = await getInfoAsync(path);
    } catch {
      return 0;
    }
    if (!info.exists) return 0;
    if (!info.isDirectory) {
      return typeof info.size === 'number' ? info.size : 0;
    }
    let entries: string[];
    try {
      entries = await readDirectoryAsync(path);
    } catch {
      return 0;
    }
    let total = 0;
    for (const entry of entries) {
      const child = path.endsWith('/') ? `${path}${entry}` : `${path}/${entry}`;
      total += await walk(child, depth + 1);
    }
    return total;
  }

  try {
    return await walk(cacheDirectory, 0);
  } catch {
    return 0;
  }
}

export function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 KB';
  const KB = 1024;
  const MB = 1024 * KB;
  const GB = 1024 * MB;
  if (bytes >= GB) return `${(bytes / GB).toFixed(2)} GB`;
  if (bytes >= MB) return `${(bytes / MB).toFixed(1)} MB`;
  if (bytes >= KB) return `${Math.round(bytes / KB)} KB`;
  return `${bytes} B`;
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
