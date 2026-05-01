// Tags wrapper. Per the spec, tag topology is read at the workspace level.
// Kept separate from workspaces.ts so callers in screens that only care about tags
// can import a focused module.

import type { TagCategory } from '@/types/api';
import { getTagTopology as getTopology } from './workspaces';

export async function getTagTopology(workspaceId: string): Promise<TagCategory[]> {
  return getTopology(workspaceId);
}
