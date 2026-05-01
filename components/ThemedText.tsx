import React from 'react';
import { Text } from 'react-native';
import type { TextProps, TextStyle, StyleProp } from 'react-native';
import { useTheme } from '@/lib/theme/useTheme';
import type { TypeVariant } from '@/lib/theme/tokens';

export type ThemedTextTone =
  | 'primary'
  | 'secondary'
  | 'muted'
  | 'inverse'
  | 'accent'
  | 'danger'
  | 'success'
  | 'warning'
  | 'info';

export interface ThemedTextProps extends TextProps {
  variant?: TypeVariant;
  tone?: ThemedTextTone;
  style?: StyleProp<TextStyle>;
}

export function ThemedText({
  variant = 'body',
  tone = 'primary',
  style,
  children,
  ...rest
}: ThemedTextProps): React.ReactElement {
  const { colors, accent, type } = useTheme();
  const v = type[variant];

  const toneColor: string = (() => {
    switch (tone) {
      case 'primary':
        return colors.textPrimary;
      case 'secondary':
        return colors.textSecondary;
      case 'muted':
        return colors.textMuted;
      case 'inverse':
        return colors.textInverse;
      case 'accent':
        return accent.primary;
      case 'danger':
        return accent.danger;
      case 'success':
        return accent.success;
      case 'warning':
        return accent.warning;
      case 'info':
        return accent.info;
    }
  })();

  const baseStyle: TextStyle = {
    fontFamily: v.font,
    fontSize: v.size,
    lineHeight: v.lineHeight,
    color: toneColor,
  };

  if ('letterSpacing' in v && typeof v.letterSpacing === 'number') {
    baseStyle.letterSpacing = v.letterSpacing;
  }
  if ('textTransform' in v && v.textTransform) {
    baseStyle.textTransform = v.textTransform;
  }

  return (
    <Text style={[baseStyle, style]} {...rest}>
      {children}
    </Text>
  );
}
