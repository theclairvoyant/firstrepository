import React from 'react';
import { View, StyleSheet } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { useTheme } from '@/lib/theme/useTheme';
import { ThemedText } from './ThemedText';
import { TagPill } from './TagPill';

export interface TagSectionProps {
  title?: string;
  tags: ReadonlyArray<string>;
  selected: ReadonlyArray<string>;
  onToggle: (tag: string) => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function TagSection({
  title,
  tags,
  selected,
  onToggle,
  disabled = false,
  style,
}: TagSectionProps): React.ReactElement {
  const { spacing } = useTheme();
  return (
    <View style={style}>
      {title ? (
        <ThemedText
          variant="caption"
          tone="secondary"
          style={{ marginBottom: spacing.xs }}
        >
          {title}
        </ThemedText>
      ) : null}
      <View style={styles.row}>
        {tags.map((tag) => {
          const isOn = selected.includes(tag);
          return (
            <TagPill
              key={tag}
              label={tag}
              selected={isOn}
              disabled={disabled}
              onPress={() => onToggle(tag)}
              style={{ marginRight: spacing.xs, marginBottom: spacing.xs }}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
});
