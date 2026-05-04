// Typed wrapper for workspace metadata endpoints + memberships listing.

import { MOCK_API } from './config';
import { httpGet, httpPatch, httpPost } from './client';
import * as mock from './mocks/workspaces';
import type {
  CTA,
  MembershipAvatarResponse,
  PatchMembershipInput,
  TagCategory,
  Workspace,
  WorkspaceMembership,
} from '@/types/api';

export async function getWorkspace(id: string): Promise<Workspace> {
  if (MOCK_API) return mock.getWorkspace(id);
  return httpGet<Workspace>(`/v1/workspaces/${id}`);
}

export async function getTagTopology(id: string): Promise<TagCategory[]> {
  if (MOCK_API) return mock.getTagTopology(id);
  return httpGet<TagCategory[]>(`/v1/workspaces/${id}/tag-topology`);
}

export async function getCTAs(id: string): Promise<CTA[]> {
  if (MOCK_API) return mock.getCTAs(id);
  return httpGet<CTA[]>(`/v1/workspaces/${id}/ctas`);
}

export async function listMemberships(): Promise<WorkspaceMembership[]> {
  if (MOCK_API) return mock.listMemberships();
  return httpGet<WorkspaceMembership[]>('/v1/memberships');
}

export async function getMembership(membershipId: string): Promise<WorkspaceMembership> {
  if (MOCK_API) return mock.getMembership(membershipId);
  return httpGet<WorkspaceMembership>(`/v1/memberships/${membershipId}`);
}

export async function patchMembership(
  membershipId: string,
  input: PatchMembershipInput,
): Promise<WorkspaceMembership> {
  // TODO(schema): docs/06-api-contracts.md only documents
  // `{ workspaceUsername?, bio? }` for PATCH /v1/memberships/{id}, but the
  // app currently sends `displayName` (and the membership shape carries
  // `bannerUrl`). Align with the CTO before depending on these server-side.
  if (MOCK_API) return mock.patchMembership(membershipId, input);
  return httpPatch<WorkspaceMembership>(`/v1/memberships/${membershipId}`, input);
}

export async function uploadMembershipAvatar(
  membershipId: string,
  form?: FormData,
): Promise<MembershipAvatarResponse> {
  // SCAFFOLD: the mock layer reads the picked file://... URI from FormData
  // for parity with FULL mode. The optimistic UI update lives in the
  // useUploadMembershipAvatar hook (queries.ts) so the wrapper signature
  // does not need a separate previewUri.
  if (MOCK_API) return mock.uploadMembershipAvatar(membershipId, form);
  return httpPost<MembershipAvatarResponse>(
    `/v1/memberships/${membershipId}/avatar`,
    form,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
}
