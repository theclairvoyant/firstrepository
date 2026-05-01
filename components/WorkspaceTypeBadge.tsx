import React from 'react';
import { View, StyleSheet } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { useTheme } from '@/lib/theme/useTheme';
import { ThemedText } from './ThemedText';

export type WorkspaceType = 'skills' | 'social' | 'partner';

export interface WorkspaceTypeBadgeProps {
  type: WorkspaceType;
  label?: string;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

// 12% alpha applied to the accent hex. We append a 1f hex byte
// (0x1f / 0xff approx 0.122) which renders the spec'd 12% tint.
function withTwelvePercentAlpha(hex: string): string {
  return `${hex}1f`;
}

const labelMap: Record<WorkspaceType, string> = {
  skills: 'skills',
  social: 'social',
  partner: 'partner',
};

export function WorkspaceTypeBadge({
  type,
  label,
  style,
  accessibilityLabel,
}: WorkspaceTypeBadgeProps): React.ReactElement {
  const { accent, radius } = useTheme();
  const accentColor = accent[type];
  const bg = withTwelvePercentAlpha(accentColor);
  const text = label ?? labelMap[type];

  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={accessibilityLabel ?? text}
      style={[
        styles.container,
        { backgroundColor: bg, borderRadius: radius.pill },
        style,
      ]}
    >
      <ThemedText variant="mono" style={{ color: accentColor }}>
        {text}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    alignSelf: 'flex-start',
  },
});
