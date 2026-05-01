// CTAs wrapper. Thin re-export of the workspaces CTA endpoint, kept separate so
// CTA-focused screens import from a stable single-purpose module.

import type { CTA } from '@/types/api';
import { getCTAs as getWorkspaceCTAs } from './workspaces';

export async function getCTAs(workspaceId: string): Promise<CTA[]> {
  return getWorkspaceCTAs(workspaceId);
}
