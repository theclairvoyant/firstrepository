import React from 'react';
import {
  Pressable,
  ActivityIndicator,
  View,
  StyleSheet,
} from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/lib/theme/useTheme';
import { ThemedText } from './ThemedText';

export interface PrimaryButtonProps {
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

export function PrimaryButton({
  label,
  onPress,
  disabled = false,
  loading = false,
  fullWidth = true,
  accessibilityLabel,
  testID,
  style,
  leftIcon,
}: PrimaryButtonProps): React.ReactElement {
  const { gradient, radius, palette } = useTheme();
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
        { borderRadius: radius.md, opacity: pressed ? 0.85 : 1 },
        disabled && styles.disabled,
        style,
      ]}
    >
      <LinearGradient
        colors={[gradient.primary[0], gradient.primary[1]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.gradient, { borderRadius: radius.md }]}
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
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    minHeight: 48,
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  gradient: {
    height: 48,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
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
