import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import type { ViewStyle } from 'react-native';
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
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/lib/theme/useTheme';

export interface DrawerProps {
  visible: boolean;
  onClose: () => void;
  side?: 'left' | 'right';
  widthPct?: number;
  children: React.ReactNode;
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const ANIM_DURATION = 250;
const VELOCITY_CLOSE = 800;

function clampWidthPct(pct: number): number {
  if (Number.isNaN(pct)) return 90;
  if (pct < 0) return 0;
  if (pct > 100) return 100;
  return pct;
}

export function Drawer({
  visible,
  onClose,
  side = 'right',
  widthPct = 90,
  children,
}: DrawerProps): React.ReactElement | null {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const closeLabel: string = t('shell.drawer.close', { defaultValue: 'close' });

  const panelWidth = useMemo<number>(() => {
    const pct = clampWidthPct(widthPct);
    return SCREEN_WIDTH * (pct / 100);
  }, [widthPct]);

  const closedOffset = side === 'right' ? panelWidth : -panelWidth;

  const [mounted, setMounted] = useState<boolean>(visible);
  const reduceMotionRef = useRef<boolean>(false);

  const translateX = useSharedValue<number>(closedOffset);
  const backdropOpacity = useSharedValue<number>(0);

  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (!active) return;
        reduceMotionRef.current = enabled;
      })
      .catch(() => undefined);
    const sub = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (enabled: boolean) => {
        reduceMotionRef.current = enabled;
      },
    );
    return () => {
      active = false;
      sub.remove();
    };
  }, []);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      cancelAnimation(translateX);
      cancelAnimation(backdropOpacity);
      if (reduceMotionRef.current) {
        translateX.value = 0;
        backdropOpacity.value = 1;
      } else {
        translateX.value = closedOffset;
        backdropOpacity.value = 0;
        translateX.value = withTiming(0, {
          duration: ANIM_DURATION,
          easing: Easing.out(Easing.ease),
        });
        backdropOpacity.value = withTiming(1, {
          duration: ANIM_DURATION,
          easing: Easing.out(Easing.ease),
        });
      }
    } else if (mounted) {
      cancelAnimation(translateX);
      cancelAnimation(backdropOpacity);
      if (reduceMotionRef.current) {
        translateX.value = closedOffset;
        backdropOpacity.value = 0;
        setMounted(false);
      } else {
        backdropOpacity.value = withTiming(0, {
          duration: ANIM_DURATION,
          easing: Easing.out(Easing.ease),
        });
        translateX.value = withTiming(
          closedOffset,
          {
            duration: ANIM_DURATION,
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
  }, [visible, closedOffset, mounted, translateX, backdropOpacity]);

  const closeFromGesture = (): void => {
    onClose();
  };

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      if (side === 'right') {
        translateX.value = e.translationX > 0 ? e.translationX : 0;
      } else {
        translateX.value = e.translationX < 0 ? e.translationX : 0;
      }
    })
    .onEnd((e) => {
      const distance = Math.abs(e.translationX);
      const velocityTrigger =
        side === 'right'
          ? e.velocityX > VELOCITY_CLOSE
          : e.velocityX < -VELOCITY_CLOSE;
      const shouldClose = distance > panelWidth / 3 || velocityTrigger;
      if (shouldClose) {
        runOnJS(closeFromGesture)();
      } else {
        translateX.value = withTiming(0, {
          duration: 180,
          easing: Easing.out(Easing.ease),
        });
      }
    });

  const panelAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const backdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  if (!mounted) return null;

  const panelStyle: ViewStyle = {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: panelWidth,
    backgroundColor: colors.bgElevated,
    paddingTop: insets.top,
    paddingBottom: insets.bottom,
    ...(side === 'right' ? { right: 0 } : { left: 0 }),
  };

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

          <GestureDetector gesture={panGesture}>
            <Animated.View style={[panelStyle, panelAnimatedStyle]}>
              <View style={styles.body}>{children}</View>
            </Animated.View>
          </GestureDetector>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
  },
});
