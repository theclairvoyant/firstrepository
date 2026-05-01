import React, { useMemo } from 'react';
import { View, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Building2 } from 'lucide-react-native';
import { ScreenContainer } from '@/components/ScreenContainer';
import { ThemedText } from '@/components/ThemedText';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { PrimaryButton } from '@/components/PrimaryButton';
import { WorkspaceTypeBadge } from '@/components/WorkspaceTypeBadge';
import { Avatar } from '@/components/Avatar';
import { useTheme } from '@/lib/theme/useTheme';
import { useTenantStore } from '@/lib/store/tenantStore';
import { useMemberships, useWorkspace } from '@/lib/api/queries';

export default function ProfileTabScreen(): React.ReactElement {
  const router = useRouter();
  const { t } = useTranslation();
  const { spacing, colors } = useTheme();

  const activeWorkspaceId = useTenantStore((s) => s.activeWorkspaceId);
  const isHydrated = useTenantStore((s) => s.isHydrated);
  const workspaceQuery = useWorkspace(activeWorkspaceId);
  const membershipsQuery = useMemberships();

  const membership = useMemo(() => {
    if (!activeWorkspaceId) return null;
    const list = membershipsQuery.data ?? [];
    return list.find((m) => m.workspace.id === activeWorkspaceId) ?? null;
  }, [activeWorkspaceId, membershipsQuery.data]);

  const isLoading: boolean =
    !isHydrated ||
    (!!activeWorkspaceId &&
      (workspaceQuery.isLoading || membershipsQuery.isLoading));

  if (isLoading) {
    return (
      <ScreenContainer padded edges={['left', 'right']}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.textMuted} />
        </View>
      </ScreenContainer>
    );
  }

  if (!activeWorkspaceId || !workspaceQuery.data) {
    return (
      <ScreenContainer padded edges={['left', 'right']}>
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <EmptyState
            icon={Building2}
            title={t('profileTab.noWorkspaceTitle')}
            description={t('profileTab.noWorkspaceBody')}
            cta={
              <PrimaryButton
                label={t('profileTab.findWorkspace')}
                accessibilityLabel={t('profileTab.findWorkspace')}
                onPress={() => router.push('/add-tenant')}
              />
            }
          />
        </View>
      </ScreenContainer>
    );
  }

  const workspace = workspaceQuery.data;
  const postCount: number = membership?.postCount ?? 0;

  return (
    <ScreenContainer padded edges={['left', 'right']}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingVertical: spacing.lg, gap: spacing.md }}
      >
        <ThemedText variant="title">{t('profileTab.title')}</ThemedText>

        <Card>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.md,
            }}
          >
            <Avatar
              size={56}
              name={workspace.brand.name}
              uri={workspace.brand.logoUrl || undefined}
              accessibilityLabel={workspace.brand.name}
            />
            <View style={{ flex: 1, gap: spacing.xxs }}>
              <ThemedText variant="heading" numberOfLines={1}>
                {workspace.brand.name}
              </ThemedText>
              <ThemedText variant="body" tone="secondary" numberOfLines={1}>
                {workspace.name}
              </ThemedText>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xxs }}>
                <WorkspaceTypeBadge type={workspace.type} />
                <ThemedText variant="mono" tone="muted">
                  {t('profileTab.postsCount', { count: postCount })}
                </ThemedText>
              </View>
            </View>
          </View>
        </Card>
      </ScrollView>
    </ScreenContainer>
  );
}
