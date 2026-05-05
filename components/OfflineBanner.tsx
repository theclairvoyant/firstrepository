// Thin top banner that appears when the device has no usable internet
// connection. Pure visibility - it doesn't block input or change behavior.
// Mounts at the root layout so every screen sees it.
//
// "Offline" here means NetInfo's isInternetReachable resolves to false
// OR isConnected is false. We treat null (unknown) as connected so we
// never flash a false-positive on cold start before NetInfo has settled.

import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import NetInfo from '@react-native-community/netinfo';
import type { NetInfoState } from '@react-native-community/netinfo';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { WifiOff } from 'lucide-react-native';
import { ThemedText } from './ThemedText';
import { useTheme } from '@/lib/theme/useTheme';

function isOffline(state: NetInfoState): boolean {
  if (state.isConnected === false) return true;
  if (state.isInternetReachable === false) return true;
  return false;
}

export function OfflineBanner(): React.ReactElement | null {
  const { t } = useTranslation();
  const { accent, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const [offline, setOffline] = useState<boolean>(false);
  const [dismissed, setDismissed] = useState<boolean>(false);
  const opacity = useSharedValue<number>(0);

  useEffect(() => {
    const sub = NetInfo.addEventListener((state) => {
      const next = isOffline(state);
      setOffline(next);
      if (next) setDismissed(false);
    });
    return () => sub();
  }, []);

  useEffect(() => {
    opacity.value = withTiming(offline && !dismissed ? 1 : 0, {
      duration: 220,
    });
  }, [offline, dismissed, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  if (!offline || dismissed) return null;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.root,
        {
          paddingTop: insets.top + spacing.xs,
          paddingHorizontal: spacing.md,
          paddingBottom: spacing.xs,
        },
        animatedStyle,
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('offline.dismiss')}
        onPress={() => setDismissed(true)}
        style={[
          styles.pill,
          {
            backgroundColor: accent.danger,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.xs,
            borderRadius: 999,
          },
        ]}
      >
        <WifiOff size={14} color="#fff" strokeWidth={2} />
        <ThemedText
          variant="caption"
          style={{ color: '#fff', fontWeight: '600' }}
        >
          {t('offline.label')}
        </ThemedText>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 100,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
});
