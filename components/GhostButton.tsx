import React from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { useTheme } from '@/lib/theme/useTheme';
import { ThemedText } from './ThemedText';

export interface GhostButtonProps {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  fullWidth?: boolean;
  accessibilityLabel?: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
  leftIcon?: React.ReactNode;
}

export function GhostButton({
  label,
  onPress,
  disabled = false,
  fullWidth = false,
  accessibilityLabel,
  testID,
  style,
  leftIcon,
}: GhostButtonProps): React.ReactElement {
  const { radius } = useTheme();

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      testID={testID}
      style={({ pressed }) => [
        styles.pressable,
        fullWidth && styles.fullWidth,
        { borderRadius: radius.md, opacity: pressed ? 0.7 : 1 },
        disabled && styles.disabled,
        style,
      ]}
    >
      <View style={styles.content}>
        {leftIcon ? <View style={styles.icon}>{leftIcon}</View> : null}
        <ThemedText
          variant="bodyMed"
          style={{ fontFamily: 'Outfit_600SemiBold', fontSize: 15 }}
        >
          {label}
        </ThemedText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    minHeight: 44,
    height: 40,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
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
    marginRight: 6,
  },
  disabled: {
    opacity: 0.5,
  },
});
