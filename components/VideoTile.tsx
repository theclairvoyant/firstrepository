import React from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Eye, Film, MousePointerClick } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import type { Post } from '@/types/api';
import { useTheme } from '@/lib/theme/useTheme';
import { ThemedText } from './ThemedText';
import { StatusBadge } from './StatusBadge';

export interface VideoTileProps {
  post: Post;
  onPress: (post: Post) => void;
  // When true, a status pill renders top-left for any non-live post. Set
  // false on the Live tab where the surrounding filter already conveys it.
  showStatusBadge?: boolean;
}

function formatCount(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) {
    const v = n / 1000;
    const truncated = Math.floor(v * 10) / 10;
    return `${truncated}K`;
  }
  const v = n / 1_000_000;
  const truncated = Math.floor(v * 10) / 10;
  return `${truncated}M`;
}

export function VideoTile({
  post,
  onPress,
  showStatusBadge = true,
}: VideoTileProps): React.ReactElement {
  const { colors, palette } = useTheme();
  const { t } = useTranslation();

  const hasThumb = typeof post.thumbnailUrl === 'string' && post.thumbnailUrl.length > 0;

  return (
    <Pressable
      onPress={() => onPress(post)}
      accessibilityRole="button"
      accessibilityLabel={t('videoTile.openPost', { title: post.title })}
      style={({ pressed }) => [
        styles.tile,
        {
          backgroundColor: colors.bgInput,
          opacity: pressed ? 0.9 : 1,
        },
      ]}
    >
      {hasThumb ? (
        <Image
          source={{ uri: post.thumbnailUrl }}
          style={StyleSheet.absoluteFillObject}
          contentFit="cover"
          transition={150}
          accessibilityIgnoresInvertColors
        />
      ) : (
        <View style={styles.placeholder}>
          <Film size={32} color={colors.textMuted} strokeWidth={1.75} />
        </View>
      )}

      {showStatusBadge && post.status !== 'live' ? (
        <View style={styles.statusBadge} pointerEvents="none">
          <StatusBadge status={post.status} surface="overMedia" />
        </View>
      ) : null}

      <View style={styles.bottomRow} pointerEvents="none">
        <View style={[styles.pill, { backgroundColor: colors.bgOverlay }]}>
          <Eye size={12} color={palette.white} strokeWidth={1.75} />
          <ThemedText
            variant="mono"
            style={[styles.pillText, { color: palette.white }]}
          >
            {formatCount(post.stats.views)}
          </ThemedText>
        </View>
        <View style={[styles.pill, { backgroundColor: colors.bgOverlay }]}>
          <MousePointerClick size={12} color={palette.white} strokeWidth={1.75} />
          <ThemedText
            variant="mono"
            style={[styles.pillText, { color: palette.white }]}
          >
            {formatCount(post.stats.clicks)}
          </ThemedText>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    width: '100%',
    aspectRatio: 9 / 16,
    overflow: 'hidden',
    position: 'relative',
    // Subtle round so the grid feels less like a wall of squares but stays
    // tight - nothing dramatic.
    borderRadius: 12,
  },
  placeholder: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
  },
  bottomRow: {
    position: 'absolute',
    left: 6,
    right: 6,
    bottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 999,
  },
  pillText: {
    marginLeft: 4,
  },
});
