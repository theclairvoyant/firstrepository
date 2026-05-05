// Typed wrappers for invites, discovery, and request-invite endpoints.

import { MOCK_API } from './config';
import { httpDelete, httpGet, httpPost } from './client';
import * as mock from './mocks/tenants';
import type {
  AcceptInviteResponse,
  CancelRequestInviteResponse,
  DeclineInviteResponse,
  DiscoveryByDomainResponse,
  RedeemInviteResponse,
  RequestInviteResponse,
  ResolveInviteResponse,
} from '@/types/api';

export async function resolveInvite(code: string): Promise<ResolveInviteResponse> {
  if (MOCK_API) return mock.resolveInvite(code);
  return httpPost<ResolveInviteResponse>('/v1/invites/resolve', { code });
}

export async function redeemInvite(code: string): Promise<RedeemInviteResponse> {
  if (MOCK_API) return mock.redeemInvite(code);
  return httpPost<RedeemInviteResponse>('/v1/invites/redeem', { code });
}

export async function byDomain(): Promise<DiscoveryByDomainResponse> {
  if (MOCK_API) return mock.byDomain();
  return httpGet<DiscoveryByDomainResponse>('/v1/discovery/by-domain');
}

export async function requestInvite(workspaceId: string): Promise<RequestInviteResponse> {
  if (MOCK_API) return mock.requestInvite(workspaceId);
  return httpPost<RequestInviteResponse>(`/v1/workspaces/${workspaceId}/request-invite`);
}

export async function cancelRequestInvite(
  workspaceId: string,
): Promise<CancelRequestInviteResponse> {
  if (MOCK_API) return mock.cancelRequestInvite(workspaceId);
  return httpDelete<CancelRequestInviteResponse>(
    `/v1/workspaces/${workspaceId}/request-invite`,
  );
}

export async function acceptInvite(
  membershipId: string,
): Promise<AcceptInviteResponse> {
  if (MOCK_API) return mock.acceptInvite(membershipId);
  return httpPost<AcceptInviteResponse>(
    `/v1/memberships/${membershipId}/accept`,
  );
}

export async function declineInvite(
  membershipId: string,
): Promise<DeclineInviteResponse> {
  if (MOCK_API) return mock.declineInvite(membershipId);
  return httpPost<DeclineInviteResponse>(
    `/v1/memberships/${membershipId}/decline`,
  );
}
