import * as Linking from 'expo-linking';

export type DeeplinkIntent =
  | { kind: 'workspace'; workspaceId: string }
  | { kind: 'workspaceUser'; workspaceId: string; username: string }
  | { kind: 'post'; postId: string }
  | { kind: 'invite'; code: string };

export const SCHEME = 'enterprisecreator';

const VALID_ID = /^[A-Za-z0-9_-]+$/;
const VALID_USERNAME = /^[A-Za-z0-9._-]+$/;
const VALID_INVITE = /^[A-Z2-9]{8}$/;

export function parseDeeplinkUrl(url: string): DeeplinkIntent | null {
  if (!url) return null;
  const parsed = Linking.parse(url);

  if (parsed.scheme && parsed.scheme !== SCHEME) {
    return null;
  }

  const segments: string[] = [];
  if (parsed.hostname) segments.push(parsed.hostname);
  if (parsed.path) {
    for (const seg of parsed.path.split('/')) {
      if (seg) segments.push(seg);
    }
  }

  if (segments.length === 0) return null;

  const [head, ...rest] = segments;

  if (head === 'w' && rest.length === 1 && VALID_ID.test(rest[0])) {
    return { kind: 'workspace', workspaceId: rest[0] };
  }

  if (
    head === 'w' &&
    rest.length === 3 &&
    VALID_ID.test(rest[0]) &&
    rest[1] === 'u' &&
    VALID_USERNAME.test(rest[2])
  ) {
    return { kind: 'workspaceUser', workspaceId: rest[0], username: rest[2] };
  }

  if (head === 'post' && rest.length === 1 && VALID_ID.test(rest[0])) {
    return { kind: 'post', postId: rest[0] };
  }

  if (head === 'invite' && rest.length === 1 && VALID_INVITE.test(rest[0])) {
    return { kind: 'invite', code: rest[0] };
  }

  return null;
}

export function buildWorkspaceUrl(workspaceId: string): string {
  return `${SCHEME}://w/${workspaceId}`;
}

export function buildWorkspaceUserUrl(workspaceId: string, username: string): string {
  return `${SCHEME}://w/${workspaceId}/u/${username}`;
}

export function buildPostUrl(postId: string): string {
  return `${SCHEME}://post/${postId}`;
}

export function buildInviteUrl(code: string): string {
  return `${SCHEME}://invite/${code}`;
}
