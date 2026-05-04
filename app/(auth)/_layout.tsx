import React from 'react';
import { Pressable, View, StyleSheet, Alert } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { useTheme } from '@/lib/theme/useTheme';
import { useAuthStore } from '@/lib/store/authStore';
import { useTenantStore } from '@/lib/store/tenantStore';
import { useSignOut } from '@/lib/api/queries';

const HEADER_HEIGHT = 48;
const HIT_TARGET = 44;

interface AuthHeaderProps {
  showBack?: boolean;
  onBack?: () => void;
  rightAction?: React.ReactNode;
}

// Custom header that bypasses iOS's native back-button pill chrome so we
// fully control the chevron alignment, hit target, and surface treatment.
function AuthHeader({
  showBack = true,
  onBack,
  rightAction,
}: AuthHeaderProps): React.ReactElement {
  const router = useRouter();
  const { colors, spacing } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const handleBack = (): void => {
    if (onBack) {
      onBack();
      return;
    }
    if (router.canGoBack()) router.back();
  };

  return (
    <View
      style={{
        paddingTop: insets.top,
        backgroundColor: colors.bg,
      }}
    >
      <View
        style={[
          styles.row,
          { height: HEADER_HEIGHT, paddingHorizontal: spacing.xs },
        ]}
      >
        <View style={styles.side}>
          {showBack ? (
            <Pressable
              onPress={handleBack}
              accessibilityRole="button"
              accessibilityLabel={t('common.back')}
              hitSlop={8}
              style={({ pressed }) => [
                styles.iconButton,
                { opacity: pressed ? 0.6 : 1 },
              ]}
            >
              <ChevronLeft
                size={26}
                color={colors.textPrimary}
                strokeWidth={2}
              />
            </Pressable>
          ) : null}
        </View>
        <View style={styles.spacer} />
        <View style={styles.sideEnd}>{rightAction ?? null}</View>
      </View>
    </View>
  );
}

// Hook that returns a function which signs the user out (clears JWT, tenant,
// and the persisted hasCreatorProfile flag via the mock signOut endpoint)
// and routes back to welcome. Used by profile-setup's back button.
function useAbandonSetup(): () => Promise<void> {
  const router = useRouter();
  const authSignOut = useAuthStore((s) => s.signOut);
  const tenantClear = useTenantStore((s) => s.clear);
  const signOutMutation = useSignOut();

  return async (): Promise<void> => {
    try {
      await signOutMutation.mutateAsync();
    } catch {
      // ignore network errors; we still clear locally.
    }
    await authSignOut();
    await tenantClear();
    router.replace('/(auth)/welcome');
  };
}

function ProfileSetupHeader(): React.ReactElement {
  const { t } = useTranslation();
  const abandon = useAbandonSetup();

  const confirmTitle = t('auth.profile.abandonTitle', {
    defaultValue: 'Cancel setup?',
  });
  const confirmBody = t('auth.profile.abandonBody', {
    defaultValue:
      "You'll be signed out. To come back you'll need to verify your email again.",
  });
  const confirmStay = t('auth.profile.abandonStay', {
    defaultValue: 'Keep going',
  });
  const confirmLeave = t('auth.profile.abandonLeave', {
    defaultValue: 'Sign out',
  });

  const handleBack = (): void => {
    Alert.alert(confirmTitle, confirmBody, [
      { text: confirmStay, style: 'cancel' },
      {
        text: confirmLeave,
        style: 'destructive',
        onPress: () => {
          void abandon();
        },
      },
    ]);
  };

  return <AuthHeader onBack={handleBack} />;
}

export default function AuthLayout(): React.ReactElement {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        header: () => <AuthHeader />,
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="welcome" options={{ headerShown: false }} />
      <Stack.Screen name="method" />
      <Stack.Screen name="email" />
      <Stack.Screen name="otp" />
      <Stack.Screen name="invite-code" />
      <Stack.Screen
        name="profile-setup"
        options={{
          header: () => <ProfileSetupHeader />,
          gestureEnabled: false,
        }}
      />
    </Stack>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  side: {
    minWidth: HIT_TARGET,
    height: HIT_TARGET,
    justifyContent: 'center',
  },
  sideEnd: {
    minHeight: HIT_TARGET,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  spacer: {
    flex: 1,
  },
  iconButton: {
    width: HIT_TARGET,
    height: HIT_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
