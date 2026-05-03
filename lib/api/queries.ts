// TanStack Query hooks for the Enterprise Creator app. Stable query keys live in
// `keys` and are exported so screens can invalidate precisely.
//
// All hooks read through the wrapper modules, which dispatch to mocks in SCAFFOLD
// mode and to the real axios client in FULL mode.

import {
  QueryClient,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import type {
  InfiniteData,
  UseInfiniteQueryResult,
  UseMutationResult,
  UseQueryResult,
} from '@tanstack/react-query';

import * as authApi from './auth';
import * as identityApi from './identity';
import * as postsApi from './posts';
import * as tenantsApi from './tenants';
import * as workspacesApi from './workspaces';

import type {
  AuthResponse,
  CancelRequestInviteResponse,
  CreatePostInput,
  CreateProfileInput,
  CTA,
  DeleteMeResponse,
  DeletePushTokenResponse,
  DiscoveryByDomainResponse,
  EmailStartResponse,
  EnterpriseCreator,
  IdentityMeResponse,
  PatchMembershipInput,
  PatchMeInput,
  PatchPostInput,
  Post,
  PostListResponse,
  RedeemInviteResponse,
  RegisterPushTokenInput,
  RegisterPushTokenResponse,
  RequestInviteResponse,
  ResolveInviteResponse,
  SignOutResponse,
  TagCategory,
  UsernameAvailableResponse,
  Workspace,
  WorkspaceMembership,
} from '@/types/api';

// ---- QueryClient ------------------------------------------------------------

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30 * 1000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}

// ---- Stable query keys ------------------------------------------------------

export const keys = {
  me: ['identity', 'me'] as const,
  memberships: ['memberships'] as const,
  workspace: (id: string) => ['workspace', id] as const,
  tagTopology: (id: string) => ['workspace', id, 'tag-topology'] as const,
  ctas: (id: string) => ['workspace', id, 'ctas'] as const,
  myPosts: (id: string) => ['workspace', id, 'posts', 'me'] as const,
  post: (postId: string) => ['post', postId] as const,
  usernameAvailable: (candidate: string) => ['identity', 'username', candidate] as const,
};

// ---- Queries ----------------------------------------------------------------

export function useMe(
  options?: { enabled?: boolean },
): UseQueryResult<IdentityMeResponse, Error> {
  return useQuery({
    queryKey: keys.me,
    queryFn: identityApi.me,
    enabled: options?.enabled ?? true,
  });
}

export function useMemberships(): UseQueryResult<WorkspaceMembership[], Error> {
  return useQuery({
    queryKey: keys.memberships,
    queryFn: workspacesApi.listMemberships,
  });
}

export function useWorkspace(id: string | null | undefined): UseQueryResult<Workspace, Error> {
  return useQuery({
    queryKey: keys.workspace(id ?? '__none__'),
    queryFn: () => {
      if (!id) throw new Error('workspace id required');
      return workspacesApi.getWorkspace(id);
    },
    enabled: !!id,
  });
}

export function useTagTopology(
  id: string | null | undefined,
): UseQueryResult<TagCategory[], Error> {
  return useQuery({
    queryKey: keys.tagTopology(id ?? '__none__'),
    queryFn: () => {
      if (!id) throw new Error('workspace id required');
      return workspacesApi.getTagTopology(id);
    },
    enabled: !!id,
  });
}

export function useCTAs(id: string | null | undefined): UseQueryResult<CTA[], Error> {
  return useQuery({
    queryKey: keys.ctas(id ?? '__none__'),
    queryFn: () => {
      if (!id) throw new Error('workspace id required');
      return workspacesApi.getCTAs(id);
    },
    enabled: !!id,
  });
}

export function useMyPosts(
  workspaceId: string | null | undefined,
): UseInfiniteQueryResult<InfiniteData<PostListResponse, string | undefined>, Error> {
  return useInfiniteQuery<
    PostListResponse,
    Error,
    InfiniteData<PostListResponse, string | undefined>,
    readonly unknown[],
    string | undefined
  >({
    queryKey: keys.myPosts(workspaceId ?? '__none__'),
    initialPageParam: undefined,
    enabled: !!workspaceId,
    queryFn: ({ pageParam }) => {
      if (!workspaceId) throw new Error('workspace id required');
      return postsApi.listMyPosts(workspaceId, pageParam, 24);
    },
    getNextPageParam: (last) => last.nextCursor,
  });
}

export function usePost(postId: string | null | undefined): UseQueryResult<Post, Error> {
  return useQuery({
    queryKey: keys.post(postId ?? '__none__'),
    queryFn: () => {
      if (!postId) throw new Error('post id required');
      return postsApi.getPost(postId);
    },
    enabled: !!postId,
  });
}

export function useUsernameAvailable(
  candidate: string,
): UseQueryResult<UsernameAvailableResponse, Error> {
  return useQuery({
    queryKey: keys.usernameAvailable(candidate),
    queryFn: () => identityApi.usernameAvailable(candidate),
    enabled: candidate.length > 0,
  });
}

// ---- Mutations --------------------------------------------------------------

export function useEmailStart(): UseMutationResult<EmailStartResponse, Error, { email: string }> {
  return useMutation({
    mutationFn: (vars) => authApi.emailStart(vars.email),
  });
}

export function useEmailVerify(): UseMutationResult<
  AuthResponse,
  Error,
  { email: string; code: string }
> {
  return useMutation({
    mutationFn: (vars) => authApi.emailVerify(vars.email, vars.code),
  });
}

export function useResolveInvite(): UseMutationResult<
  ResolveInviteResponse,
  Error,
  { code: string }
> {
  return useMutation({
    mutationFn: (vars) => tenantsApi.resolveInvite(vars.code),
  });
}

// Discovery by company email domain. Used by add-tenant. Wrapped as a mutation
// so the user explicitly triggers the search rather than firing on mount.
export function useByDomain(): UseMutationResult<
  DiscoveryByDomainResponse,
  Error,
  void
> {
  return useMutation({
    mutationFn: () => tenantsApi.byDomain(),
  });
}

export function useRedeemInvite(): UseMutationResult<RedeemInviteResponse, Error, { code: string }> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars) => tenantsApi.redeemInvite(vars.code),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.memberships });
      qc.invalidateQueries({ queryKey: keys.me });
    },
  });
}

export function useRequestInvite(): UseMutationResult<
  RequestInviteResponse,
  Error,
  { workspaceId: string }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars) => tenantsApi.requestInvite(vars.workspaceId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.memberships });
    },
  });
}

export function useCancelRequestInvite(): UseMutationResult<
  CancelRequestInviteResponse,
  Error,
  { workspaceId: string }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars) => tenantsApi.cancelRequestInvite(vars.workspaceId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.memberships });
    },
  });
}

export function useCreatePost(): UseMutationResult<
  Post,
  Error,
  { workspaceId: string; input: CreatePostInput }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars) => postsApi.createPost(vars.workspaceId, vars.input),
    onSuccess: (post) => {
      qc.invalidateQueries({ queryKey: keys.myPosts(post.workspaceId) });
    },
  });
}

export function usePatchPost(): UseMutationResult<
  Post,
  Error,
  { postId: string; input: PatchPostInput }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars) => postsApi.patchPost(vars.postId, vars.input),
    onSuccess: (post) => {
      qc.setQueryData(keys.post(post.id), post);
      qc.invalidateQueries({ queryKey: keys.myPosts(post.workspaceId) });
    },
  });
}

export function useDeletePost(): UseMutationResult<
  { ok: true },
  Error,
  { postId: string; workspaceId: string }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars) => postsApi.deletePost(vars.postId),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: keys.myPosts(vars.workspaceId) });
      qc.removeQueries({ queryKey: keys.post(vars.postId) });
    },
  });
}

export function useUploadAvatar(): UseMutationResult<
  { avatarUrl: string },
  Error,
  { form?: FormData }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars) => identityApi.uploadAvatar(vars.form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.me });
    },
  });
}

export function usePatchMembership(): UseMutationResult<
  WorkspaceMembership,
  Error,
  { membershipId: string; input: PatchMembershipInput }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars) => workspacesApi.patchMembership(vars.membershipId, vars.input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.me });
      qc.invalidateQueries({ queryKey: keys.memberships });
    },
  });
}

export function usePatchMe(): UseMutationResult<EnterpriseCreator, Error, PatchMeInput> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input) => identityApi.patchMe(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.me });
    },
  });
}

export function useCreateProfile(): UseMutationResult<EnterpriseCreator, Error, CreateProfileInput> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input) => identityApi.createProfile(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.me });
    },
  });
}

export function useDeleteMe(): UseMutationResult<DeleteMeResponse, Error, void> {
  return useMutation({
    mutationFn: () => identityApi.deleteMe(),
  });
}

export function useSignOut(): UseMutationResult<
  SignOutResponse,
  Error,
  { pushTokenId?: string } | void
> {
  return useMutation({
    mutationFn: (vars) => authApi.signOut(vars && 'pushTokenId' in vars ? vars.pushTokenId : undefined),
  });
}

export function useRegisterPushToken(): UseMutationResult<
  RegisterPushTokenResponse,
  Error,
  RegisterPushTokenInput
> {
  return useMutation({
    mutationFn: (input) => identityApi.registerPushToken(input),
  });
}

export function useDeletePushToken(): UseMutationResult<DeletePushTokenResponse, Error, { id: string }> {
  return useMutation({
    mutationFn: (vars) => identityApi.deletePushToken(vars.id),
  });
}
