import React, { useMemo, useState } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import type { ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Search, AlertCircle } from 'lucide-react-native';
import { ModalSheet } from '@/components/ModalSheet';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Input } from '@/components/Input';
import { Avatar } from '@/components/Avatar';
import { WorkspaceTypeBadge } from '@/components/WorkspaceTypeBadge';
import { StatusBadge } from '@/components/StatusBadge';
import { PrimaryButton } from '@/components/PrimaryButton';
import { GhostButton } from '@/components/GhostButton';
import { EmptyState } from '@/components/EmptyState';
import { useTheme } from '@/lib/theme/useTheme';
import { useTenantStore } from '@/lib/store/tenantStore';
import { useMemberships, useCancelRequestInvite } from '@/lib/api/queries';
import { showToast } from '@/lib/toast';
import type { WorkspaceMembership } from '@/types/api';

interface RowProps {
  membership: WorkspaceMembership;
  onPress?: () => void;
  rightSlot?: React.ReactNode;
}

function MembershipRow({
  membership,
  onPress,
  rightSlot,
}: RowProps): React.ReactElement {
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

  const accessibilityLabel: string = `${ws.name}, ${ws.brand.name}, ${t('switcher.selectRow')}`;

  const content = (
    <>
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
      {rightSlot ? <View style={{ alignItems: 'flex-end' }}>{rightSlot}</View> : null}
    </>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
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

export default function TenantSwitcherScreen(): React.ReactElement {
  const router = useRouter();
  const { t } = useTranslation();
  const { spacing, colors } = useTheme();
  const [search, setSearch] = useState<string>('');

  const setActive = useTenantStore((s) => s.setActive);
  const membershipsQuery = useMemberships();
  const cancelRequest = useCancelRequestInvite();

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
  const pending: WorkspaceMembership[] = filtered.filter(
    (m) => m.status === 'pending_invite' || m.status === 'pending_request',
  );

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
              style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.xs }}
            >
              {t('switcher.activeSection')}
            </ThemedText>
            {active.map((m) => (
              <MembershipRow
                key={m.membershipId}
                membership={m}
                onPress={() => {
                  void handlePickActive(m);
                }}
                rightSlot={
                  <ThemedText variant="mono" tone="muted">
                    {t('switcher.postsCount', { count: m.postCount })}
                  </ThemedText>
                }
              />
            ))}
          </View>
        ) : null}

        {pending.length > 0 ? (
          <View style={{ marginTop: spacing.md }}>
            <ThemedText
              variant="mono"
              tone="muted"
              style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.xs }}
            >
              {t('switcher.pendingSection')}
            </ThemedText>
            {pending.map((m) => (
              <View key={m.membershipId}>
                <MembershipRow
                  membership={m}
                  rightSlot={
                    <StatusBadge
                      status={
                        m.status === 'pending_invite'
                          ? 'pending_invite'
                          : 'pending_request'
                      }
                      label={
                        m.status === 'pending_invite'
                          ? t('switcher.pendingInvite')
                          : t('switcher.pendingRequest')
                      }
                    />
                  }
                />
                {m.status === 'pending_request' ? (
                  <View
                    style={{
                      paddingHorizontal: spacing.lg,
                      paddingBottom: spacing.xs,
                    }}
                  >
                    <GhostButton
                      label={t('switcher.cancelRequest')}
                      accessibilityLabel={t('switcher.cancelRequest')}
                      onPress={() => {
                        void handleCancelRequest(m.workspace.id);
                      }}
                    />
                  </View>
                ) : null}
              </View>
            ))}
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
