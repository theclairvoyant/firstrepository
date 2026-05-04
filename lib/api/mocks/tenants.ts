// Mock /v1/invites/*, /v1/discovery/*, /v1/workspaces/{id}/request-invite.

import { ApiError } from '@/types/api';
import type {
  CancelRequestInviteResponse,
  DiscoveryByDomainResponse,
  RedeemInviteResponse,
  RequestInviteResponse,
  ResolveInviteResponse,
  WorkspaceMembership,
} from '@/types/api';
import {
  findWorkspace,
  seedState,
  simulateLatency,
  writePersistedHasJoinedAnyWorkspace,
} from './__seed';

export async function resolveInvite(code: string): Promise<ResolveInviteResponse> {
  await simulateLatency(280);
  if (code === 'expired') {
    throw new ApiError({
      code: 'INVITE_EXPIRED',
      message: 'This invite has expired.',
      status: 410,
    });
  }
  if (code === 'used') {
    throw new ApiError({
      code: 'INVITE_ALREADY_USED',
      message: 'This invite has already been redeemed.',
      status: 409,
    });
  }
  // Default: invite resolves to the Globex workspace.
  const ws = findWorkspace('ws_skills_globex');
  if (!ws) {
    throw new ApiError({ code: 'NOT_FOUND', message: 'Workspace not found.', status: 404 });
  }
  return {
    brand: ws.brand,
    workspace: ws,
    requiresVerification: false,
  };
}

export async function redeemInvite(_code: string): Promise<RedeemInviteResponse> {
  await simulateLatency(320);
  // Flip pending_invite for Globex into active, then return the membership.
  const idx = seedState.memberships.findIndex((m) => m.workspace.id === 'ws_skills_globex');
  if (idx < 0) {
    throw new ApiError({ code: 'NOT_FOUND', message: 'Membership not found.', status: 404 });
  }
  const updated: WorkspaceMembership = {
    ...seedState.memberships[idx],
    status: 'active',
    workspaceUsername: 'kiran.globex',
    joinedAt: new Date().toISOString(),
  };
  seedState.memberships[idx] = updated;
  // First join releases the rest of the seeded memberships from the empty
  // state gate.
  seedState.hasJoinedAnyWorkspace = true;
  await writePersistedHasJoinedAnyWorkspace(true);
  return { membership: updated };
}

export async function byDomain(): Promise<DiscoveryByDomainResponse> {
  await simulateLatency(260);
  const ws = findWorkspace('ws_skills_globex');
  if (!ws) {
    return { workspaces: [] };
  }
  return {
    workspaces: [
      {
        workspace: ws,
        joinPolicy: 'request',
        autoJoined: false,
      },
    ],
  };
}

export async function requestInvite(workspaceId: string): Promise<RequestInviteResponse> {
  await simulateLatency(300);
  const ws = findWorkspace(workspaceId);
  if (!ws) {
    throw new ApiError({ code: 'NOT_FOUND', message: 'Workspace not found.', status: 404 });
  }
  // Append a new pending_request membership if not already present.
  const idx = seedState.memberships.findIndex((m) => m.workspace.id === workspaceId);
  const membership: WorkspaceMembership = {
    membershipId: `mem_request_${workspaceId}`,
    workspace: ws,
    status: 'pending_request',
    workspaceUsername: '',
    workspaceAvatarUrl: '',
    bio: '',
    postCount: 0,
    totalViews: 0,
    totalClicks: 0,
    totalLikes: 0,
    joinedAt: null,
  };
  // Requesting an invite also releases the no-workspace gate so the user
  // can see their pending state in the UI.
  seedState.hasJoinedAnyWorkspace = true;
  await writePersistedHasJoinedAnyWorkspace(true);
  if (idx >= 0) {
    seedState.memberships[idx] = { ...seedState.memberships[idx], status: 'pending_request' };
    return { membership: seedState.memberships[idx] };
  }
  seedState.memberships.push(membership);
  return { membership };
}

export async function cancelRequestInvite(workspaceId: string): Promise<CancelRequestInviteResponse> {
  await simulateLatency(240);
  const idx = seedState.memberships.findIndex(
    (m) => m.workspace.id === workspaceId && m.status === 'pending_request',
  );
  if (idx >= 0) {
    seedState.memberships.splice(idx, 1);
  }
  return { ok: true };
}
