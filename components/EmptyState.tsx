import React from 'react';
import { View, StyleSheet } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { useTheme } from '@/lib/theme/useTheme';
import { ThemedText } from './ThemedText';

export interface EmptyStateProps {
  icon?: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  iconNode?: React.ReactNode;
  title: string;
  description?: string;
  cta?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function EmptyState({
  icon: IconComponent,
  iconNode,
  title,
  description,
  cta,
  style,
}: EmptyStateProps): React.ReactElement {
  const { colors, spacing } = useTheme();

  return (
    <View style={[styles.container, { padding: spacing.xl }, style]}>
      {iconNode ? (
        <View style={{ marginBottom: spacing.md }}>{iconNode}</View>
      ) : IconComponent ? (
        <View style={{ marginBottom: spacing.md }}>
          <IconComponent size={48} color={colors.textMuted} strokeWidth={1.75} />
        </View>
      ) : null}
      <ThemedText
        variant="heading"
        tone="primary"
        style={{ marginBottom: description ? spacing.xs : 0, textAlign: 'center' }}
      >
        {title}
      </ThemedText>
      {description ? (
        <ThemedText
          variant="body"
          tone="secondary"
          style={{ textAlign: 'center' }}
        >
          {description}
        </ThemedText>
      ) : null}
      {cta ? (
        <View style={{ marginTop: spacing.lg, alignSelf: 'stretch' }}>
          {cta}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
