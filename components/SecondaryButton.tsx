import React from 'react';
import {
  Pressable,
  ActivityIndicator,
  View,
  StyleSheet,
} from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { useTheme } from '@/lib/theme/useTheme';
import { ThemedText } from './ThemedText';

export type SecondaryButtonSize = 'md' | 'sm';

export interface SecondaryButtonProps {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  accessibilityLabel?: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
  leftIcon?: React.ReactNode;
  // 'md' (default, 48pt) is the standard form button. 'sm' (32pt) is the
  // compact variant for in-card actions like profile-row Edit / Share.
  size?: SecondaryButtonSize;
}

const SIZE_HEIGHT: Record<SecondaryButtonSize, number> = {
  md: 48,
  sm: 32,
};

const SIZE_FONT: Record<SecondaryButtonSize, number> = {
  md: 16,
  sm: 13,
};

const SIZE_PADDING_H: Record<SecondaryButtonSize, number> = {
  md: 20,
  sm: 12,
};

export function SecondaryButton({
  label,
  onPress,
  disabled = false,
  loading = false,
  fullWidth = true,
  accessibilityLabel,
  testID,
  style,
  leftIcon,
  size = 'md',
}: SecondaryButtonProps): React.ReactElement {
  const { colors, radius } = useTheme();
  const isInteractive = !disabled && !loading;

  return (
    <Pressable
      onPress={isInteractive ? onPress : undefined}
      disabled={!isInteractive}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !isInteractive, busy: loading }}
      testID={testID}
      style={({ pressed }) => [
        styles.pressable,
        fullWidth && styles.fullWidth,
        {
          height: SIZE_HEIGHT[size],
          paddingHorizontal: SIZE_PADDING_H[size],
          borderRadius: radius.md,
          backgroundColor: colors.bgInput,
          borderColor: colors.border,
          opacity: pressed ? 0.85 : 1,
        },
        disabled && styles.disabled,
        style,
      ]}
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator color={colors.textPrimary} />
        ) : (
          <>
            {leftIcon ? <View style={styles.icon}>{leftIcon}</View> : null}
            <ThemedText
              variant="bodyMed"
              style={{
                fontFamily: 'Outfit_600SemiBold',
                fontSize: SIZE_FONT[size],
              }}
            >
              {label}
            </ThemedText>
          </>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    marginRight: 8,
  },
  disabled: {
    opacity: 0.5,
  },
});
