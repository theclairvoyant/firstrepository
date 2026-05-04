// Liquid-glass surface used by floating nav chrome (tab pill, settings
// circle, etc.). Single source of truth for how translucent surfaces look
// across the app. Theme-reactive via useTheme - swaps automatically when
// the user toggles between light/dark/system mode.
//
// Platform behaviour:
//   iOS    - native UIBlurEffect with `systemThinMaterial{Light,Dark}` so
//            the glass stays translucent (you can still see the content
//            blurred behind it) but the tone is locked to the app's
//            light/dark preference. A very thin (12% alpha) tinted bg
//            sits behind the blur as a contrast floor so text reads even
//            with Reduce Transparency on or over very bright content.
//   Android- BlurView is software-emulated and grainy on system materials.
//            Render a tinted bg over a moderate blur so the chip still
//            reads as a distinct floating surface.
//   web    - no blur. Solid bgElevated at 92% alpha as a sensible fallback.

import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '@/lib/theme/useTheme';

export interface FrostedSurfaceProps {
  borderRadius: number;
  // Optional override for the border. Defaults to colors.borderStrong
  // (better dark-mode legibility than the lighter colors.border).
  borderColor?: string;
  // Pass through any additional positioning styles (e.g. width / height
  // when used outside of an absolutely-filled wrapper).
  style?: StyleProp<ViewStyle>;
}

export function FrostedSurface({
  borderRadius,
  borderColor,
  style,
}: FrostedSurfaceProps): React.ReactElement {
  const { colors, isDark } = useTheme();
  const finalBorder = borderColor ?? colors.borderStrong;

  // Apply borderRadius directly to BlurView's style so the iOS native
  // material clips cleanly at the corners (rather than relying solely on
  // a parent overflow:hidden which sometimes leaks one pixel).
  const radiusedFill: ViewStyle = {
    ...StyleSheet.absoluteFillObject,
    borderRadius,
    overflow: 'hidden',
  };

  // iOS 26+ continuous corner curve. Squircle-ish, matches system chrome.
  const cornerStyle: ViewStyle =
    Platform.OS === 'ios' ? { borderCurve: 'continuous' } : {};

  if (Platform.OS === 'web') {
    return (
      <View
        style={[
          radiusedFill,
          cornerStyle,
          {
            backgroundColor: `${colors.bgElevated}eb`,
            borderWidth: 1,
            borderColor: finalBorder,
          },
          style,
        ]}
      />
    );
  }

  if (Platform.OS === 'ios') {
    // Lock the material tone to the app's dark/light state instead of
    // letting `systemThinMaterial` auto-adapt. The auto variant sometimes
    // reads the wallpaper / underlying content rather than the app's
    // appearance, so a dark-mode app renders a light chrome over a bright
    // banner. Locking to *Dark / *Light fixes that while keeping the
    // material translucent (you can still see blur).
    const tint = isDark ? 'systemThinMaterialDark' : 'systemThinMaterialLight';
    // Thin contrast floor so text + icons remain readable when the device
    // dials back blur (Reduce Transparency, low power) or when the chip
    // floats over very bright content. 12% alpha is heavy enough to nudge
    // contrast without flattening the glass.
    const fallbackBg = isDark
      ? 'rgba(0,0,0,0.12)'
      : 'rgba(255,255,255,0.12)';
    return (
      <View
        style={[
          radiusedFill,
          cornerStyle,
          {
            borderWidth: 1,
            borderColor: finalBorder,
            backgroundColor: fallbackBg,
          },
          style,
        ]}
      >
        <BlurView
          intensity={70}
          tint={tint}
          style={[radiusedFill, cornerStyle]}
        />
      </View>
    );
  }

  // Android.
  return (
    <View
      style={[
        radiusedFill,
        { borderWidth: 1, borderColor: finalBorder },
        style,
      ]}
    >
      <BlurView
        intensity={80}
        tint={isDark ? 'dark' : 'light'}
        style={radiusedFill}
      />
      <View
        style={[
          StyleSheet.absoluteFillObject,
          { backgroundColor: `${colors.bgElevated}99` },
        ]}
      />
    </View>
  );
}
