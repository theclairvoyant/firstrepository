import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  TextInput,
  Pressable,
  StyleSheet,
  Platform,
} from 'react-native';
import type {
  NativeSyntheticEvent,
  TextInputKeyPressEventData,
} from 'react-native';
import { useTheme } from '@/lib/theme/useTheme';
import { ThemedText } from './ThemedText';

const CELL_COUNT = 6;

export interface OTPInputProps {
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  autoFocus?: boolean;
  error?: boolean;
  accessibilityLabel?: string;
}

function sanitize(input: string): string {
  return input.replace(/[^0-9]/g, '').slice(0, CELL_COUNT);
}

export function OTPInput({
  value,
  onChange,
  onComplete,
  autoFocus = false,
  error = false,
  accessibilityLabel,
}: OTPInputProps): React.ReactElement {
  const { colors, radius, accent } = useTheme();
  const inputRef = useRef<TextInput>(null);
  const [focused, setFocused] = useState<boolean>(false);

  useEffect(() => {
    if (autoFocus) {
      const t = setTimeout(() => inputRef.current?.focus(), 80);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [autoFocus]);

  const cells = useMemo(() => {
    const arr: string[] = [];
    for (let i = 0; i < CELL_COUNT; i += 1) {
      arr.push(value[i] ?? '');
    }
    return arr;
  }, [value]);

  const handleChange = (text: string): void => {
    const next = sanitize(text);
    onChange(next);
    if (next.length === CELL_COUNT) {
      onComplete?.(next);
    }
  };

  const handleKeyPress = (
    e: NativeSyntheticEvent<TextInputKeyPressEventData>,
  ): void => {
    if (e.nativeEvent.key === 'Backspace' && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  const focus = (): void => {
    inputRef.current?.focus();
  };

  const activeIndex = Math.min(value.length, CELL_COUNT - 1);

  return (
    <Pressable
      onPress={focus}
      accessibilityRole="none"
      accessibilityLabel={accessibilityLabel ?? 'one time code input'}
      style={styles.wrapper}
    >
      <View style={styles.row}>
        {cells.map((char, idx) => {
          const isActive = focused && idx === activeIndex;
          const borderColor = error
            ? accent.danger
            : isActive
              ? colors.borderFocus
              : colors.border;
          return (
            <View
              key={idx}
              style={[
                styles.cell,
                {
                  backgroundColor: colors.bgInput,
                  borderColor,
                  borderRadius: radius.md,
                },
              ]}
            >
              <ThemedText
                variant="monoLarge"
                style={{
                  fontSize: 20,
                  lineHeight: 24,
                  color: colors.textPrimary,
                }}
              >
                {char}
              </ThemedText>
            </View>
          );
        })}
      </View>
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={handleChange}
        onKeyPress={handleKeyPress}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        keyboardType="number-pad"
        textContentType={Platform.OS === 'ios' ? 'oneTimeCode' : 'none'}
        autoComplete="sms-otp"
        importantForAutofill="yes"
        maxLength={CELL_COUNT}
        style={styles.hidden}
        caretHidden
        accessibilityLabel={accessibilityLabel ?? 'one time code input'}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  cell: {
    width: 48,
    height: 56,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hidden: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
});
