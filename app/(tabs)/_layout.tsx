import React, { useMemo } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import type { ViewStyle } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { Plus, User } from 'lucide-react-native';
import { TopBar } from '@/components/TopBar';
import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/lib/theme/useTheme';
import { useTenantStore } from '@/lib/store/tenantStore';
import { useMemberships } from '@/lib/api/queries';

const ICON_SIZE = 22;
const UPLOAD_DIAMETER = 44;
const TAB_HEIGHT = 64;
const PILL_RADIUS = 999;
// Active tab indicator background uses accent.primary with 16% alpha (0x29 / 0xff approx 0.16)
const ACTIVE_TINT_ALPHA_HEX = '29';

interface TabIconProps {
  color: string;
  focused: boolean;
}

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

interface TabPillProps {
  focused: boolean;
  label: string;
  icon: React.ReactNode;
  activeColor: string;
  mutedColor: string;
}

function TabPill({
  focused,
  label,
  icon,
  activeColor,
  mutedColor,
}: TabPillProps): React.ReactElement {
  const bg = focused ? `${activeColor}${ACTIVE_TINT_ALPHA_HEX}` : 'transparent';
  return (
    <View
      style={[
        styles.tabPill,
        { backgroundColor: bg },
      ]}
    >
      {icon}
      <ThemedText
        variant="caption"
        style={{
          color: focused ? activeColor : mutedColor,
          fontFamily: 'Outfit_600SemiBold',
          fontSize: 11,
          marginLeft: 6,
        }}
      >
        {label}
      </ThemedText>
    </View>
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

  const renderProfileIcon = ({ color, focused }: TabIconProps): React.ReactElement => {
    const tint = focused ? accent.primary : colors.textMuted;
    return (
      <TabPill
        focused={focused}
        label={t('tabs.profile')}
        icon={<User size={ICON_SIZE} color={tint} strokeWidth={1.75} />}
        activeColor={accent.primary}
        mutedColor={colors.textMuted}
      />
    );
  };

  const renderUploadIcon = (): React.ReactElement => (
    <View
      style={{
        width: UPLOAD_DIAMETER,
        height: UPLOAD_DIAMETER,
        borderRadius: UPLOAD_DIAMETER / 2,
        backgroundColor: accent.primary,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Plus size={24} color={palette.white} strokeWidth={2} />
    </View>
  );

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
        tabBarItemStyle: {
          height: TAB_HEIGHT,
          paddingTop: 0,
          paddingBottom: 0,
          alignItems: 'center',
          justifyContent: 'center',
        },
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
          tabBarIcon: renderProfileIcon,
          tabBarLabel: () => null,
        }}
      />
      <Tabs.Screen
        name="upload"
        options={{
          title: t('tabs.upload'),
          tabBarAccessibilityLabel: t('tabs.upload'),
          tabBarIcon: renderUploadIcon,
          tabBarLabel: () => null,
          href: showUpload ? '/(tabs)/upload' : null,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: PILL_RADIUS,
  },
});
