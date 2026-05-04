// Renders an admin-configured CTA pill exactly the way it will appear to
// viewers: solid or two-color gradient background, optional icon, label.
// Used in the CTA picker dropdown, the composer preview, and the public
// video detail screen so the creator sees the real artifact at every step.

import React from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  BookOpen,
  Download,
  FileText,
  Headphones,
  Link as LinkIcon,
  Mail,
  MessageCircle,
  Phone,
  Play,
  ShoppingBag,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { ThemedText } from './ThemedText';
import { useTheme } from '@/lib/theme/useTheme';
import type { CTA, CtaIconName } from '@/types/api';

const ICON_MAP: Record<CtaIconName, LucideIcon> = {
  phone: Phone,
  headphones: Headphones,
  download: Download,
  'book-open': BookOpen,
  'file-text': FileText,
  link: LinkIcon,
  'message-circle': MessageCircle,
  mail: Mail,
  play: Play,
  'shopping-bag': ShoppingBag,
};

export interface CtaButtonProps {
  cta: CTA;
  // Press handler. Omit (or pass undefined) to render as a non-interactive
  // visual preview - useful in the composer / picker.
  onPress?: () => void;
  disabled?: boolean;
  fullWidth?: boolean;
  // Override label - rare; defaults to cta.label.
  labelOverride?: string;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export function CtaButton({
  cta,
  onPress,
  disabled = false,
  fullWidth = true,
  labelOverride,
  style,
  accessibilityLabel,
}: CtaButtonProps): React.ReactElement {
  const { accent, palette, radius } = useTheme();

  const interactive = !!onPress && !disabled;
  const label = labelOverride ?? cta.label;
  const textColor = cta.textColor ?? palette.white;

  const colors: readonly [string, string] = (() => {
    if (cta.background) {
      if (cta.background.kind === 'gradient') {
        return cta.background.colors;
      }
      // Solid: duplicate the single color so LinearGradient still renders.
      const [c] = cta.background.colors;
      return [c, c];
    }
    // No background configured: fall back to theme accent gradient so the
    // button still reads as a CTA.
    return [accent.primary, accent.primary];
  })();

  const Icon: LucideIcon | null = cta.iconName ? ICON_MAP[cta.iconName] : null;

  const inner = (
    <LinearGradient
      colors={colors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={[styles.surface, { borderRadius: radius.pill }]}
    >
      {Icon ? (
        <View style={styles.iconWrap}>
          <Icon size={18} color={textColor} strokeWidth={2} />
        </View>
      ) : null}
      <ThemedText
        numberOfLines={1}
        style={{
          color: textColor,
          fontFamily: 'Outfit_600SemiBold',
          fontSize: 15,
          flexShrink: 1,
        }}
      >
        {label}
      </ThemedText>
    </LinearGradient>
  );

  if (interactive) {
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityState={{ disabled }}
        style={({ pressed }) => [
          fullWidth ? styles.fullWidth : styles.intrinsic,
          { opacity: disabled ? 0.5 : pressed ? 0.85 : 1 },
          style,
        ]}
      >
        {inner}
      </Pressable>
    );
  }

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel ?? label}
      style={[
        fullWidth ? styles.fullWidth : styles.intrinsic,
        { opacity: disabled ? 0.5 : 1 },
        style,
      ]}
    >
      {inner}
    </View>
  );
}

const styles = StyleSheet.create({
  fullWidth: { alignSelf: 'stretch' },
  intrinsic: { alignSelf: 'flex-start' },
  surface: {
    minHeight: 48,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: {
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
