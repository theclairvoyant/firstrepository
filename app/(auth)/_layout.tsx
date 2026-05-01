import React from 'react';
import { Pressable } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ChevronLeft } from 'lucide-react-native';
import { useTheme } from '@/lib/theme/useTheme';

function HeaderBack(): React.ReactElement {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useTranslation();
  return (
    <Pressable
      onPress={() => router.back()}
      accessibilityRole="button"
      accessibilityLabel={t('common.back')}
      hitSlop={12}
      style={{
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <ChevronLeft size={24} color={colors.textPrimary} strokeWidth={1.75} />
    </Pressable>
  );
}

export default function AuthLayout(): React.ReactElement {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="welcome" options={{ headerShown: false }} />
      <Stack.Screen
        name="method"
        options={{
          headerShown: true,
          headerTitle: '',
          headerShadowVisible: false,
          headerStyle: { backgroundColor: colors.bg },
          headerLeft: () => <HeaderBack />,
        }}
      />
      <Stack.Screen
        name="email"
        options={{
          headerShown: true,
          headerTitle: '',
          headerShadowVisible: false,
          headerStyle: { backgroundColor: colors.bg },
          headerLeft: () => <HeaderBack />,
        }}
      />
      <Stack.Screen
        name="otp"
        options={{
          headerShown: true,
          headerTitle: '',
          headerShadowVisible: false,
          headerStyle: { backgroundColor: colors.bg },
          headerLeft: () => <HeaderBack />,
        }}
      />
      <Stack.Screen
        name="invite-code"
        options={{
          headerShown: true,
          headerTitle: '',
          headerShadowVisible: false,
          headerStyle: { backgroundColor: colors.bg },
          headerLeft: () => <HeaderBack />,
        }}
      />
      <Stack.Screen
        name="profile-setup"
        options={{
          headerShown: true,
          headerTitle: '',
          headerShadowVisible: false,
          headerStyle: { backgroundColor: colors.bg },
          headerLeft: () => <HeaderBack />,
        }}
      />
    </Stack>
  );
}
