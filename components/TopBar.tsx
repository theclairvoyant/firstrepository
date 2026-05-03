import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import type { ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronDown } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/lib/theme/useTheme';
import { useTenantStore } from '@/lib/store/tenantStore';
import { useAuthStore } from '@/lib/store/authStore';
import { useWorkspace } from '@/lib/api/queries';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import { Avatar } from './Avatar';
import { WorkspaceTypeBadge } from './WorkspaceTypeBadge';

export interface TopBarProps {
  onTenantPress: () => void;
  onProfilePress: () => void;
}

const TRIGGER_HEIGHT = 56;
const BRAND_AVATAR_SIZE = 32;
const AVATAR_SIZE = 32;
const ICON_SIZE = 18;

export function TopBar({
  onTenantPress,
  onProfilePress,
}: TopBarProps): React.ReactElement {
  const { colors, spacing, radius, accent } = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const switchWorkspaceLabel: string = t('shell.topBar.switchWorkspace', {
    defaultValue: 'switch workspace',
  });
  const openProfileLabel: string = t('shell.topBar.openProfile', {
    defaultValue: 'open profile menu',
  });
  const noWorkspaceLabel: string = t('shell.topBar.noWorkspace', {
    defaultValue: 'No workspace selected',
  });
  const activeWorkspaceId = useTenantStore((s) => s.activeWorkspaceId);
  const isHydrated = useTenantStore((s) => s.isHydrated);
  const creator = useAuthStore((s) => s.creator);

  const workspaceQuery = useWorkspace(activeWorkspaceId);
  const workspace = workspaceQuery.data;
  const isLoading =
    !isHydrated ||
    (!!activeWorkspaceId && workspaceQuery.isLoading);

  const initials: string = (() => {
    if (!creator) return 'EC';
    const first = creator.firstName?.[0] ?? '';
    const last = creator.lastName?.[0] ?? '';
    const combined = `${first}${last}`.trim();
    return combined.length > 0 ? combined.toUpperCase() : 'EC';
  })();

  const avatarName: string =
    creator && (creator.firstName || creator.lastName)
      ? `${creator.firstName} ${creator.lastName}`.trim()
      : initials;

  const brandRingColor: string = workspace
    ? accent[workspace.type]
    : colors.border;

  const containerStyle: ViewStyle = {
    paddingTop: insets.top,
    backgroundColor: colors.bgElevated,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  };

  const triggerStyle: ViewStyle = {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    height: TRIGGER_HEIGHT,
    gap: spacing.xs,
  };

  const skeletonStyle: ViewStyle = {
    flex: 1,
    height: TRIGGER_HEIGHT - spacing.md,
    marginVertical: spacing.xs,
    marginLeft: spacing.md,
    marginRight: spacing.xs,
    borderRadius: radius.sm,
  };

  return (
    <View style={containerStyle}>
      <View style={styles.row}>
        {isLoading ? (
          <View
            accessibilityRole="button"
            accessibilityLabel={switchWorkspaceLabel}
            style={[styles.rowFlex]}
          >
            <ThemedView bg="bgInput" style={skeletonStyle} />
          </View>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={switchWorkspaceLabel}
            onPress={onTenantPress}
            style={({ pressed }) => [
              triggerStyle,
              pressed ? styles.pressed : null,
            ]}
            hitSlop={4}
          >
            {workspace ? (
              <>
                <View
                  style={{
                    padding: 2,
                    borderRadius: (BRAND_AVATAR_SIZE + 4) / 2,
                    borderWidth: 1.5,
                    borderColor: brandRingColor,
                  }}
                >
                  <Avatar
                    size={BRAND_AVATAR_SIZE}
                    name={workspace.brand.name}
                    uri={workspace.brand.logoUrl || undefined}
                    accessibilityLabel={workspace.brand.name}
                  />
                </View>
                <View style={styles.workspaceTextWrap}>
                  <ThemedText
                    variant="heading"
                    numberOfLines={1}
                    ellipsizeMode="tail"
                    accessibilityLabel={`${workspace.brand.name} ${workspace.name}`}
                  >
                    {workspace.name}
                  </ThemedText>
                  <ThemedText
                    variant="caption"
                    tone="muted"
                    numberOfLines={1}
                  >
                    {workspace.brand.name}
                  </ThemedText>
                </View>
                <WorkspaceTypeBadge type={workspace.type} />
                <ChevronDown
                  size={ICON_SIZE}
                  strokeWidth={1.75}
                  color={colors.textSecondary}
                />
              </>
            ) : (
              <>
                <ThemedText variant="heading">{noWorkspaceLabel}</ThemedText>
                <View style={styles.spacer} />
                <ChevronDown
                  size={ICON_SIZE}
                  strokeWidth={1.75}
                  color={colors.textSecondary}
                />
              </>
            )}
          </Pressable>
        )}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={openProfileLabel}
          onPress={onProfilePress}
          hitSlop={8}
          style={({ pressed }) => [
            {
              minWidth: 44,
              minHeight: 44,
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: spacing.md,
            },
            pressed ? styles.pressed : null,
          ]}
        >
          <Avatar
            size={AVATAR_SIZE}
            uri={creator?.avatarUrl || undefined}
            name={avatarName}
          />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowFlex: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  workspaceTextWrap: {
    flex: 1,
    flexShrink: 1,
    justifyContent: 'center',
  },
  spacer: {
    flex: 1,
  },
  pressed: {
    opacity: 0.7,
  },
});
