// Notifications inbox. Two kinds for now (post_live, post_traction) backed
// by the SCAFFOLD mock feed derived from seed post timestamps + view
// counts. Real-time subscription wires in for FULL mode.

import React, { useCallback, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Bell, ChevronLeft, Sparkles, Zap } from 'lucide-react-native';
import { EmptyState } from '@/components/EmptyState';
import { ScreenContainer } from '@/components/ScreenContainer';
import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/lib/theme/useTheme';
import { useTenantStore } from '@/lib/store/tenantStore';
import { useLanguageStore } from '@/lib/store/languageStore';
import { getMockNotifications } from '@/lib/notifications/mockFeed';
import type { AppNotification } from '@/lib/notifications/types';

function formatNumber(value: number, locale: string): string {
  try {
    return new Intl.NumberFormat(locale).format(value);
  } catch {
    return String(value);
  }
}

function formatRelative(iso: string, locale: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat(locale, {
      month: 'short',
      day: 'numeric',
    }).format(d);
  } catch {
    return '';
  }
}

export default function NotificationsScreen(): React.ReactElement {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors, spacing, accent, radius } = useTheme();
  const locale = useLanguageStore((s) => s.resolved);

  const activeWorkspaceId = useTenantStore((s) => s.activeWorkspaceId);

  const notifications: AppNotification[] = useMemo(() => {
    if (!activeWorkspaceId) return [];
    return getMockNotifications(activeWorkspaceId);
  }, [activeWorkspaceId]);

  const handleBack = useCallback((): void => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/settings');
    }
  }, [router]);

  const handleOpenPost = useCallback(
    (n: AppNotification): void => {
      router.push({
        pathname: '/video/[postId]',
        params: { postId: n.postId },
      });
    },
    [router],
  );

  return (
    <ScreenContainer>
      <View
        style={[
          styles.header,
          {
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          onPress={handleBack}
          hitSlop={8}
          style={({ pressed }) => [
            styles.headerButton,
            { opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <ChevronLeft
            size={24}
            color={colors.textPrimary}
            strokeWidth={1.75}
          />
        </Pressable>
        <View style={styles.headerTitleWrap}>
          <ThemedText variant="heading" tone="primary">
            {t('notifications.title')}
          </ThemedText>
        </View>
        <View style={styles.headerButton} />
      </View>

      {notifications.length === 0 ? (
        <View style={styles.center}>
          <EmptyState
            icon={Bell}
            title={t('notifications.emptyTitle')}
            description={t('notifications.emptyBody')}
          />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: spacing.md,
            paddingTop: spacing.sm,
            paddingBottom: spacing.xl,
          }}
        >
          {notifications.map((n) => {
            const isLive = n.kind === 'post_live';
            const Icon = isLive ? Zap : Sparkles;
            const iconBg = isLive
              ? `${accent.success}1f`
              : `${accent.primary}1f`;
            const iconColor = isLive ? accent.success : accent.primary;
            const title = isLive
              ? t('notifications.liveTitle')
              : t('notifications.tractionTitle', {
                  count: n.metric ?? 0,
                  formattedCount: formatNumber(n.metric ?? 0, locale),
                });
            return (
              <Pressable
                key={n.id}
                onPress={() => handleOpenPost(n)}
                accessibilityRole="button"
                accessibilityLabel={`${title}: ${n.postTitle}`}
                style={({ pressed }) => [
                  styles.row,
                  {
                    backgroundColor: pressed
                      ? colors.bgInput
                      : 'transparent',
                    paddingVertical: spacing.sm,
                  },
                ]}
              >
                <View
                  style={[
                    styles.iconBubble,
                    { backgroundColor: iconBg },
                  ]}
                >
                  <Icon size={18} color={iconColor} strokeWidth={1.75} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <ThemedText variant="bodyMed" tone="primary">
                    {title}
                  </ThemedText>
                  <ThemedText
                    variant="caption"
                    tone="secondary"
                    numberOfLines={1}
                  >
                    {n.postTitle}
                  </ThemedText>
                  <ThemedText variant="mono" tone="muted">
                    {formatRelative(n.createdAt, locale)}
                  </ThemedText>
                </View>
                {n.postThumbnail ? (
                  <ExpoImage
                    source={{ uri: n.postThumbnail }}
                    style={[
                      styles.thumb,
                      { borderRadius: radius.sm },
                    ]}
                    contentFit="cover"
                    accessibilityIgnoresInvertColors
                  />
                ) : null}
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    minHeight: 48,
  },
  headerButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: {
    flex: 1,
    alignItems: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBubble: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumb: {
    width: 44,
    height: 60,
    backgroundColor: '#00000010',
  },
});
