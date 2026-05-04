// Settings -> Default workspace. Lets the user pick which workspace the
// app opens on at boot, overriding the most-recent fallback. Only active
// memberships are eligible; pending invites / requests are skipped.

import React, { useCallback } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Check, ChevronLeft } from 'lucide-react-native';
import { Avatar } from '@/components/Avatar';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { ScreenContainer } from '@/components/ScreenContainer';
import { ThemedText } from '@/components/ThemedText';
import { WorkspaceTypeBadge } from '@/components/WorkspaceTypeBadge';
import { useTheme } from '@/lib/theme/useTheme';
import { useTenantStore } from '@/lib/store/tenantStore';
import { useMemberships } from '@/lib/api/queries';
import type { WorkspaceMembership } from '@/types/api';
import { Building2 } from 'lucide-react-native';

export default function DefaultWorkspaceSettingsScreen(): React.ReactElement {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors, spacing, accent } = useTheme();

  const defaultWorkspaceId = useTenantStore((s) => s.defaultWorkspaceId);
  const setDefault = useTenantStore((s) => s.setDefault);
  const membershipsQuery = useMemberships();

  const all: WorkspaceMembership[] = membershipsQuery.data ?? [];
  const active = all.filter((m) => m.status === 'active');

  const handleBack = useCallback((): void => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/settings');
    }
  }, [router]);

  const handleSelect = useCallback(
    (membership: WorkspaceMembership | null): void => {
      void setDefault(membership ? membership.workspace.id : null);
    },
    [setDefault],
  );

  return (
    <ScreenContainer>
      <View
        style={[
          styles.header,
          {
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          onPress={handleBack}
          hitSlop={8}
          style={({ pressed }) => [
            styles.headerButton,
            { opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <ChevronLeft
            size={24}
            color={colors.textPrimary}
            strokeWidth={1.75}
          />
        </Pressable>
        <View style={styles.headerTitleWrap}>
          <ThemedText variant="heading" tone="primary">
            {t('settings.defaultWorkspace.title')}
          </ThemedText>
        </View>
        <View style={styles.headerButton} />
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.md,
          paddingTop: spacing.lg,
          paddingBottom: spacing.xl,
          gap: spacing.md,
        }}
      >
        <ThemedText variant="body" tone="secondary">
          {t('settings.defaultWorkspace.body')}
        </ThemedText>

        {active.length === 0 ? (
          <EmptyState
            icon={Building2}
            title={t('settings.defaultWorkspace.emptyTitle')}
            description={t('settings.defaultWorkspace.emptyBody')}
          />
        ) : (
          <Card padded={false}>
            <Row
              label={t('settings.defaultWorkspace.useMostRecent')}
              sublabel={t('settings.defaultWorkspace.useMostRecentBody')}
              selected={defaultWorkspaceId === null}
              onPress={() => handleSelect(null)}
              isFirst
            />
            {active.map((m) => (
              <Row
                key={m.membershipId}
                label={m.workspace.name}
                sublabel={`@${m.workspace.handle}`}
                avatarUri={m.workspace.brand.logoUrl || undefined}
                rightSlot={
                  <WorkspaceTypeBadge
                    type={m.workspace.type}
                    style={{ alignSelf: 'center' }}
                  />
                }
                selected={defaultWorkspaceId === m.workspace.id}
                onPress={() => handleSelect(m)}
              />
            ))}
          </Card>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

interface RowProps {
  label: string;
  sublabel?: string;
  avatarUri?: string;
  rightSlot?: React.ReactNode;
  selected: boolean;
  onPress: () => void;
  isFirst?: boolean;
}

function Row({
  label,
  sublabel,
  avatarUri,
  rightSlot,
  selected,
  onPress,
  isFirst,
}: RowProps): React.ReactElement {
  const { colors, accent, spacing } = useTheme();
  return (
    <>
      {!isFirst ? (
        <View
          style={[
            styles.divider,
            { backgroundColor: colors.border, marginLeft: avatarUri ? 60 : 16 },
          ]}
        />
      ) : null}
      <Pressable
        accessibilityRole="radio"
        accessibilityState={{ selected }}
        accessibilityLabel={label}
        onPress={onPress}
        style={({ pressed }) => [
          styles.row,
          {
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
            backgroundColor: pressed ? colors.bgInput : 'transparent',
          },
        ]}
      >
        {avatarUri !== undefined ? (
          <Avatar size={32} uri={avatarUri} name={label} />
        ) : null}
        <View style={{ flex: 1, marginLeft: avatarUri ? 12 : 0, gap: 2 }}>
          <ThemedText variant="body" tone="primary" numberOfLines={1}>
            {label}
          </ThemedText>
          {sublabel ? (
            <ThemedText variant="caption" tone="muted" numberOfLines={1}>
              {sublabel}
            </ThemedText>
          ) : null}
        </View>
        {rightSlot ?? null}
        {selected ? (
          <Check
            size={20}
            color={accent.primary}
            strokeWidth={2}
            style={{ marginLeft: 8 }}
          />
        ) : null}
      </Pressable>
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    minHeight: 48,
  },
  headerButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: {
    flex: 1,
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
  },
  divider: {
    height: 1,
  },
});
