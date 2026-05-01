import React, { useCallback, useState, useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Image as ImageIcon, Video } from 'lucide-react-native';
import { Card } from '@/components/Card';
import { GhostButton } from '@/components/GhostButton';
import { ScreenContainer } from '@/components/ScreenContainer';
import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/lib/theme/useTheme';
import { useUploadStore } from '@/lib/store/uploadStore';
import type { UploadJob } from '@/lib/store/uploadStore';
import { showToast } from '@/lib/toast';

interface PickTargetProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  accessibilityLabel: string;
  onPress: () => void;
}

function PickTarget({
  icon,
  title,
  subtitle,
  accessibilityLabel,
  onPress,
}: PickTargetProps): React.ReactElement {
  const { spacing } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        styles.pickPress,
        { opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <Card padded>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.md,
          }}
        >
          <View style={styles.iconWrap}>{icon}</View>
          <View style={{ flex: 1, gap: spacing.xxs }}>
            <ThemedText variant="heading">{title}</ThemedText>
            <ThemedText variant="caption" tone="secondary">
              {subtitle}
            </ThemedText>
          </View>
        </View>
      </Card>
    </Pressable>
  );
}

export default function UploadTabScreen(): React.ReactElement {
  const { t } = useTranslation();
  const { spacing, accent } = useTheme();
  const cancelJob = useUploadStore((s) => s.cancel);
  const jobs = useUploadStore((s) => s.jobs);

  const [activeJob, setActiveJob] = useState<UploadJob | null>(null);

  useEffect(() => {
    setActiveJob(useUploadStore.getState().getActive());
  }, [jobs]);

  const handleGallery = useCallback((): void => {
    showToast({ variant: 'info', message: t('uploadTab.pickerSoon') });
  }, [t]);

  const handleRecord = useCallback((): void => {
    showToast({ variant: 'info', message: t('uploadTab.recordSoon') });
  }, [t]);

  const handleCancelPending = useCallback((): void => {
    if (!activeJob) return;
    cancelJob(activeJob.id);
    showToast({
      variant: 'info',
      message: t('profileTab.uploadCancelled'),
    });
  }, [activeJob, cancelJob, t]);

  return (
    <ScreenContainer padded edges={['left', 'right']}>
      <View
        style={{
          flex: 1,
          paddingVertical: spacing.lg,
          gap: spacing.md,
        }}
      >
        <ThemedText variant="title">{t('uploadTab.title')}</ThemedText>
        <ThemedText
          variant="body"
          tone="secondary"
          style={{ marginBottom: spacing.sm }}
        >
          {t('uploadTab.body')}
        </ThemedText>

        <PickTarget
          icon={<ImageIcon size={32} color={accent.primary} strokeWidth={1.75} />}
          title={t('uploadTab.chooseFromGallery')}
          subtitle={t('uploadTab.chooseFromGallerySub')}
          accessibilityLabel={t('uploadTab.chooseFromGallery')}
          onPress={handleGallery}
        />

        <PickTarget
          icon={<Video size={32} color={accent.primary} strokeWidth={1.75} />}
          title={t('uploadTab.recordNow')}
          subtitle={t('uploadTab.recordNowSub')}
          accessibilityLabel={t('uploadTab.recordNow')}
          onPress={handleRecord}
        />

        <ThemedText
          variant="caption"
          tone="muted"
          style={{ marginTop: spacing.xs }}
        >
          {t('uploadTab.cellularNote')}
        </ThemedText>

        {activeJob ? (
          <View style={{ marginTop: spacing.md, alignSelf: 'flex-start' }}>
            <GhostButton
              label={t('uploadTab.cancelPending')}
              accessibilityLabel={t('uploadTab.cancelPending')}
              onPress={handleCancelPending}
            />
          </View>
        ) : null}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  pickPress: {
    minHeight: 44,
  },
  iconWrap: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
