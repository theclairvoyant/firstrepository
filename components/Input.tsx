import React, { useState } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
} from 'react-native';
import type {
  TextInputProps,
  StyleProp,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { useTheme } from '@/lib/theme/useTheme';
import { ThemedText } from './ThemedText';

export interface InputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string;
  helperText?: string;
  rightSlot?: React.ReactNode;
  leftSlot?: React.ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
}

export function Input({
  label,
  error,
  helperText,
  rightSlot,
  leftSlot,
  containerStyle,
  inputStyle,
  onFocus,
  onBlur,
  ...rest
}: InputProps): React.ReactElement {
  const { colors, radius, spacing, accent } = useTheme();
  const [focused, setFocused] = useState<boolean>(false);

  const borderColor = error
    ? accent.danger
    : focused
      ? colors.borderFocus
      : colors.border;

  return (
    <View style={containerStyle}>
      {label ? (
        <ThemedText
          variant="caption"
          tone="secondary"
          style={{ marginBottom: spacing.xs }}
        >
          {label}
        </ThemedText>
      ) : null}
      <View
        style={[
          styles.field,
          {
            backgroundColor: colors.bgInput,
            borderColor,
            borderRadius: radius.md,
            paddingHorizontal: spacing.md,
          },
        ]}
      >
        {leftSlot ? <View style={styles.left}>{leftSlot}</View> : null}
        <TextInput
          {...rest}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          placeholderTextColor={colors.textMuted}
          style={[
            styles.input,
            {
              color: colors.textPrimary,
              fontFamily: 'Outfit_400Regular',
              fontSize: 15,
            },
            inputStyle,
          ]}
        />
        {rightSlot ? <View style={styles.right}>{rightSlot}</View> : null}
      </View>
      {error ? (
        <ThemedText
          variant="caption"
          tone="danger"
          style={{ marginTop: spacing.xs }}
        >
          {error}
        </ThemedText>
      ) : helperText ? (
        <ThemedText
          variant="caption"
          tone="muted"
          style={{ marginTop: spacing.xs }}
        >
          {helperText}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    height: 52,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    paddingVertical: 0,
  },
  left: {
    marginRight: 8,
  },
  right: {
    marginLeft: 8,
  },
});
