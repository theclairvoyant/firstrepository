import React, { useMemo } from 'react';
import { View, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import type { ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  CheckCircle2,
  AlertCircle,
  Settings as SettingsIcon,
  UserCog,
} from 'lucide-react-native';
import { Drawer } from '@/components/Drawer';
import { ThemedText } from '@/components/ThemedText';
import { Avatar } from '@/components/Avatar';
import { GhostButton } from '@/components/GhostButton';
import { DestructiveButton } from '@/components/DestructiveButton';
import { WorkspaceTypeBadge } from '@/components/WorkspaceTypeBadge';
import { StatusBadge } from '@/components/StatusBadge';
import { useTheme } from '@/lib/theme/useTheme';
import { useAuthStore } from '@/lib/store/authStore';
import { useTenantStore } from '@/lib/store/tenantStore';
import { useMemberships, useSignOut } from '@/lib/api/queries';
import type { WorkspaceMembership } from '@/types/api';

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return '';
  }
}

interface WorkspaceRowProps {
  membership: WorkspaceMembership;
  onPress?: () => void;
}

function WorkspaceRow({
  membership,
  onPress,
}: WorkspaceRowProps): React.ReactElement {
  const { t } = useTranslation();
  const { spacing, colors } = useTheme();
  const ws = membership.workspace;

  const rowStyle: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    minHeight: 56,
  };

  const content = (
    <>
      <Avatar
        size={40}
        name={ws.name}
        uri={ws.brand.logoUrl || undefined}
        accessibilityLabel={ws.name}
      />
      <View style={{ flex: 1, gap: 2 }}>
        <ThemedText variant="bodyMed" numberOfLines={1}>
          {ws.name}
        </ThemedText>
        <ThemedText variant="mono" tone="muted" numberOfLines={1}>
          {`@${ws.handle}`}
        </ThemedText>
      </View>
      <WorkspaceTypeBadge type={ws.type} style={{ alignSelf: 'center' }} />
      {membership.status !== 'active' ? (
        <StatusBadge
          status={
            membership.status === 'pending_invite'
              ? 'pending_invite'
              : 'pending_request'
          }
        />
      ) : null}
    </>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${ws.brand.name} ${ws.name}, ${t('globalProfile.selectWorkspace')}`}
        style={({ pressed }) => [
          rowStyle,
          { backgroundColor: pressed ? colors.bgInput : 'transparent' },
        ]}
      >
        {content}
      </Pressable>
    );
  }

  return (
    <View
      style={rowStyle}
      accessibilityRole="text"
      accessibilityLabel={`${ws.brand.name} ${ws.name}`}
    >
      {content}
    </View>
  );
}

export default function GlobalProfileScreen(): React.ReactElement {
  const router = useRouter();
  const { t } = useTranslation();
  const { spacing, colors, accent } = useTheme();
  const creator = useAuthStore((s) => s.creator);
  const authSignOut = useAuthStore((s) => s.signOut);
  const tenantClear = useTenantStore((s) => s.clear);
  const setActive = useTenantStore((s) => s.setActive);
  const membershipsQuery = useMemberships();
  const signOutMutation = useSignOut();

  const memberships: WorkspaceMembership[] = useMemberships().data ?? [];

  const sortedMemberships = useMemo<WorkspaceMembership[]>(() => {
    // Active first, then pending.
    const list = [...memberships];
    list.sort((a, b) => {
      const rank = (s: string): number =>
        s === 'active' ? 0 : s === 'pending_invite' ? 1 : 2;
      return rank(a.status) - rank(b.status);
    });
    return list;
  }, [memberships]);

  const handleClose = (): void => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  const handlePickWorkspace = async (m: WorkspaceMembership): Promise<void> => {
    if (m.status !== 'active') return;
    await setActive(m.workspace.id);
    if (router.canGoBack()) router.back();
    router.replace('/(tabs)/profile');
  };

  const handleEditProfile = (): void => {
    if (router.canGoBack()) router.back();
    router.push('/edit-global-profile');
  };

  const handleSettings = (): void => {
    if (router.canGoBack()) {
      router.back();
    }
    router.push('/settings');
  };

  const handleSignOut = async (): Promise<void> => {
    try {
      await signOutMutation.mutateAsync();
    } catch {
      // Ignore network failure on sign-out; we still clear locally.
    }
    await authSignOut();
    await tenantClear();
    if (router.canGoBack()) router.back();
    router.replace('/(auth)/welcome');
  };

  const fullName: string = creator
    ? `${creator.firstName} ${creator.lastName}`.trim()
    : '';
  const username: string = creator?.globalUsername
    ? `@${creator.globalUsername}`
    : '';
  const memberSince: string = formatDate(creator?.createdAt);
  const isVerified: boolean = !!creator?.emailVerified;

  return (
    <Drawer visible onClose={handleClose} side="right" widthPct={90}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: spacing.xl }}
      >
        {/* Header card */}
        <View
          style={{
            paddingHorizontal: spacing.lg,
            paddingTop: spacing.lg,
            paddingBottom: spacing.md,
            gap: spacing.xs,
          }}
        >
          <Avatar
            size={80}
            name={fullName || ' '}
            uri={creator?.avatarUrl || undefined}
            accessibilityLabel={fullName}
          />
          <ThemedText variant="title" style={{ marginTop: spacing.sm }}>
            {fullName}
          </ThemedText>
          {username ? (
            <ThemedText variant="monoLarge" tone="secondary">
              {username}
            </ThemedText>
          ) : null}

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.xs,
              marginTop: spacing.xs,
            }}
          >
            {isVerified ? (
              <CheckCircle2
                size={16}
                color={accent.success}
                strokeWidth={1.75}
              />
            ) : (
              <AlertCircle
                size={16}
                color={accent.warning}
                strokeWidth={1.75}
              />
            )}
            <ThemedText
              variant="caption"
              tone="secondary"
              numberOfLines={1}
              style={{ flexShrink: 1 }}
            >
              {creator?.email ?? ''}
            </ThemedText>
          </View>
          <ThemedText variant="caption" tone="muted">
            {isVerified
              ? t('globalProfile.emailVerified')
              : t('globalProfile.emailUnverified')}
          </ThemedText>

          {memberSince ? (
            <ThemedText
              variant="caption"
              tone="muted"
              style={{ marginTop: spacing.xxs }}
            >
              {t('globalProfile.memberSince', { date: memberSince })}
            </ThemedText>
          ) : null}
        </View>

        {/* My workspaces */}
        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: colors.border,
            paddingTop: spacing.md,
          }}
        >
          <ThemedText
            variant="mono"
            tone="muted"
            style={{
              paddingHorizontal: spacing.lg,
              marginBottom: spacing.xs,
            }}
          >
            {t('globalProfile.myWorkspaces')}
          </ThemedText>
          {membershipsQuery.isLoading ? (
            <View style={{ paddingVertical: spacing.lg, alignItems: 'center' }}>
              <ActivityIndicator color={colors.textMuted} />
            </View>
          ) : sortedMemberships.length === 0 ? (
            <ThemedText
              variant="body"
              tone="secondary"
              style={{
                paddingHorizontal: spacing.lg,
                paddingVertical: spacing.md,
              }}
            >
              {t('globalProfile.myWorkspacesEmpty')}
            </ThemedText>
          ) : (
            sortedMemberships.map((m) => (
              <WorkspaceRow
                key={m.membershipId}
                membership={m}
                onPress={
                  m.status === 'active'
                    ? () => {
                        void handlePickWorkspace(m);
                      }
                    : undefined
                }
              />
            ))
          )}
        </View>

        {/* Account */}
        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: colors.border,
            paddingTop: spacing.md,
            marginTop: spacing.md,
            paddingHorizontal: spacing.lg,
            gap: spacing.xs,
          }}
        >
          <ThemedText
            variant="mono"
            tone="muted"
            style={{ marginBottom: spacing.xs }}
          >
            {t('globalProfile.account')}
          </ThemedText>
          <GhostButton
            label={t('globalProfile.editProfile')}
            accessibilityLabel={t('globalProfile.editProfile')}
            fullWidth
            onPress={handleEditProfile}
            leftIcon={
              <UserCog size={18} color={colors.textPrimary} strokeWidth={1.75} />
            }
          />
          <GhostButton
            label={t('globalProfile.settings')}
            accessibilityLabel={t('globalProfile.settings')}
            fullWidth
            onPress={handleSettings}
            leftIcon={
              <SettingsIcon
                size={18}
                color={colors.textPrimary}
                strokeWidth={1.75}
              />
            }
          />
          <View style={{ marginTop: spacing.sm }}>
            <DestructiveButton
              label={t('globalProfile.signOut')}
              accessibilityLabel={t('globalProfile.signOut')}
              loading={signOutMutation.isPending}
              onPress={() => {
                void handleSignOut();
              }}
            />
          </View>
        </View>
      </ScrollView>
    </Drawer>
  );
}
