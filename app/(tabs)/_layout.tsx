import React, { useMemo } from 'react';
import { Pressable, View, StyleSheet, Platform } from 'react-native';
import type { GestureResponderEvent, ViewStyle } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { Plus, User } from 'lucide-react-native';
import { TopBar } from '@/components/TopBar';
import { useTheme } from '@/lib/theme/useTheme';
import { useTenantStore } from '@/lib/store/tenantStore';
import { useMemberships } from '@/lib/api/queries';

const ICON_SIZE = 22;
// Identical diameter for both tab buttons so they read as a balanced pair
// inside the floating bar.
const TAB_DISC = 40;
const TAB_HEIGHT = 56;
const PILL_RADIUS = 999;
// Active tab indicator background uses accent.primary with 16% alpha
// (0x29 / 0xff approx 0.16).
const ACTIVE_TINT_ALPHA_HEX = '29';

interface TabBarBackgroundProps {
  isDark: boolean;
  bgFallback: string;
  borderColor: string;
}

function TabBarBackground({
  isDark,
  bgFallback,
  borderColor,
}: TabBarBackgroundProps): React.ReactElement {
  const fillStyle: ViewStyle = {
    ...StyleSheet.absoluteFillObject,
    borderRadius: PILL_RADIUS,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor,
  };

  if (Platform.OS === 'web') {
    return (
      <View
        style={[fillStyle, { backgroundColor: `${bgFallback}eb` }]}
      />
    );
  }

  return (
    <View style={fillStyle}>
      <BlurView
        intensity={80}
        tint={isDark ? 'dark' : 'light'}
        style={StyleSheet.absoluteFillObject}
      />
      <View
        style={[StyleSheet.absoluteFillObject, { backgroundColor: `${bgFallback}66` }]}
      />
    </View>
  );
}

// Subset of the props React Navigation passes to tabBarButton. Typing
// loosely on purpose so the layout owns the press behaviour and we don't
// fight the upstream PressableProps signature (which differs from
// Pressable's by including legacy fields).
interface TabBarButtonRenderProps {
  onPress: (e: GestureResponderEvent) => void;
  accessibilityLabel?: string;
  accessibilityState?: { selected?: boolean };
  testID?: string;
  children?: React.ReactNode;
}

interface DiscButtonProps {
  rnProps: TabBarButtonRenderProps;
  bg: string;
  children: React.ReactNode;
}

// Single, predictable button: fills the full tab item, perfectly centers a
// 40px disc. We render the disc ourselves so React Navigation's icon-area
// padding never gets to push it around.
function DiscButton({
  rnProps,
  bg,
  children,
}: DiscButtonProps): React.ReactElement {
  return (
    <Pressable
      onPress={rnProps.onPress}
      accessibilityRole="button"
      accessibilityLabel={rnProps.accessibilityLabel}
      accessibilityState={rnProps.accessibilityState}
      testID={rnProps.testID}
      style={({ pressed }) => [
        styles.tabButton,
        { opacity: pressed ? 0.75 : 1 },
      ]}
    >
      <View style={[styles.disc, { backgroundColor: bg }]}>{children}</View>
    </Pressable>
  );
}

export default function TabsLayout(): React.ReactElement {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors, accent, palette, spacing, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const activeWorkspaceId = useTenantStore((s) => s.activeWorkspaceId);
  const membershipsQuery = useMemberships();

  const activeMembership = useMemo(() => {
    if (!activeWorkspaceId) return null;
    const list = membershipsQuery.data ?? [];
    return list.find((m) => m.workspace.id === activeWorkspaceId) ?? null;
  }, [activeWorkspaceId, membershipsQuery.data]);

  const showUpload: boolean =
    !!activeMembership && activeMembership.status === 'active';

  const tabBarStyle: ViewStyle = {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: insets.bottom + spacing.sm,
    height: TAB_HEIGHT,
    backgroundColor: 'transparent',
    borderTopWidth: 0,
    elevation: 0,
    paddingBottom: 0,
    paddingTop: 0,
    borderRadius: PILL_RADIUS,
  };

  return (
    <Tabs
      initialRouteName="profile"
      screenOptions={{
        header: () => (
          <TopBar
            onTenantPress={() => router.push('/tenant-switcher')}
            onProfilePress={() => router.push('/global-profile')}
          />
        ),
        tabBarActiveTintColor: accent.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarShowLabel: false,
        tabBarStyle,
        tabBarItemStyle: { height: TAB_HEIGHT },
        tabBarBackground: () => (
          <TabBarBackground
            isDark={isDark}
            bgFallback={colors.bgElevated}
            borderColor={colors.border}
          />
        ),
      }}
    >
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabs.profile'),
          tabBarAccessibilityLabel: t('tabs.profile'),
          tabBarLabel: () => null,
          tabBarButton: (props) => {
            const focused = props.accessibilityState?.selected ?? false;
            const tint = focused ? accent.primary : colors.textMuted;
            const bg = focused
              ? `${accent.primary}${ACTIVE_TINT_ALPHA_HEX}`
              : colors.bgInput;
            return (
              <DiscButton
                rnProps={{
                  onPress: (e: GestureResponderEvent) => {
                    props.onPress?.(e);
                  },
                  accessibilityLabel: props.accessibilityLabel,
                  accessibilityState: props.accessibilityState,
                  testID: props.testID,
                }}
                bg={bg}
              >
                <User size={ICON_SIZE} color={tint} strokeWidth={1.75} />
              </DiscButton>
            );
          },
        }}
      />
      <Tabs.Screen
        name="upload"
        options={{
          title: t('tabs.upload'),
          tabBarAccessibilityLabel: t('tabs.upload'),
          tabBarLabel: () => null,
          // href + tabBarButton can't coexist (expo-router throws). Hide the
          // upload tab by collapsing its item slot when there is no active
          // membership instead.
          tabBarItemStyle: {
            height: TAB_HEIGHT,
            display: showUpload ? 'flex' : 'none',
          },
          tabBarButton: (props) => (
            <DiscButton
              rnProps={{
                onPress: (e: GestureResponderEvent) => {
                  props.onPress?.(e);
                },
                accessibilityLabel: props.accessibilityLabel,
                accessibilityState: props.accessibilityState,
                testID: props.testID,
              }}
              bg={accent.primary}
            >
              <Plus size={22} color={palette.white} strokeWidth={2} />
            </DiscButton>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  // Fill the entire tab item; center the disc absolutely.
  tabButton: {
    flex: 1,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
  },
  disc: {
    width: TAB_DISC,
    height: TAB_DISC,
    borderRadius: TAB_DISC / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
