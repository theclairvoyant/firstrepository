// Settings > Storage. Surfaces the local storage hygiene controls so the
// user has a manual lever to clean up. The actual rules (what gets cleared)
// live in lib/storage/maintenance.ts.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, HardDrive } from 'lucide-react-native';
import { Card } from '@/components/Card';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenContainer } from '@/components/ScreenContainer';
import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/lib/theme/useTheme';
import { useUploadStore } from '@/lib/store/uploadStore';
import { useDraftStore } from '@/lib/store/draftStore';
import { useMemberships } from '@/lib/api/queries';
import {
  clearAppCache,
  formatBytes,
  getCacheSizeBytes,
} from '@/lib/storage/maintenance';
import { showToast } from '@/lib/toast';

const TERMINAL_STATES = new Set(['done', 'cancelled']);

export default function StorageScreen(): React.ReactElement {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors, spacing, accent } = useTheme();

  const memberships = useMemberships();
  const uploadJobs = useUploadStore((s) => s.jobs);
  const drafts = useDraftStore((s) => s.drafts);

  const [busy, setBusy] = useState<boolean>(false);
  const [cacheBytes, setCacheBytes] = useState<number | null>(null);
  const [cacheLoading, setCacheLoading] = useState<boolean>(true);

  const terminalCount: number = useMemo(
    () => uploadJobs.filter((j) => TERMINAL_STATES.has(j.state)).length,
    [uploadJobs],
  );
  const draftCount: number = useMemo(
    () => Object.keys(drafts).length,
    [drafts],
  );

  const refreshCacheSize = useCallback(async (): Promise<void> => {
    setCacheLoading(true);
    try {
      const bytes = await getCacheSizeBytes();
      setCacheBytes(bytes);
    } catch {
      setCacheBytes(0);
    } finally {
      setCacheLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshCacheSize();
  }, [refreshCacheSize]);

  const handleBack = useCallback((): void => {
    if (router.canGoBack()) router.back();
    else router.replace('/settings');
  }, [router]);

  const handleClear = useCallback(async (): Promise<void> => {
    if (busy) return;
    setBusy(true);
    try {
      const summary = await clearAppCache(memberships.data ?? []);
      showToast({
        variant: 'success',
        message: t('settings.storage.cleared', {
          uploads: summary.uploadsPruned + summary.staleFailedPruned,
          drafts: summary.draftsPruned,
        }),
      });
      // Re-measure after clearing so the displayed size reflects the result.
      void refreshCacheSize();
    } catch {
      showToast({
        variant: 'danger',
        message: t('settings.storage.clearError'),
      });
    } finally {
      setBusy(false);
    }
  }, [busy, memberships.data, refreshCacheSize, t]);

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
          <ThemedText
            variant="heading"
            tone="primary"
            numberOfLines={1}
            style={{ textAlign: 'center' }}
          >
            {t('settings.storage.title')}
          </ThemedText>
        </View>
        <View style={styles.headerButton} />
      </View>

      <View style={{ padding: spacing.md, gap: spacing.md }}>
        <View style={{ gap: spacing.sm }}>
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: `${accent.primary}1f`,
            }}
          >
            <HardDrive size={20} color={accent.primary} strokeWidth={1.75} />
          </View>
          <ThemedText variant="title" tone="primary">
            {t('settings.storage.heading')}
          </ThemedText>
          <ThemedText variant="body" tone="secondary">
            {t('settings.storage.body')}
          </ThemedText>
        </View>

        <Card padded>
          <View style={{ gap: spacing.md }}>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <ThemedText variant="body" tone="primary">
                {t('settings.storage.uploadHistoryLabel')}
              </ThemedText>
              <ThemedText variant="mono" tone="muted">
                {t('settings.storage.itemCount', { count: terminalCount })}
              </ThemedText>
            </View>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <ThemedText variant="body" tone="primary">
                {t('settings.storage.draftsLabel')}
              </ThemedText>
              <ThemedText variant="mono" tone="muted">
                {t('settings.storage.itemCount', { count: draftCount })}
              </ThemedText>
            </View>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <ThemedText variant="body" tone="primary">
                {t('settings.storage.onDiskLabel')}
              </ThemedText>
              <ThemedText variant="mono" tone="muted">
                {cacheLoading
                  ? t('settings.storage.measuring')
                  : formatBytes(cacheBytes ?? 0)}
              </ThemedText>
            </View>
          </View>
        </Card>

        <ThemedText variant="caption" tone="muted">
          {t('settings.storage.autoMaintenance')}
        </ThemedText>

        <PrimaryButton
          label={t('settings.storage.clearAction')}
          accessibilityLabel={t('settings.storage.clearAction')}
          onPress={() => {
            void handleClear();
          }}
          loading={busy}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  headerButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: {
    flex: 1,
    alignItems: 'center',
  },
});
