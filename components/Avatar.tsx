import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import type { StyleProp, ViewStyle, ImageSourcePropType } from 'react-native';
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

  const containerStyle: ViewStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgInput,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  };

  const imgSource: ImageSourcePropType | undefined =
    uri ? { uri } : source;

  return (
    <View
      style={[containerStyle, style]}
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel ?? name ?? 'avatar'}
    >
      {imgSource ? (
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
