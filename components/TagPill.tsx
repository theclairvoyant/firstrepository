import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { useTheme } from '@/lib/theme/useTheme';
import { ThemedText } from './ThemedText';

export interface TagPillProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  testID?: string;
}

// 12% alpha applied to the accent hex. Mirrors WorkspaceTypeBadge.
function withTwelvePercentAlpha(hex: string): string {
  return `${hex}1f`;
}

export function TagPill({
  label,
  selected = false,
  onPress,
  disabled = false,
  style,
  accessibilityLabel,
  testID,
}: TagPillProps): React.ReactElement {
  const { colors, accent, radius } = useTheme();
  const bg = selected ? withTwelvePercentAlpha(accent.primary) : colors.bgInput;
  const textColor = selected ? accent.primary : colors.textSecondary;

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      accessibilityLabel={accessibilityLabel ?? label}
      testID={testID}
      style={({ pressed }) => [
        styles.pill,
        {
          backgroundColor: bg,
          borderRadius: radius.pill,
          opacity: pressed ? 0.85 : 1,
        },
        disabled && styles.disabled,
        style,
      ]}
    >
      <ThemedText variant="mono" style={{ color: textColor }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    minHeight: 44,
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
});
