// Mock posts endpoints.
// docs/06-api-contracts.md: posts/me cursor pagination, getPost, createPost, patchPost, deletePost.

import { ApiError } from '@/types/api';
import type {
  CreatePostInput,
  PatchPostInput,
  Post,
  PostListResponse,
  PostStatus,
} from '@/types/api';
import { findPost, findWorkspace, nextPostId, seedState, simulateLatency } from './__seed';

const DEFAULT_LIMIT = 24;

export async function listMyPosts(
  workspaceId: string,
  cursor: string | undefined,
  limit: number = DEFAULT_LIMIT,
): Promise<PostListResponse> {
  await simulateLatency(290);
  const all = seedState.postsByWorkspace[workspaceId];
  if (!all) {
    throw new ApiError({ code: 'NOT_FOUND', message: 'Workspace not found.', status: 404 });
  }
  // Sort newest-first, deterministic tie-break by id.
  const sorted = [...all].sort((a, b) => {
    const cmp = b.createdAt.localeCompare(a.createdAt);
    return cmp !== 0 ? cmp : a.id.localeCompare(b.id);
  });
  const startIdx = cursor ? Math.max(0, sorted.findIndex((p) => p.id === cursor)) : 0;
  const slice = sorted.slice(startIdx, startIdx + limit);
  const nextIdx = startIdx + limit;
  const nextCursor = nextIdx < sorted.length ? sorted[nextIdx].id : undefined;
  return { posts: slice, nextCursor };
}

export async function getPost(postId: string): Promise<Post> {
  await simulateLatency(230);
  const found = findPost(postId);
  if (!found) {
    throw new ApiError({ code: 'NOT_FOUND', message: 'Post not found.', status: 404 });
  }
  return found.post;
}

export async function createPost(workspaceId: string, input: CreatePostInput): Promise<Post> {
  await simulateLatency(360);
  const ws = findWorkspace(workspaceId);
  if (!ws) {
    throw new ApiError({ code: 'NOT_FOUND', message: 'Workspace not found.', status: 404 });
  }
  const cta = ws.capabilities.allowedCtas.find((c) => c.id === input.ctaId) ?? null;
  if (!cta) {
    throw new ApiError({
      code: 'BAD_REQUEST',
      message: 'CTA is not allowed on this workspace.',
      status: 400,
    });
  }
  const status: PostStatus = ws.capabilities.requireApproval ? 'pending' : 'live';
  const id = nextPostId();
  const post: Post = {
    id,
    workspaceId,
    status,
    title: input.title,
    description: input.description,
    tagIds: input.tagIds,
    cta,
    ctaUrl: input.ctaUrl,
    mediaUrl: `https://example.com/media/${id}.mp4`,
    thumbnailUrl: `https://example.com/media/${id}.jpg`,
    durationSeconds: 30,
    createdAt: new Date().toISOString(),
    stats: { views: 0, clicks: 0, watchThroughRate: 0, avgWatchSeconds: 0 },
  };
  if (!seedState.postsByWorkspace[workspaceId]) {
    seedState.postsByWorkspace[workspaceId] = [];
  }
  seedState.postsByWorkspace[workspaceId].unshift(post);
  return post;
}

export async function patchPost(postId: string, input: PatchPostInput): Promise<Post> {
  await simulateLatency(280);
  const found = findPost(postId);
  if (!found) {
    throw new ApiError({ code: 'NOT_FOUND', message: 'Post not found.', status: 404 });
  }
  const list = seedState.postsByWorkspace[found.workspaceId];
  const idx = list.findIndex((p) => p.id === postId);
  let nextCta = list[idx].cta;
  if (input.ctaId) {
    const ws = findWorkspace(found.workspaceId);
    nextCta = ws?.capabilities.allowedCtas.find((c) => c.id === input.ctaId) ?? null;
  }
  const next: Post = {
    ...list[idx],
    title: input.title ?? list[idx].title,
    description: input.description ?? list[idx].description,
    tagIds: input.tagIds ?? list[idx].tagIds,
    cta: nextCta,
    ctaUrl: input.ctaUrl ?? list[idx].ctaUrl,
  };
  list[idx] = next;
  return next;
}

export async function deletePost(postId: string): Promise<{ ok: true }> {
  await simulateLatency(240);
  const found = findPost(postId);
  if (!found) {
    throw new ApiError({ code: 'NOT_FOUND', message: 'Post not found.', status: 404 });
  }
  const list = seedState.postsByWorkspace[found.workspaceId];
  const idx = list.findIndex((p) => p.id === postId);
  if (idx >= 0) list.splice(idx, 1);
  return { ok: true };
}
