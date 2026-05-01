import React, { useMemo } from 'react';
import { Stack } from 'expo-router';
import { I18nManager, View, ActivityIndicator } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/lib/theme/ThemeProvider';
import { useTheme } from '@/lib/theme/useTheme';
import { useAppFonts } from '@/lib/theme/fonts';
import { ToastHost } from '@/components/Toast';
import { createQueryClient } from '@/lib/api/queries';
import { initI18n } from '@/lib/i18n';

I18nManager.allowRTL(false);
I18nManager.forceRTL(false);
initI18n();

function RootShell(): React.ReactElement {
  const fontsLoaded = useAppFonts();
  const { colors, isDark } = useTheme();

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
      <Stack screenOptions={{ headerShown: false }} />
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
