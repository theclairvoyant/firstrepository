import React from 'react';
import { View, StyleSheet } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { useTheme } from '@/lib/theme/useTheme';
import { ThemedText } from './ThemedText';

export type StatusBadgeStatus =
  | 'pending'
  | 'approved'
  | 'live'
  | 'rejected'
  | 'needs_edits'
  | 'pending_invite'
  | 'pending_request';

export type StatusBadgeSurface = 'overMedia' | 'overSurface';

export interface StatusBadgeProps {
  status: StatusBadgeStatus;
  surface?: StatusBadgeSurface;
  label?: string;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

const labelMap: Record<StatusBadgeStatus, string> = {
  pending: 'pending',
  approved: 'approved',
  live: 'live',
  rejected: 'rejected',
  needs_edits: 'needs edits',
  pending_invite: 'pending invite',
  pending_request: 'pending request',
};

export function StatusBadge({
  status,
  surface = 'overSurface',
  label,
  style,
  accessibilityLabel,
}: StatusBadgeProps): React.ReactElement {
  const { colors, accent, radius, palette } = useTheme();

  const dotColor = ((): string => {
    switch (status) {
      case 'pending':
      case 'needs_edits':
      case 'pending_request':
        return accent.warning;
      case 'approved':
      case 'live':
        return accent.success;
      case 'rejected':
        return accent.danger;
      case 'pending_invite':
        return accent.info;
    }
  })();

  const isOverMedia = surface === 'overMedia';
  const bg = isOverMedia ? colors.bgOverlay : colors.bgCard;
  const textColor = isOverMedia ? palette.white : colors.textPrimary;
  const text = label ?? labelMap[status];

  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={accessibilityLabel ?? text}
      style={[
        styles.container,
        {
          backgroundColor: bg,
          borderRadius: radius.pill,
          borderWidth: isOverMedia ? 0 : 1,
          borderColor: colors.border,
        },
        style,
      ]}
    >
      <View
        style={[styles.dot, { backgroundColor: dotColor }]}
      />
      <ThemedText variant="mono" style={{ color: textColor }}>
        {text}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 10,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
});
