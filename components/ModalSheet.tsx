import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import type { DimensionValue, ViewStyle } from 'react-native';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import Animated, {
  Easing,
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/lib/theme/useTheme';
import { ThemedText } from './ThemedText';

export interface ModalSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  height?: number | string;
  children: React.ReactNode;
}

const SCREEN_HEIGHT = Dimensions.get('window').height;
const HANDLE_WIDTH = 36;
const HANDLE_HEIGHT = 4;
const HANDLE_TOP_OFFSET = 8;
const ICON_SIZE = 20;
const CLOSE_HIT = 44;
const VELOCITY_CLOSE = 800;
const EXIT_DURATION = 200;

function resolveHeight(
  height: number | string | undefined,
  screenHeight: number,
): number {
  if (height === undefined) return screenHeight * 0.9;
  if (typeof height === 'number') return height;
  const trimmed = height.trim();
  if (trimmed.endsWith('%')) {
    const pct = parseFloat(trimmed.slice(0, -1));
    if (!Number.isNaN(pct)) return screenHeight * (pct / 100);
  }
  const parsed = parseFloat(trimmed);
  if (!Number.isNaN(parsed)) return parsed;
  return screenHeight * 0.9;
}

export function ModalSheet({
  visible,
  onClose,
  title,
  height = '90%',
  children,
}: ModalSheetProps): React.ReactElement | null {
  const { colors, spacing, radius } = useTheme();
  const { t } = useTranslation();

  const sheetHeight = resolveHeight(height, SCREEN_HEIGHT);

  // Mounted is true while the modal is on screen, including the exit animation.
  const [mounted, setMounted] = useState<boolean>(visible);
  const [reduceMotion, setReduceMotion] = useState<boolean>(false);
  const reduceMotionRef = useRef<boolean>(false);

  const translateY = useSharedValue<number>(sheetHeight);
  const backdropOpacity = useSharedValue<number>(0);

  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (!active) return;
        reduceMotionRef.current = enabled;
        setReduceMotion(enabled);
      })
      .catch(() => undefined);
    const sub = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (enabled: boolean) => {
        reduceMotionRef.current = enabled;
        setReduceMotion(enabled);
      },
    );
    return () => {
      active = false;
      sub.remove();
    };
  }, []);

  // Drive enter / exit animations from the visible prop.
  useEffect(() => {
    if (visible) {
      setMounted(true);
      cancelAnimation(translateY);
      cancelAnimation(backdropOpacity);
      if (reduceMotionRef.current) {
        translateY.value = 0;
        backdropOpacity.value = 1;
      } else {
        translateY.value = sheetHeight;
        backdropOpacity.value = 0;
        translateY.value = withSpring(0, {
          damping: 20,
          stiffness: 220,
          mass: 1,
        });
        backdropOpacity.value = withTiming(1, { duration: 200 });
      }
    } else if (mounted) {
      cancelAnimation(translateY);
      cancelAnimation(backdropOpacity);
      if (reduceMotionRef.current) {
        translateY.value = sheetHeight;
        backdropOpacity.value = 0;
        setMounted(false);
      } else {
        backdropOpacity.value = withTiming(0, { duration: EXIT_DURATION });
        translateY.value = withTiming(
          sheetHeight,
          {
            duration: EXIT_DURATION,
            easing: Easing.out(Easing.ease),
          },
          (finished) => {
            if (finished) {
              runOnJS(setMounted)(false);
            }
          },
        );
      }
    }
    // sheetHeight intentionally part of deps - if the user rotates we re-anchor.
  }, [visible, sheetHeight, mounted, translateY, backdropOpacity]);

  const closeFromGesture = (): void => {
    onClose();
  };

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      if (e.translationY > 0) {
        translateY.value = e.translationY;
      } else {
        translateY.value = 0;
      }
    })
    .onEnd((e) => {
      const shouldClose =
        e.translationY > sheetHeight / 3 || e.velocityY > VELOCITY_CLOSE;
      if (shouldClose) {
        runOnJS(closeFromGesture)();
      } else {
        translateY.value = withSpring(0, {
          damping: 20,
          stiffness: 220,
          mass: 1,
        });
      }
    });

  const sheetAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  if (!mounted) return null;

  const sheetHeightValue: DimensionValue = sheetHeight;

  const sheetStyle: ViewStyle = {
    height: sheetHeightValue,
    backgroundColor: colors.bgElevated,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingTop: HANDLE_TOP_OFFSET + HANDLE_HEIGHT + spacing.sm,
  };

  const handleStyle: ViewStyle = {
    position: 'absolute',
    top: HANDLE_TOP_OFFSET,
    left: 0,
    right: 0,
    alignItems: 'center',
  };

  const handleBarStyle: ViewStyle = {
    width: HANDLE_WIDTH,
    height: HANDLE_HEIGHT,
    borderRadius: HANDLE_HEIGHT / 2,
    backgroundColor: colors.borderStrong,
  };

  const headerStyle: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  };

  const closeButtonStyle: ViewStyle = {
    minWidth: CLOSE_HIT,
    minHeight: CLOSE_HIT,
    alignItems: 'center',
    justifyContent: 'center',
  };

  const closeLabel: string = t('shell.modal.close', { defaultValue: 'close' });

  return (
    <Modal
      visible={mounted}
      transparent
      statusBarTranslucent
      animationType="none"
      onRequestClose={onClose}
    >
      <GestureHandlerRootView style={StyleSheet.absoluteFill}>
        <View style={StyleSheet.absoluteFill}>
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: colors.bgOverlay },
              backdropAnimatedStyle,
            ]}
          >
            <Pressable
              style={StyleSheet.absoluteFill}
              accessibilityRole="button"
              accessibilityLabel={closeLabel}
              onPress={onClose}
            />
          </Animated.View>

          <View
            style={styles.sheetWrapper}
            pointerEvents="box-none"
          >
            <Animated.View style={[sheetStyle, sheetAnimatedStyle]}>
              <GestureDetector gesture={panGesture}>
                <View style={handleStyle} pointerEvents="box-none">
                  <View style={handleBarStyle} />
                </View>
              </GestureDetector>

              {title ? (
                <View style={headerStyle}>
                  <ThemedText variant="heading">{title}</ThemedText>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={closeLabel}
                    onPress={onClose}
                    style={({ pressed }) => [
                      closeButtonStyle,
                      pressed ? styles.pressed : null,
                    ]}
                    hitSlop={8}
                  >
                    <X
                      size={ICON_SIZE}
                      strokeWidth={1.75}
                      color={colors.textPrimary}
                    />
                  </Pressable>
                </View>
              ) : null}

              <View style={styles.body}>{children}</View>
            </Animated.View>
          </View>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheetWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  body: {
    flex: 1,
  },
  pressed: {
    opacity: 0.7,
  },
});
