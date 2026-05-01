// Typed wrapper for post endpoints.

import { MOCK_API } from './config';
import { httpDelete, httpGet, httpPatch, httpPost } from './client';
import * as mock from './mocks/posts';
import type {
  CreatePostInput,
  PatchPostInput,
  Post,
  PostListResponse,
} from '@/types/api';

export async function listMyPosts(
  workspaceId: string,
  cursor?: string,
  limit: number = 24,
): Promise<PostListResponse> {
  if (MOCK_API) return mock.listMyPosts(workspaceId, cursor, limit);
  return httpGet<PostListResponse>(`/v1/workspaces/${workspaceId}/posts/me`, {
    params: { cursor, limit },
  });
}

export async function getPost(postId: string): Promise<Post> {
  if (MOCK_API) return mock.getPost(postId);
  return httpGet<Post>(`/v1/posts/${postId}`);
}

export async function createPost(workspaceId: string, input: CreatePostInput): Promise<Post> {
  if (MOCK_API) return mock.createPost(workspaceId, input);
  return httpPost<Post>(`/v1/workspaces/${workspaceId}/posts`, input);
}

export async function patchPost(postId: string, input: PatchPostInput): Promise<Post> {
  if (MOCK_API) return mock.patchPost(postId, input);
  return httpPatch<Post>(`/v1/posts/${postId}`, input);
}

export async function deletePost(postId: string): Promise<{ ok: true }> {
  if (MOCK_API) return mock.deletePost(postId);
  return httpDelete<{ ok: true }>(`/v1/posts/${postId}`);
}
