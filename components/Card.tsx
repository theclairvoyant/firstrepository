import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import type { ViewProps, ViewStyle, StyleProp } from 'react-native';
import { useTheme } from '@/lib/theme/useTheme';

export interface CardProps extends ViewProps {
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Card({
  padded = true,
  style,
  children,
  ...rest
}: CardProps): React.ReactElement {
  const { colors, radius, spacing, isDark, palette } = useTheme();

  const shadowStyle: ViewStyle = isDark
    ? {}
    : Platform.select<ViewStyle>({
        ios: {
          shadowColor: palette.black,
          shadowOpacity: 0.04,
          shadowRadius: 2,
          shadowOffset: { width: 0, height: 1 },
        },
        android: {
          elevation: 1,
        },
        default: {},
      }) ?? {};

  return (
    <View
      style={[
        styles.base,
        {
          backgroundColor: colors.bgCard,
          borderColor: colors.border,
          borderRadius: radius.lg,
          padding: padded ? spacing.md : 0,
        },
        shadowStyle,
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderWidth: 1,
  },
});
