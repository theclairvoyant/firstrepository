// Mock /v1/workspaces/{id}, /tag-topology, /ctas, plus memberships endpoints.

import { ApiError } from '@/types/api';
import type {
  CTA,
  MembershipAvatarResponse,
  PatchMembershipInput,
  TagCategory,
  Workspace,
  WorkspaceMembership,
} from '@/types/api';
import { findWorkspace, seedState, simulateLatency } from './__seed';

export async function getWorkspace(id: string): Promise<Workspace> {
  await simulateLatency(240);
  const ws = findWorkspace(id);
  if (!ws) {
    throw new ApiError({ code: 'NOT_FOUND', message: 'Workspace not found.', status: 404 });
  }
  return ws;
}

export async function getTagTopology(id: string): Promise<TagCategory[]> {
  await simulateLatency(260);
  const cats = seedState.tagTopology[id];
  if (!cats) {
    throw new ApiError({ code: 'NOT_FOUND', message: 'Workspace not found.', status: 404 });
  }
  return cats;
}

export async function getCTAs(id: string): Promise<CTA[]> {
  await simulateLatency(230);
  const ctas = seedState.ctasByWorkspace[id];
  if (!ctas) {
    throw new ApiError({ code: 'NOT_FOUND', message: 'Workspace not found.', status: 404 });
  }
  return ctas;
}

export async function listMemberships(): Promise<WorkspaceMembership[]> {
  await simulateLatency(250);
  return seedState.memberships;
}

export async function getMembership(membershipId: string): Promise<WorkspaceMembership> {
  await simulateLatency(220);
  const m = seedState.memberships.find((x) => x.membershipId === membershipId);
  if (!m) {
    throw new ApiError({ code: 'NOT_FOUND', message: 'Membership not found.', status: 404 });
  }
  return m;
}

export async function patchMembership(
  membershipId: string,
  input: PatchMembershipInput,
): Promise<WorkspaceMembership> {
  await simulateLatency(290);
  const idx = seedState.memberships.findIndex((x) => x.membershipId === membershipId);
  if (idx < 0) {
    throw new ApiError({ code: 'NOT_FOUND', message: 'Membership not found.', status: 404 });
  }
  const next: WorkspaceMembership = {
    ...seedState.memberships[idx],
    workspaceUsername: input.workspaceUsername ?? seedState.memberships[idx].workspaceUsername,
    bio: input.bio ?? seedState.memberships[idx].bio,
  };
  seedState.memberships[idx] = next;
  return next;
}

export async function uploadMembershipAvatar(
  membershipId: string,
): Promise<MembershipAvatarResponse> {
  await simulateLatency(360);
  const url = `https://example.com/avatars/membership/${membershipId}.jpg`;
  const idx = seedState.memberships.findIndex((x) => x.membershipId === membershipId);
  if (idx >= 0) {
    seedState.memberships[idx] = { ...seedState.memberships[idx], workspaceAvatarUrl: url };
  }
  return { workspaceAvatarUrl: url };
}
