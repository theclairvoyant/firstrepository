// Brand-aware loading screen shown on boot when a signed-in user is about
// to land in a workspace. The host company's logo, brand name, and
// workspace name pulse softly so the customer feels like the app is
// theirs - without the logo dominating the screen.

import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Avatar } from './Avatar';
import { ThemedText } from './ThemedText';
import { useTheme } from '@/lib/theme/useTheme';

export interface BrandedSplashProps {
  brandName: string;
  workspaceName: string;
  logoUrl?: string | null;
  // Optional caption above the brand name (e.g. localized "Opening").
  caption?: string;
}

export function BrandedSplash({
  brandName,
  workspaceName,
  logoUrl,
  caption,
}: BrandedSplashProps): React.ReactElement {
  const { colors, spacing } = useTheme();
  const scale = useSharedValue<number>(1);
  const opacity = useSharedValue<number>(0);

  useEffect(() => {
    // Fade in on mount.
    opacity.value = withTiming(1, { duration: 220 });
    // Subtle pulse: 1 -> 1.04 -> 1, repeating. Soft easing so it reads as
    // a heartbeat, not an animation effect.
    scale.value = withRepeat(
      withSequence(
        withTiming(1.04, { duration: 720, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: 720, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
  }, [opacity, scale]);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <View
      style={[
        styles.root,
        { backgroundColor: colors.bg },
      ]}
      accessibilityRole="progressbar"
      accessibilityLabel={`${brandName} - ${workspaceName}`}
    >
      <Animated.View style={[styles.stack, { gap: spacing.md }, containerStyle]}>
        <Animated.View style={logoStyle}>
          <Avatar size={80} name={brandName} uri={logoUrl ?? undefined} />
        </Animated.View>
        {caption ? (
          <ThemedText
            variant="mono"
            tone="muted"
            style={{ marginTop: spacing.xs }}
          >
            {caption}
          </ThemedText>
        ) : null}
        <ThemedText variant="title" tone="primary">
          {brandName}
        </ThemedText>
        <ThemedText variant="body" tone="secondary">
          {workspaceName}
        </ThemedText>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stack: {
    alignItems: 'center',
  },
});
