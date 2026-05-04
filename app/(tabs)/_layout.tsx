import React, { useEffect, useMemo } from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Plus, Settings as SettingsIcon, User } from 'lucide-react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { FrostedSurface } from '@/components/FrostedSurface';
import { TopBar } from '@/components/TopBar';
import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/lib/theme/useTheme';
import { useTenantStore } from '@/lib/store/tenantStore';
import { useMemberships } from '@/lib/api/queries';

// Visual constants. Each tab cell is the same width so the indicator slides
// cleanly to the next slot. Settings is a sibling circle on the right.
const TAB_CELL_WIDTH = 88;
const TAB_CELL_HEIGHT = 56;
const PILL_INNER_PADDING = 4;
const PILL_RADIUS = 999;
const SETTINGS_DIAMETER = 56;
const SIDE_GAP = 12;
// Active indicator background: accent.primary at ~24% alpha. Heavier than the
// previous 16% so the focused tab pops more clearly against the glass pill.
const INDICATOR_ALPHA_HEX = '3D';

interface CustomTabBarProps extends BottomTabBarProps {
  showUpload: boolean;
}

function CustomTabBar({
  state,
  navigation,
  showUpload,
}: CustomTabBarProps): React.ReactElement {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors, accent, palette } = useTheme();
  const insets = useSafeAreaInsets();

  // Visible routes drive both the pill width and the indicator step. When
  // upload is hidden (no active workspace), the pill collapses to a single
  // Profile tab, so the indicator stays parked.
  const visibleRoutes = useMemo(() => {
    return state.routes.filter((r) => {
      if (r.name === 'upload' && !showUpload) return false;
      return true;
    });
  }, [state.routes, showUpload]);

  // Map back to the focused index within the visible set so the indicator
  // animates to the correct slot even after upload appears or disappears.
  const focusedVisibleIndex = useMemo(() => {
    const focusedRoute = state.routes[state.index];
    if (!focusedRoute) return 0;
    const i = visibleRoutes.findIndex((r) => r.key === focusedRoute.key);
    return i < 0 ? 0 : i;
  }, [state.index, state.routes, visibleRoutes]);

  const slide = useSharedValue<number>(focusedVisibleIndex);
  useEffect(() => {
    slide.value = withSpring(focusedVisibleIndex, {
      damping: 20,
      stiffness: 220,
      mass: 0.8,
    });
  }, [focusedVisibleIndex, slide]);

  const indicatorStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: slide.value * TAB_CELL_WIDTH }],
    };
  });

  const pillContentWidth = visibleRoutes.length * TAB_CELL_WIDTH;
  const pillTotalWidth = pillContentWidth + PILL_INNER_PADDING * 2;

  return (
    <View
      style={[
        styles.row,
        {
          left: SIDE_GAP,
          right: SIDE_GAP,
          bottom: insets.bottom + 12,
        },
      ]}
      pointerEvents="box-none"
    >
      {/* Left pill */}
      <View
        style={[
          styles.pillWrap,
          { width: pillTotalWidth, height: TAB_CELL_HEIGHT + PILL_INNER_PADDING * 2 },
        ]}
      >
        <FrostedSurface borderRadius={PILL_RADIUS} />
        <View
          style={[
            styles.pillContent,
            {
              padding: PILL_INNER_PADDING,
              width: pillTotalWidth,
              height: TAB_CELL_HEIGHT + PILL_INNER_PADDING * 2,
            },
          ]}
        >
          {/* Animated selection indicator */}
          <Animated.View
            style={[
              styles.indicator,
              indicatorStyle,
              {
                width: TAB_CELL_WIDTH,
                height: TAB_CELL_HEIGHT,
                backgroundColor: `${accent.primary}${INDICATOR_ALPHA_HEX}`,
                borderRadius: PILL_RADIUS,
                left: PILL_INNER_PADDING,
                top: PILL_INNER_PADDING,
              },
            ]}
          />

          {visibleRoutes.map((route) => {
            const focused =
              state.routes[state.index]?.key === route.key;
            // Inactive uses textSecondary (clearer than textMuted) so both
            // tabs read at-a-glance even when neither is selected.
            const tint = focused ? accent.primary : colors.textSecondary;
            const label = t(`tabs.${route.name}`, {
              defaultValue: route.name,
            });
            const Icon = route.name === 'upload' ? Plus : User;
            return (
              <Pressable
                key={route.key}
                onPress={() => {
                  const event = navigation.emit({
                    type: 'tabPress',
                    target: route.key,
                    canPreventDefault: true,
                  });
                  if (!focused && !event.defaultPrevented) {
                    navigation.navigate(route.name);
                  }
                }}
                accessibilityRole="button"
                accessibilityLabel={label}
                accessibilityState={{ selected: focused }}
                style={({ pressed }) => [
                  styles.tabCell,
                  { width: TAB_CELL_WIDTH, height: TAB_CELL_HEIGHT, opacity: pressed ? 0.85 : 1 },
                ]}
              >
                <Icon
                  size={22}
                  color={tint}
                  // Bolder strokes on the focused tab so the icon lifts off
                  // the indicator instead of getting lost in it.
                  strokeWidth={focused ? 2.25 : 1.85}
                />
                <ThemedText
                  variant="caption"
                  style={{
                    marginTop: 3,
                    color: tint,
                    fontFamily: 'Outfit_600SemiBold',
                    fontSize: 12,
                    letterSpacing: 0.2,
                  }}
                >
                  {label}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Right settings circle */}
      <Pressable
        onPress={() => router.push('/settings')}
        accessibilityRole="button"
        accessibilityLabel={t('settings.title', { defaultValue: 'Settings' })}
        style={({ pressed }) => [
          styles.settingsBtn,
          {
            width: SETTINGS_DIAMETER,
            height: SETTINGS_DIAMETER,
            borderRadius: SETTINGS_DIAMETER / 2,
            opacity: pressed ? 0.85 : 1,
          },
        ]}
        hitSlop={4}
      >
        <FrostedSurface borderRadius={SETTINGS_DIAMETER / 2} />
        <SettingsIcon
          size={22}
          color={colors.textPrimary}
          strokeWidth={1.75}
        />
      </Pressable>
    </View>
  );
}

export default function TabsLayout(): React.ReactElement {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useTheme();

  const activeWorkspaceId = useTenantStore((s) => s.activeWorkspaceId);
  const membershipsQuery = useMemberships();

  const showUpload: boolean = useMemo(() => {
    if (!activeWorkspaceId) return false;
    const list = membershipsQuery.data ?? [];
    const active = list.find((m) => m.workspace.id === activeWorkspaceId);
    return !!active && active.status === 'active';
  }, [activeWorkspaceId, membershipsQuery.data]);

  return (
    <Tabs
      initialRouteName="profile"
      tabBar={(props) => (
        <CustomTabBar {...props} showUpload={showUpload} />
      )}
      screenOptions={{
        header: () => (
          <TopBar
            onTenantPress={() => router.push('/tenant-switcher')}
            onProfilePress={() => router.push('/global-profile')}
          />
        ),
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabs.profile'),
          tabBarAccessibilityLabel: t('tabs.profile'),
        }}
      />
      <Tabs.Screen
        name="upload"
        options={{
          title: t('tabs.upload'),
          tabBarAccessibilityLabel: t('tabs.upload'),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  row: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pillWrap: {
    position: 'relative',
  },
  pillContent: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  indicator: {
    position: 'absolute',
  },
  tabCell: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
