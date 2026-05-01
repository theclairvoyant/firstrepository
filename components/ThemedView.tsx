import React from 'react';
import { View } from 'react-native';
import type { ViewProps, ViewStyle, StyleProp } from 'react-native';
import { useTheme } from '@/lib/theme/useTheme';
import type { Surface } from '@/lib/theme/ThemeProvider';

export type ThemedViewBg = keyof Pick<
  Surface,
  'bg' | 'bgElevated' | 'bgCard' | 'bgInput'
>;

export interface ThemedViewProps extends ViewProps {
  bg?: ThemedViewBg;
  style?: StyleProp<ViewStyle>;
}

export function ThemedView({
  bg = 'bg',
  style,
  children,
  ...rest
}: ThemedViewProps): React.ReactElement {
  const { colors } = useTheme();
  return (
    <View style={[{ backgroundColor: colors[bg] }, style]} {...rest}>
      {children}
    </View>
  );
}
