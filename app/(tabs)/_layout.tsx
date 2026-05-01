import React, { useMemo } from 'react';
import { View } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Plus, User } from 'lucide-react-native';
import { TopBar } from '@/components/TopBar';
import { useTheme } from '@/lib/theme/useTheme';
import { useTenantStore } from '@/lib/store/tenantStore';
import { useMemberships } from '@/lib/api/queries';

const ICON_SIZE = 22;
const UPLOAD_DIAMETER = 44;
const TAB_HEIGHT = 64;

interface TabIconProps {
  color: string;
  focused: boolean;
}

export default function TabsLayout(): React.ReactElement {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors, accent, palette } = useTheme();
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

  const renderProfileIcon = ({ color }: TabIconProps): React.ReactElement => (
    <User size={ICON_SIZE} color={color} strokeWidth={1.75} />
  );

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
        tabBarStyle: {
          backgroundColor: colors.bgElevated,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: TAB_HEIGHT + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontFamily: 'Outfit_500Medium',
          fontSize: 11,
        },
      }}
    >
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabs.profile'),
          tabBarAccessibilityLabel: t('tabs.profile'),
          tabBarIcon: renderProfileIcon,
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
