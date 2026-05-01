import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Animated,
  Easing,
  Platform,
} from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { useTheme } from '@/lib/theme/useTheme';
import { ThemedText } from './ThemedText';
import { useToastStore } from '@/lib/toast';
import type { ToastInstance, ToastVariant } from '@/lib/toast';

function variantColor(
  variant: ToastVariant,
  acc: { primary: string; success: string; warning: string; danger: string },
): string {
  switch (variant) {
    case 'success':
      return acc.success;
    case 'warning':
      return acc.warning;
    case 'danger':
      return acc.danger;
    case 'info':
      return acc.primary;
  }
}

interface ToastItemProps {
  toast: ToastInstance;
  onDismiss: (id: string) => void;
}

function ToastItem({ toast, onDismiss }: ToastItemProps): React.ReactElement {
  const { colors, radius, spacing, accent, palette } = useTheme();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 180,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 220,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 180,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }).start(() => onDismiss(toast.id));
    }, toast.durationMs);
    return () => clearTimeout(timer);
  }, [toast.id, toast.durationMs, opacity, translateY, onDismiss]);

  const accentColor = variantColor(toast.variant, accent);

  const shadowStyle = Platform.select<ViewStyle>({
    ios: {
      shadowColor: palette.black,
      shadowOpacity: 0.15,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
    },
    android: {
      elevation: 6,
    },
    default: {},
  }) ?? {};

  return (
    <Animated.View
      style={[
        styles.toast,
        shadowStyle,
        {
          backgroundColor: colors.bgCard,
          borderColor: colors.border,
          borderRadius: radius.lg,
          padding: spacing.md,
          marginBottom: spacing.xs,
          opacity,
          transform: [{ translateY }],
        },
      ]}
      accessibilityRole="alert"
      accessibilityLabel={toast.message}
    >
      <View style={[styles.bar, { backgroundColor: accentColor }]} />
      <View style={styles.body}>
        <ThemedText variant="bodyMed" tone="primary">
          {toast.message}
        </ThemedText>
        {toast.description ? (
          <ThemedText
            variant="caption"
            tone="secondary"
            style={{ marginTop: 2 }}
          >
            {toast.description}
          </ThemedText>
        ) : null}
      </View>
      <Pressable
        onPress={() => onDismiss(toast.id)}
        accessibilityRole="button"
        accessibilityLabel="dismiss notification"
        hitSlop={12}
        style={styles.close}
      >
        <X size={18} color={colors.textMuted} strokeWidth={1.75} />
      </Pressable>
    </Animated.View>
  );
}

export interface ToastHostProps {
  topOffset?: number;
  style?: StyleProp<ViewStyle>;
}

export function ToastHost({
  topOffset,
  style,
}: ToastHostProps): React.ReactElement | null {
  const { spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  if (toasts.length === 0) return null;

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.host,
        { top: (topOffset ?? insets.top) + spacing.xs, paddingHorizontal: spacing.md },
        style,
      ]}
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 9999,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    overflow: 'hidden',
  },
  bar: {
    width: 3,
    alignSelf: 'stretch',
    borderRadius: 2,
    marginRight: 12,
  },
  body: {
    flex: 1,
  },
  close: {
    marginLeft: 12,
    padding: 4,
  },
});
