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

export interface DestructiveButtonProps {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  accessibilityLabel?: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
  leftIcon?: React.ReactNode;
}

export function DestructiveButton({
  label,
  onPress,
  disabled = false,
  loading = false,
  fullWidth = true,
  accessibilityLabel,
  testID,
  style,
  leftIcon,
}: DestructiveButtonProps): React.ReactElement {
  const { accent, radius, palette } = useTheme();
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
          borderRadius: radius.md,
          backgroundColor: accent.danger,
          opacity: pressed ? 0.85 : 1,
        },
        disabled && styles.disabled,
        style,
      ]}
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator color={palette.white} />
        ) : (
          <>
            {leftIcon ? <View style={styles.icon}>{leftIcon}</View> : null}
            <ThemedText
              variant="bodyMed"
              style={{
                color: palette.white,
                fontFamily: 'Outfit_600SemiBold',
                fontSize: 16,
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
    height: 48,
    paddingHorizontal: 20,
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
