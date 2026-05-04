import React from 'react';
import { View, StyleSheet } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Edge } from 'react-native-safe-area-context';
import { useTheme } from '@/lib/theme/useTheme';
import type { ThemedViewBg } from './ThemedView';

export interface ScreenContainerProps {
  children: React.ReactNode;
  bg?: ThemedViewBg;
  edges?: ReadonlyArray<Edge>;
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
}

const DEFAULT_EDGES: ReadonlyArray<Edge> = ['top', 'bottom', 'left', 'right'];

// Tighter than spacing.md (16) so screens read wider. Pulled out as a named
// constant so it's easy to find when tuning the global rail.
export const SCREEN_HORIZONTAL_PADDING = 10;

export function ScreenContainer({
  children,
  bg = 'bg',
  edges = DEFAULT_EDGES,
  padded = false,
  style,
  contentStyle,
}: ScreenContainerProps): React.ReactElement {
  const { colors } = useTheme();
  return (
    <SafeAreaView
      edges={[...edges]}
      style={[styles.flex, { backgroundColor: colors[bg] }, style]}
    >
      <View
        style={[
          styles.flex,
          padded
            ? { paddingHorizontal: SCREEN_HORIZONTAL_PADDING }
            : null,
          contentStyle,
        ]}
      >
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
});
