import React, { useCallback, useState, useEffect } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Image as ImageIcon, Video } from 'lucide-react-native';
import { Card } from '@/components/Card';
import { GhostButton } from '@/components/GhostButton';
import { ScreenContainer } from '@/components/ScreenContainer';
import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/lib/theme/useTheme';
import { useTenantStore } from '@/lib/store/tenantStore';
import { useUploadStore } from '@/lib/store/uploadStore';
import { useDraftStore } from '@/lib/store/draftStore';
import { useSettingsStore } from '@/lib/store/settingsStore';
import { useWorkspace } from '@/lib/api/queries';
import type { UploadJob } from '@/lib/store/uploadStore';
import { showToast } from '@/lib/toast';
import {
  pickVideoFromGallery,
  validateMedia,
  videoErrorI18nKey,
  isVideoPipelineError,
  VideoPipelineError,
} from '@/lib/video';

interface PickTargetProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  accessibilityLabel: string;
  onPress: () => void;
  disabled?: boolean;
}

function PickTarget({
  icon,
  title,
  subtitle,
  accessibilityLabel,
  onPress,
  disabled = false,
}: PickTargetProps): React.ReactElement {
  const { spacing } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      style={({ pressed }) => [
        styles.pickPress,
        { opacity: pressed || disabled ? 0.6 : 1 },
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
  const router = useRouter();
  const { spacing, accent } = useTheme();
  const cancelJob = useUploadStore((s) => s.cancel);
  const jobs = useUploadStore((s) => s.jobs);
  const warnBeforeCellular = useSettingsStore((s) => s.warnBeforeCellular);

  const activeWorkspaceId = useTenantStore((s) => s.activeWorkspaceId);
  const workspaceQuery = useWorkspace(activeWorkspaceId);
  const workspace = workspaceQuery.data ?? null;

  const [activeJob, setActiveJob] = useState<UploadJob | null>(null);
  const [picking, setPicking] = useState<boolean>(false);

  useEffect(() => {
    setActiveJob(useUploadStore.getState().getActive());
  }, [jobs]);

  const handleGallery = useCallback(async (): Promise<void> => {
    if (!activeWorkspaceId || !workspace) {
      showToast({
        variant: 'warning',
        message: t('uploadTab.noWorkspace'),
      });
      return;
    }
    if (picking) return;
    const maxVideoSeconds = workspace.capabilities.maxVideoSeconds;

    setPicking(true);
    try {
      const asset = await pickVideoFromGallery({ maxVideoSeconds });
      if (!asset) return; // User cancelled.
      const validated = await validateMedia(asset, workspace.capabilities);
      useDraftStore.getState().setDraft({
        workspaceId: activeWorkspaceId,
        localUri: validated.uri,
        durationMs: validated.durationMs,
        width: validated.width,
        height: validated.height,
        title: '',
        description: '',
        tagIds: [],
        ctaId: null,
        ctaUrl: null,
        updatedAt: new Date().toISOString(),
      });
      router.push('/composer/edit');
    } catch (err) {
      const key = videoErrorI18nKey(err);
      const params = isVideoPipelineError(err) ? err.params : {};
      showToast({
        variant: 'danger',
        message: t(key, params as Record<string, string | number>),
      });
      if (err instanceof VideoPipelineError && err.code === 'PERMISSION_DENIED') {
        showToast({
          variant: 'info',
          message: t('uploadTab.openSettingsHint'),
        });
        // Fire-and-forget secondary call: open OS settings so the user can
        // grant access. We do not await; the toast above already informs.
        void Linking.openSettings();
      }
    } finally {
      setPicking(false);
    }
  }, [activeWorkspaceId, workspace, picking, router, t]);

  const handleRecord = useCallback((): void => {
    if (!activeWorkspaceId) {
      showToast({
        variant: 'warning',
        message: t('uploadTab.noWorkspace'),
      });
      return;
    }
    router.push('/composer/record');
  }, [activeWorkspaceId, router, t]);

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
          onPress={() => {
            void handleGallery();
          }}
          disabled={picking || !workspace}
        />

        <PickTarget
          icon={<Video size={32} color={accent.primary} strokeWidth={1.75} />}
          title={t('uploadTab.recordNow')}
          subtitle={t('uploadTab.recordNowSub')}
          accessibilityLabel={t('uploadTab.recordNow')}
          onPress={handleRecord}
        />

        {warnBeforeCellular ? (
          <ThemedText
            variant="caption"
            tone="muted"
            style={{ marginTop: spacing.xs }}
          >
            {t('uploadTab.cellularNote')}
          </ThemedText>
        ) : null}

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
