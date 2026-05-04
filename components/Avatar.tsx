import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import type { StyleProp, ViewStyle, ImageSourcePropType } from 'react-native';
import { User } from 'lucide-react-native';
import { useTheme } from '@/lib/theme/useTheme';
import { ThemedText } from './ThemedText';

export type AvatarSize = 24 | 32 | 40 | 56 | 80;

export interface AvatarProps {
  size?: AvatarSize;
  uri?: string;
  source?: ImageSourcePropType;
  name?: string;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

// Sentinel URI scheme for placeholder silhouette avatars. Format:
// `silhouette:#RRGGBB` - background hex color, person icon centered on top.
// The whole app treats this as a normal avatarUrl string; only Avatar knows
// how to draw it.
const SILHOUETTE_PREFIX = 'silhouette:';

export function isSilhouetteUri(uri: string | undefined | null): boolean {
  return !!uri && uri.startsWith(SILHOUETTE_PREFIX);
}

export function buildSilhouetteUri(hex: string): string {
  return `${SILHOUETTE_PREFIX}${hex}`;
}

function parseSilhouetteColor(uri: string): string {
  return uri.slice(SILHOUETTE_PREFIX.length);
}

function getInitials(name: string | undefined): string {
  if (!name) return '';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const sizeFontMap: Record<AvatarSize, number> = {
  24: 10,
  32: 12,
  40: 14,
  56: 18,
  80: 26,
};

const iconSizeMap: Record<AvatarSize, number> = {
  24: 14,
  32: 18,
  40: 22,
  56: 30,
  80: 44,
};

// Light tint applied over the silhouette bg for the icon so face contrast
// stays readable across hue choices without per-color tuning.
const SILHOUETTE_FG = '#ffffffd9';

export function Avatar({
  size = 40,
  uri,
  source,
  name,
  style,
  accessibilityLabel,
}: AvatarProps): React.ReactElement {
  const { colors } = useTheme();
  const initials = getInitials(name);
  const silhouette = isSilhouetteUri(uri);

  const containerStyle: ViewStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: silhouette ? parseSilhouetteColor(uri as string) : colors.bgInput,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  };

  const imgSource: ImageSourcePropType | undefined =
    !silhouette && uri ? { uri } : !uri ? source : undefined;

  return (
    <View
      style={[containerStyle, style]}
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel ?? name ?? 'avatar'}
    >
      {silhouette ? (
        <User
          size={iconSizeMap[size]}
          color={SILHOUETTE_FG}
          strokeWidth={1.75}
        />
      ) : imgSource ? (
        <Image source={imgSource} style={StyleSheet.absoluteFillObject} />
      ) : (
        <ThemedText
          tone="secondary"
          style={{
            fontFamily: 'Outfit_600SemiBold',
            fontSize: sizeFontMap[size],
            lineHeight: sizeFontMap[size] + 2,
          }}
        >
          {initials}
        </ThemedText>
      )}
    </View>
  );
}
