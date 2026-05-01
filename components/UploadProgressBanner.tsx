import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { UploadCloud, AlertTriangle, Clock, X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useUploadStore } from '@/lib/store/uploadStore';
import type { UploadJob } from '@/lib/store/uploadStore';
import { useTheme } from '@/lib/theme/useTheme';
import { ThemedText } from './ThemedText';
import { GhostButton } from './GhostButton';
import { SecondaryButton } from './SecondaryButton';
import { PrimaryButton } from './PrimaryButton';

export interface UploadProgressBannerProps {
  onCancel?: () => void;
  onRetry?: () => void;
  onResume?: () => void;
  onDismiss?: () => void;
}

function startOfDay(d: Date): number {
  const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return copy.getTime();
}

function whenLabel(iso: string, language: string, t: (k: string) => string): string {
  const created = new Date(iso);
  const now = new Date();
  const dayMs = 24 * 60 * 60 * 1000;
  const diffDays = Math.round(
    (startOfDay(now) - startOfDay(created)) / dayMs,
  );
  if (diffDays <= 0) return t('uploadBanner.today');
  if (diffDays === 1) return t('uploadBanner.yesterday');
  try {
    const fmt = new Intl.DateTimeFormat(language, {
      month: 'short',
      day: 'numeric',
    });
    return fmt.format(created);
  } catch {
    return created.toISOString().slice(0, 10);
  }
}

function clampPct(n: number): number {
  if (Number.isNaN(n)) return 0;
  if (n < 0) return 0;
  if (n > 100) return 100;
  return Math.round(n);
}

export function UploadProgressBanner({
  onCancel,
  onRetry,
  onResume,
  onDismiss,
}: UploadProgressBannerProps): React.ReactElement | null {
  const { colors, radius, spacing, accent } = useTheme();
  const { t, i18n } = useTranslation();

  const jobs = useUploadStore((s) => s.jobs);

  const active: UploadJob | null =
    jobs.find(
      (j) =>
        j.state === 'preparing' ||
        j.state === 'transcoding' ||
        j.state === 'uploading' ||
        j.state === 'creating_post',
    ) ?? null;

  const failed: UploadJob | null = jobs.find((j) => j.state === 'failed') ?? null;

  const queuedCount = jobs.filter(
    (j) => j.state === 'queued' || j.state === 'waiting_wifi',
  ).length;

  const resumable: UploadJob | null = (() => {
    if (active || failed) return null;
    const today = startOfDay(new Date());
    return (
      jobs.find((j) => {
        if (j.state !== 'queued' && j.state !== 'waiting_wifi') return false;
        const created = startOfDay(new Date(j.createdAt));
        return created < today;
      }) ?? null
    );
  })();

  if (!active && !failed && !resumable) {
    return null;
  }

  const baseContainerStyle = {
    backgroundColor: colors.bgCard,
    borderColor: colors.borderStrong,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
  } as const;

  if (active) {
    const pct = clampPct(active.progressPct);
    return (
      <View style={[styles.container, baseContainerStyle]}>
        <View style={styles.headerRow}>
          <View style={[styles.iconWrap, { marginRight: spacing.sm }]}>
            <UploadCloud
              size={20}
              color={accent.primary}
              strokeWidth={1.75}
            />
          </View>
          <View style={styles.headerBody}>
            <View style={styles.titleRow}>
              <ThemedText variant="bodyMed" tone="primary">
                {t('uploadBanner.uploading')}
              </ThemedText>
              <ThemedText variant="mono" tone="secondary">
                {`${pct}%`}
              </ThemedText>
            </View>
            <View
              style={[
                styles.track,
                {
                  backgroundColor: colors.bgInput,
                  borderRadius: radius.pill,
                  marginTop: spacing.xs,
                },
              ]}
            >
              <View
                style={[
                  styles.fill,
                  {
                    width: `${pct}%`,
                    backgroundColor: accent.primary,
                    borderRadius: radius.pill,
                  },
                ]}
              />
            </View>
          </View>
          <View style={[styles.actions, { marginLeft: spacing.sm }]}>
            <GhostButton
              label={t('uploadBanner.cancel')}
              onPress={onCancel}
              disabled={!onCancel}
              accessibilityLabel={t('uploadBanner.cancel')}
            />
          </View>
        </View>
        {queuedCount > 0 ? (
          <ThemedText
            variant="caption"
            tone="muted"
            style={{ marginTop: spacing.xs }}
          >
            {t('uploadBanner.queueDepth', { count: queuedCount })}
          </ThemedText>
        ) : null}
      </View>
    );
  }

  if (failed) {
    return (
      <View
        style={[
          styles.container,
          baseContainerStyle,
          { borderColor: accent.danger },
        ]}
      >
        <View style={styles.headerRow}>
          <View style={[styles.iconWrap, { marginRight: spacing.sm }]}>
            <AlertTriangle
              size={20}
              color={accent.danger}
              strokeWidth={1.75}
            />
          </View>
          <View style={styles.headerBody}>
            <ThemedText variant="bodyMed" tone="primary">
              {t('uploadBanner.failed')}
            </ThemedText>
          </View>
          <View style={[styles.actions, { marginLeft: spacing.sm }]}>
            <SecondaryButton
              label={t('uploadBanner.retry')}
              onPress={onRetry}
              disabled={!onRetry}
              fullWidth={false}
              accessibilityLabel={t('uploadBanner.retry')}
            />
          </View>
        </View>
      </View>
    );
  }

  // resumable
  const label = resumable
    ? whenLabel(resumable.createdAt, i18n.resolvedLanguage ?? i18n.language, t)
    : t('uploadBanner.today');

  return (
    <View style={[styles.container, baseContainerStyle]}>
      <View style={styles.headerRow}>
        <View style={[styles.iconWrap, { marginRight: spacing.sm }]}>
          <Clock size={20} color={accent.info} strokeWidth={1.75} />
        </View>
        <View style={styles.headerBody}>
          <ThemedText variant="bodyMed" tone="primary">
            {t('uploadBanner.resumeFrom', { whenLabel: label })}
          </ThemedText>
        </View>
        <View style={[styles.actions, { marginLeft: spacing.sm }]}>
          <PrimaryButton
            label={t('uploadBanner.resume')}
            onPress={onResume}
            disabled={!onResume}
            fullWidth={false}
            accessibilityLabel={t('uploadBanner.resume')}
          />
          <Pressable
            onPress={onDismiss}
            accessibilityRole="button"
            accessibilityLabel={t('uploadBanner.dismiss')}
            hitSlop={12}
            style={[
              styles.dismiss,
              { marginLeft: spacing.xs, opacity: onDismiss ? 1 : 0.5 },
            ]}
            disabled={!onDismiss}
          >
            <X size={18} color={colors.textMuted} strokeWidth={1.75} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrap: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBody: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  track: {
    height: 4,
    width: '100%',
    overflow: 'hidden',
  },
  fill: {
    height: 4,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
  },
  dismiss: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
