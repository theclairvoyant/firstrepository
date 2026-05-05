import React, { useMemo, useState } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import type { ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  Search,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Mail,
  Send,
} from 'lucide-react-native';
import { ModalSheet } from '@/components/ModalSheet';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Input } from '@/components/Input';
import { Avatar } from '@/components/Avatar';
import { WorkspaceTypeBadge } from '@/components/WorkspaceTypeBadge';
import { PrimaryButton } from '@/components/PrimaryButton';
import { SecondaryButton } from '@/components/SecondaryButton';
import { GhostButton } from '@/components/GhostButton';
import { EmptyState } from '@/components/EmptyState';
import { useTheme } from '@/lib/theme/useTheme';
import { useTenantStore } from '@/lib/store/tenantStore';
import {
  useAcceptInvite,
  useCancelRequestInvite,
  useDeclineInvite,
  useMemberships,
} from '@/lib/api/queries';
import { showToast } from '@/lib/toast';
import type { WorkspaceMembership } from '@/types/api';

interface ActiveRowProps {
  membership: WorkspaceMembership;
  onPress: () => void;
}

function ActiveRow({ membership, onPress }: ActiveRowProps): React.ReactElement {
  const { spacing, colors } = useTheme();
  const { t } = useTranslation();
  const ws = membership.workspace;

  const rowStyle: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    minHeight: 64,
  };

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${ws.name}, ${ws.brand.name}, ${t('switcher.selectRow')}`}
      style={({ pressed }) => [
        rowStyle,
        { backgroundColor: pressed ? colors.bgInput : 'transparent' },
      ]}
    >
      <Avatar
        size={40}
        name={ws.name}
        uri={ws.brand.logoUrl || undefined}
        accessibilityLabel={ws.name}
      />
      <View style={{ flex: 1, gap: 2 }}>
        <ThemedText variant="heading" numberOfLines={1}>
          {ws.name}
        </ThemedText>
        <ThemedText variant="mono" tone="muted" numberOfLines={1}>
          {`@${ws.handle}`}
        </ThemedText>
      </View>
      <WorkspaceTypeBadge type={ws.type} style={{ alignSelf: 'center' }} />
      <ThemedText variant="mono" tone="muted">
        {t('switcher.postsCount', { count: membership.postCount })}
      </ThemedText>
    </Pressable>
  );
}

interface PendingCardProps {
  membership: WorkspaceMembership;
  onAccept?: () => void;
  onDecline?: () => void;
  onCancel?: () => void;
  busy: boolean;
}

function PendingCard({
  membership,
  onAccept,
  onDecline,
  onCancel,
  busy,
}: PendingCardProps): React.ReactElement {
  const { spacing, colors, accent } = useTheme();
  const { t } = useTranslation();
  const ws = membership.workspace;
  const isInvite = membership.status === 'pending_invite';

  const dotColor: string = isInvite ? accent.info : accent.warning;
  const chipLabel: string = isInvite
    ? t('switcher.pendingInvite')
    : t('switcher.pendingRequest');

  return (
    <View
      style={{
        marginHorizontal: spacing.lg,
        marginBottom: spacing.sm,
        padding: spacing.md,
        backgroundColor: colors.bgElevated,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
        gap: spacing.sm,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
        }}
      >
        <Avatar
          size={56}
          name={ws.name}
          uri={ws.brand.logoUrl || undefined}
          accessibilityLabel={ws.name}
        />
        <View style={{ flex: 1, gap: 2 }}>
          <ThemedText variant="heading" numberOfLines={1}>
            {ws.name}
          </ThemedText>
          <ThemedText variant="mono" tone="muted" numberOfLines={1}>
            {`@${ws.handle}`}
          </ThemedText>
        </View>
        <WorkspaceTypeBadge type={ws.type} style={{ alignSelf: 'center' }} />
      </View>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.xs,
        }}
      >
        <View
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: dotColor,
          }}
        />
        <ThemedText variant="caption" tone="secondary">
          {chipLabel}
        </ThemedText>
        {isInvite && membership.invitedBy ? (
          <ThemedText variant="caption" tone="muted" numberOfLines={1}>
            {t('switcher.invitedBy', { name: membership.invitedBy })}
          </ThemedText>
        ) : null}
      </View>

      {isInvite ? (
        <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs }}>
          <View style={{ flex: 1 }}>
            <SecondaryButton
              label={t('switcher.declineInvite')}
              accessibilityLabel={t('switcher.declineInvite')}
              onPress={onDecline ?? (() => {})}
              disabled={busy}
            />
          </View>
          <View style={{ flex: 1 }}>
            <PrimaryButton
              label={t('switcher.acceptInvite')}
              accessibilityLabel={t('switcher.acceptInvite')}
              onPress={onAccept ?? (() => {})}
              loading={busy}
            />
          </View>
        </View>
      ) : (
        <View style={{ marginTop: spacing.xs }}>
          <GhostButton
            label={t('switcher.cancelRequest')}
            accessibilityLabel={t('switcher.cancelRequest')}
            fullWidth
            onPress={onCancel ?? (() => {})}
          />
        </View>
      )}
    </View>
  );
}

export default function TenantSwitcherScreen(): React.ReactElement {
  const router = useRouter();
  const { t } = useTranslation();
  const { spacing, colors, accent } = useTheme();
  const [search, setSearch] = useState<string>('');
  const [pendingExpanded, setPendingExpanded] = useState<boolean>(false);

  const setActive = useTenantStore((s) => s.setActive);
  const membershipsQuery = useMemberships();
  const cancelRequest = useCancelRequestInvite();
  const acceptInvite = useAcceptInvite();
  const declineInvite = useDeclineInvite();

  const allMemberships: WorkspaceMembership[] = membershipsQuery.data ?? [];

  const handleClose = (): void => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  const filtered = useMemo<WorkspaceMembership[]>(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allMemberships;
    return allMemberships.filter((m) => {
      const brand = m.workspace.brand.name.toLowerCase();
      const ws = m.workspace.name.toLowerCase();
      const handle = m.workspace.handle.toLowerCase();
      return brand.includes(q) || ws.includes(q) || handle.includes(q);
    });
  }, [allMemberships, search]);

  const active: WorkspaceMembership[] = filtered.filter(
    (m) => m.status === 'active',
  );
  const pendingInvites: WorkspaceMembership[] = filtered.filter(
    (m) => m.status === 'pending_invite',
  );
  const pendingRequests: WorkspaceMembership[] = filtered.filter(
    (m) => m.status === 'pending_request',
  );
  const pendingCount: number = pendingInvites.length + pendingRequests.length;

  const handlePickActive = async (m: WorkspaceMembership): Promise<void> => {
    await setActive(m.workspace.id);
    if (router.canGoBack()) router.back();
    router.replace('/(tabs)/profile');
  };

  const handleCancelRequest = async (workspaceId: string): Promise<void> => {
    try {
      await cancelRequest.mutateAsync({ workspaceId });
      showToast({
        variant: 'success',
        message: t('switcher.cancelRequestDone'),
      });
    } catch {
      showToast({ variant: 'danger', message: t('common.error') });
    }
  };

  const handleAccept = async (m: WorkspaceMembership): Promise<void> => {
    try {
      const res = await acceptInvite.mutateAsync({ membershipId: m.membershipId });
      showToast({
        variant: 'success',
        message: t('switcher.acceptInviteDone', {
          name: res.membership.workspace.name,
        }),
      });
      await setActive(res.membership.workspace.id);
      if (router.canGoBack()) router.back();
      router.replace('/(tabs)/profile');
    } catch {
      showToast({ variant: 'danger', message: t('common.error') });
    }
  };

  const handleDecline = (m: WorkspaceMembership): void => {
    Alert.alert(
      t('switcher.declineConfirmTitle'),
      t('switcher.declineConfirmBody', { name: m.workspace.name }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('switcher.declineInvite'),
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                await declineInvite.mutateAsync({ membershipId: m.membershipId });
                showToast({
                  variant: 'success',
                  message: t('switcher.declineInviteDone'),
                });
              } catch {
                showToast({ variant: 'danger', message: t('common.error') });
              }
            })();
          },
        },
      ],
    );
  };

  const goAddTenant = (): void => {
    router.push('/add-tenant');
  };

  const renderEmptyZeroState = (): React.ReactElement => (
    <EmptyState
      icon={AlertCircle}
      title={t('switcher.emptyTitle')}
      description={t('switcher.emptyBody')}
      cta={
        <PrimaryButton
          label={t('switcher.addWorkspace')}
          accessibilityLabel={t('switcher.addWorkspace')}
          onPress={goAddTenant}
        />
      }
    />
  );

  const renderError = (): React.ReactElement => (
    <EmptyState
      icon={AlertCircle}
      title={t('switcher.loadError')}
      description={t('common.tryAgain')}
      cta={
        <GhostButton
          label={t('common.retry')}
          accessibilityLabel={t('common.retry')}
          fullWidth
          onPress={() => {
            void membershipsQuery.refetch();
          }}
        />
      }
    />
  );

  const renderBody = (): React.ReactElement => {
    if (membershipsQuery.isLoading) {
      return (
        <View style={{ paddingVertical: spacing.xxl, alignItems: 'center' }}>
          <ActivityIndicator color={colors.textMuted} />
        </View>
      );
    }
    if (membershipsQuery.isError) {
      return renderError();
    }
    if (allMemberships.length === 0) {
      return renderEmptyZeroState();
    }

    if (filtered.length === 0) {
      return (
        <EmptyState
          icon={Search}
          title={t('switcher.noResultsTitle')}
          description={t('switcher.noResultsBody')}
        />
      );
    }

    return (
      <View>
        {active.length > 0 ? (
          <View style={{ marginTop: spacing.md }}>
            <ThemedText
              variant="mono"
              tone="muted"
              style={{
                paddingHorizontal: spacing.lg,
                marginBottom: spacing.xs,
              }}
            >
              {t('switcher.activeSection')}
            </ThemedText>
            {active.map((m) => (
              <ActiveRow
                key={m.membershipId}
                membership={m}
                onPress={() => {
                  void handlePickActive(m);
                }}
              />
            ))}
          </View>
        ) : null}

        {pendingCount > 0 ? (
          <View style={{ marginTop: spacing.md }}>
            <Pressable
              onPress={() => setPendingExpanded((v) => !v)}
              accessibilityRole="button"
              accessibilityLabel={
                pendingExpanded
                  ? t('switcher.collapsePending')
                  : t('switcher.expandPending')
              }
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.sm,
                paddingVertical: spacing.sm,
                paddingHorizontal: spacing.lg,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              {pendingExpanded ? (
                <ChevronDown size={18} color={colors.textSecondary} strokeWidth={2} />
              ) : (
                <ChevronRight size={18} color={colors.textSecondary} strokeWidth={2} />
              )}
              <ThemedText variant="heading" style={{ flex: 1 }}>
                {t('switcher.pendingSection')}
              </ThemedText>
              <View
                style={{
                  minWidth: 22,
                  height: 22,
                  paddingHorizontal: 6,
                  borderRadius: 11,
                  backgroundColor: accent.primary,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ThemedText
                  variant="caption"
                  style={{ color: '#fff', fontWeight: '600' }}
                >
                  {String(pendingCount)}
                </ThemedText>
              </View>
            </Pressable>

            {pendingExpanded ? (
              <View style={{ marginTop: spacing.xs }}>
                {pendingInvites.length > 0 ? (
                  <View style={{ marginBottom: spacing.xs }}>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        paddingHorizontal: spacing.lg,
                        marginBottom: spacing.xs,
                      }}
                    >
                      <Mail size={14} color={colors.textMuted} strokeWidth={1.75} />
                      <ThemedText variant="mono" tone="muted">
                        {t('switcher.invitesSubsection')}
                      </ThemedText>
                    </View>
                    {pendingInvites.map((m) => (
                      <PendingCard
                        key={m.membershipId}
                        membership={m}
                        onAccept={() => {
                          void handleAccept(m);
                        }}
                        onDecline={() => handleDecline(m)}
                        busy={
                          (acceptInvite.isPending || declineInvite.isPending) &&
                          (acceptInvite.variables?.membershipId === m.membershipId ||
                            declineInvite.variables?.membershipId === m.membershipId)
                        }
                      />
                    ))}
                  </View>
                ) : null}

                {pendingRequests.length > 0 ? (
                  <View>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        paddingHorizontal: spacing.lg,
                        marginBottom: spacing.xs,
                      }}
                    >
                      <Send size={14} color={colors.textMuted} strokeWidth={1.75} />
                      <ThemedText variant="mono" tone="muted">
                        {t('switcher.requestsSubsection')}
                      </ThemedText>
                    </View>
                    {pendingRequests.map((m) => (
                      <PendingCard
                        key={m.membershipId}
                        membership={m}
                        onCancel={() => {
                          void handleCancelRequest(m.workspace.id);
                        }}
                        busy={
                          cancelRequest.isPending &&
                          cancelRequest.variables?.workspaceId === m.workspace.id
                        }
                      />
                    ))}
                  </View>
                ) : null}
              </View>
            ) : null}
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <ModalSheet
      visible
      onClose={handleClose}
      title={t('switcher.title')}
      height="90%"
    >
      <View style={{ flex: 1 }}>
        <ThemedView
          bg="bgElevated"
          style={{
            paddingHorizontal: spacing.lg,
            paddingBottom: spacing.sm,
          }}
        >
          <Input
            value={search}
            onChangeText={setSearch}
            placeholder={t('switcher.searchPlaceholder')}
            autoCapitalize="none"
            autoCorrect={false}
            leftSlot={
              <Search size={18} color={colors.textMuted} strokeWidth={1.75} />
            }
          />
        </ThemedView>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: spacing.lg }}
        >
          {renderBody()}
        </ScrollView>

        <View
          style={[
            styles.footer,
            {
              borderTopColor: colors.border,
              backgroundColor: colors.bgElevated,
              paddingHorizontal: spacing.lg,
              paddingTop: spacing.sm,
              paddingBottom: spacing.md,
            },
          ]}
        >
          <PrimaryButton
            label={t('switcher.addWorkspace')}
            accessibilityLabel={t('switcher.addWorkspace')}
            onPress={goAddTenant}
          />
        </View>
      </View>
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  footer: {
    borderTopWidth: 1,
  },
});
