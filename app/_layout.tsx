import React, { useEffect, useMemo } from 'react';
import { Stack, useRouter } from 'expo-router';
import { I18nManager, View, ActivityIndicator } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Linking from 'expo-linking';
import NetInfo from '@react-native-community/netinfo';
import { useTranslation } from 'react-i18next';
import { QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/lib/theme/ThemeProvider';
import { useTheme } from '@/lib/theme/useTheme';
import { useAppFonts } from '@/lib/theme/fonts';
import { ToastHost } from '@/components/Toast';
import { createQueryClient } from '@/lib/api/queries';
import { initI18n } from '@/lib/i18n';
import { setUnauthorizedHandler } from '@/lib/api/navigation';
import { parseDeeplinkUrl } from '@/lib/deeplinks/parser';
import { useDeeplinkIntentStore } from '@/lib/deeplinks/intentStore';
import { showToast } from '@/lib/toast';
import { useUploadStore } from '@/lib/store/uploadStore';
import { resumeUpload } from '@/lib/video';

I18nManager.allowRTL(false);
I18nManager.forceRTL(false);
initI18n();

function RootShell(): React.ReactElement {
  const fontsLoaded = useAppFonts();
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const { t } = useTranslation();

  // Wire the axios 401 handler to navigate back to welcome and toast the user.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      router.replace('/(auth)/welcome');
      showToast({
        variant: 'danger',
        message: t('shell.session.expired'),
      });
    });
  }, [router, t]);

  // Listen for deep links arriving while the app is running.
  useEffect(() => {
    const sub = Linking.addEventListener('url', (event) => {
      const intent = parseDeeplinkUrl(event.url);
      if (intent) {
        useDeeplinkIntentStore.getState().setPending(intent);
      }
    });
    return () => sub.remove();
  }, []);

  // Wi-Fi resume listener for uploads queued via "Wait for Wi-Fi". When the
  // connection transitions to wifi, replay every job currently in
  // `waiting_wifi` via the upload driver. Jobs whose in-memory inputs were
  // lost (e.g. force-quit recovery) cannot resume automatically and the user
  // must use the manual Resume button on the banner.
  useEffect(() => {
    const sub = NetInfo.addEventListener((state) => {
      if (state.type !== 'wifi' || !state.isConnected) return;
      const waiting = useUploadStore
        .getState()
        .jobs.filter((j) => j.state === 'waiting_wifi');
      for (const job of waiting) {
        const handle = resumeUpload(job.id);
        if (handle) {
          // The waiting_wifi placeholder was already enqueued; remove it now
          // that the resumed handle has its own fresh job entry.
          useUploadStore.getState().remove(job.id);
          void handle.result.catch(() => undefined);
        }
      }
    });
    return () => sub();
  }, []);

  if (!fontsLoaded) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.bg,
        }}
      >
        <ActivityIndicator color={colors.textMuted} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="tenant-switcher"
          options={{
            presentation: 'transparentModal',
            animation: 'none',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="add-tenant"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="global-profile"
          options={{
            presentation: 'transparentModal',
            animation: 'none',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="edit-membership"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="composer"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="video/[postId]"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="settings"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="_design-preview"
          options={{ headerShown: false }}
        />
      </Stack>
      <ToastHost />
    </View>
  );
}

export default function RootLayout(): React.ReactElement {
  const queryClient = useMemo(() => createQueryClient(), []);
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <RootShell />
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
