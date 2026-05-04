// In-app camera screen. Vertical-only 720p H.264 recording capped at the
// active workspace's `maxVideoSeconds` capability. After stop the clip is
// validated locally and the draft is seeded so the composer/edit screen
// prefills automatically.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { CameraView } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Mic,
  MicOff,
  SwitchCamera,
  Video as VideoIcon,
  X,
  Zap,
  ZapOff,
} from 'lucide-react-native';
import { EmptyState } from '@/components/EmptyState';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenContainer } from '@/components/ScreenContainer';
import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/lib/theme/useTheme';
import { useTenantStore } from '@/lib/store/tenantStore';
import { useDraftStore } from '@/lib/store/draftStore';
import { useMemberships } from '@/lib/api/queries';
import { showToast } from '@/lib/toast';
import {
  finalizeCameraResult,
  requestCameraPermission,
  requestMicrophonePermission,
  validateMedia,
  videoErrorI18nKey,
  isVideoPipelineError,
} from '@/lib/video';

type Facing = 'front' | 'back';
type FlashMode = 'off' | 'on';
type PermState = 'unknown' | 'granted' | 'denied';

const TICK_MS = 100;

export default function ComposerRecordScreen(): React.ReactElement {
  const router = useRouter();
  const { t } = useTranslation();
  const { spacing, accent, palette, radius } = useTheme();
  const insets = useSafeAreaInsets();

  const cameraRef = useRef<CameraView | null>(null);

  const activeWorkspaceId = useTenantStore((s) => s.activeWorkspaceId);
  const membershipsQuery = useMemberships();
  const activeWorkspace = useMemo(() => {
    if (!activeWorkspaceId) return null;
    const list = membershipsQuery.data ?? [];
    const m = list.find((mem) => mem.workspace.id === activeWorkspaceId);
    return m?.workspace ?? null;
  }, [activeWorkspaceId, membershipsQuery.data]);

  const maxVideoSeconds: number = activeWorkspace?.capabilities.maxVideoSeconds ?? 60;

  const [cameraPerm, setCameraPerm] = useState<PermState>('unknown');
  const [micPerm, setMicPerm] = useState<PermState>('unknown');
  const [facing, setFacing] = useState<Facing>('back');
  const [flash, setFlash] = useState<FlashMode>('off');
  const [muted, setMuted] = useState<boolean>(false);
  const [recording, setRecording] = useState<boolean>(false);
  const [elapsedMs, setElapsedMs] = useState<number>(0);
  const [busy, setBusy] = useState<boolean>(false);

  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef<number>(0);
  const stopRequestedRef = useRef<boolean>(false);

  const requestPerms = useCallback(async () => {
    const cam = await requestCameraPermission();
    setCameraPerm(cam ? 'granted' : 'denied');
    const mic = await requestMicrophonePermission();
    setMicPerm(mic ? 'granted' : 'denied');
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (cameraPerm === 'unknown' || micPerm === 'unknown') {
        void requestPerms();
      }
    }, [cameraPerm, micPerm, requestPerms]),
  );

  // Bounce out if no active workspace.
  useEffect(() => {
    if (!activeWorkspaceId) {
      router.replace('/(tabs)/profile');
    }
  }, [activeWorkspaceId, router]);

  const stopTick = useCallback(() => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }, []);

  useEffect(() => stopTick, [stopTick]);

  const handleClose = useCallback(() => {
    if (recording) {
      stopRequestedRef.current = true;
      try {
        cameraRef.current?.stopRecording();
      } catch {
        // ignore - the recordAsync promise will reject and we'll bail
      }
    }
    router.back();
  }, [recording, router]);

  const handleFlip = useCallback(() => {
    if (recording) return;
    setFacing((f) => (f === 'back' ? 'front' : 'back'));
  }, [recording]);

  const handleFlashToggle = useCallback(() => {
    setFlash((f) => (f === 'off' ? 'on' : 'off'));
  }, []);

  const handleMicToggle = useCallback(() => {
    if (recording) return;
    setMuted((m) => !m);
  }, [recording]);

  const finishRecording = useCallback(
    async (rawUri: string, durationMs: number) => {
      if (!activeWorkspaceId || !activeWorkspace) return;
      try {
        const asset = await finalizeCameraResult(
          { uri: rawUri },
          durationMs,
          720,
          1280,
          null,
          'video/mp4',
        );
        const validated = await validateMedia(
          asset,
          activeWorkspace.capabilities,
        );
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
        router.replace('/composer/edit');
      } catch (err) {
        const key = videoErrorI18nKey(err);
        const params = isVideoPipelineError(err) ? err.params : {};
        showToast({
          variant: 'danger',
          message: t(key, params as Record<string, string | number>),
        });
      }
    },
    [activeWorkspaceId, activeWorkspace, router, t],
  );

  const handleRecordPress = useCallback(async () => {
    // Tap-to-stop must work even though `busy` is true while the recordAsync
    // promise is in flight. Only block press when we're busy AND not yet
    // recording (e.g. permission request or post-stop processing).
    if (busy && !recording) return;
    if (cameraPerm !== 'granted') {
      void requestPerms();
      return;
    }
    if (recording) {
      stopRequestedRef.current = true;
      try {
        cameraRef.current?.stopRecording();
      } catch {
        // ignore
      }
      return;
    }

    if (!cameraRef.current) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
    setBusy(true);
    setRecording(true);
    setElapsedMs(0);
    startedAtRef.current = Date.now();
    stopRequestedRef.current = false;

    tickRef.current = setInterval(() => {
      const elapsed = Date.now() - startedAtRef.current;
      setElapsedMs(elapsed);
      // Safety stop: in case the maxDuration native enforcement is off by a
      // little, force a stop ~250ms after the configured limit.
      if (elapsed >= maxVideoSeconds * 1000 + 250 && !stopRequestedRef.current) {
        stopRequestedRef.current = true;
        try {
          cameraRef.current?.stopRecording();
        } catch {
          // ignore
        }
      }
    }, TICK_MS);

    try {
      const result = await cameraRef.current.recordAsync({
        maxDuration: maxVideoSeconds,
        // 'avc1' is H.264 baseline on iOS. On Android the codec is already
        // H.264 by default at 720p. avc1 is ignored on Android. Mute is a
        // CameraView prop, not a recordAsync option.
        codec: 'avc1',
      });
      stopTick();
      setRecording(false);
      const elapsed = Date.now() - startedAtRef.current;
      if (result && result.uri) {
        await finishRecording(result.uri, elapsed);
      }
    } catch (err) {
      stopTick();
      setRecording(false);
      const key = videoErrorI18nKey(err);
      const params = isVideoPipelineError(err) ? err.params : {};
      showToast({
        variant: 'danger',
        message: t(key, params as Record<string, string | number>),
      });
    } finally {
      setBusy(false);
    }
  }, [
    busy,
    cameraPerm,
    requestPerms,
    recording,
    maxVideoSeconds,
    muted,
    finishRecording,
    stopTick,
    t,
  ]);

  const handleOpenSettings = useCallback(() => {
    void Linking.openSettings();
  }, []);

  // Permission gate.
  if (cameraPerm === 'denied' || micPerm === 'denied') {
    return (
      <ScreenContainer
        edges={['top', 'left', 'right', 'bottom']}
        bg="bg"
        padded
      >
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            gap: spacing.md,
          }}
        >
          <EmptyState
            icon={VideoIcon}
            title={t('composer.record.permissionTitle')}
            description={t('composer.record.permissionBody')}
            cta={
              <View style={{ minWidth: 220 }}>
                <PrimaryButton
                  label={t('composer.record.openSettings')}
                  accessibilityLabel={t('composer.record.openSettings')}
                  onPress={handleOpenSettings}
                />
              </View>
            }
          />
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel={t('common.cancel')}
            style={{ padding: spacing.sm, minWidth: 44, minHeight: 44 }}
          >
            <ThemedText variant="body" tone="secondary">
              {t('common.cancel')}
            </ThemedText>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  if (cameraPerm === 'unknown' || micPerm === 'unknown') {
    return (
      <ScreenContainer edges={['top', 'left', 'right', 'bottom']} bg="bg" padded>
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ThemedText variant="body" tone="secondary">
            {t('common.loading')}
          </ThemedText>
        </View>
      </ScreenContainer>
    );
  }

  const elapsedSec = Math.floor(elapsedMs / 1000);
  const remainingSec = Math.max(0, maxVideoSeconds - elapsedSec);
  const progress = Math.min(1, elapsedMs / (maxVideoSeconds * 1000));
  const ringSize = 84;
  const innerSize = ringSize - 12;
  const recordButtonAccessibilityLabel = recording
    ? t('composer.record.stop')
    : t('composer.record.start');

  return (
    <View style={{ flex: 1, backgroundColor: palette.black }}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing={facing}
        flash={flash}
        mode="video"
        videoQuality="720p"
        mute={muted}
        responsiveOrientationWhenOrientationLocked={false}
      />

      {/* Top bar */}
      <View
        style={[
          styles.topBar,
          {
            paddingTop: insets.top + spacing.xs,
            paddingHorizontal: spacing.md,
          },
        ]}
        pointerEvents="box-none"
      >
        <Pressable
          onPress={handleClose}
          accessibilityRole="button"
          accessibilityLabel={t('composer.record.close')}
          hitSlop={12}
          style={[styles.iconButton, { backgroundColor: 'rgba(0,0,0,0.4)' }]}
        >
          <X size={22} color={palette.white} strokeWidth={1.75} />
        </Pressable>

        <View
          style={[
            styles.timerPill,
            {
              backgroundColor: recording ? accent.danger : 'rgba(0,0,0,0.4)',
              paddingHorizontal: spacing.sm,
            },
          ]}
        >
          <ThemedText variant="mono" style={{ color: palette.white }}>
            {`${pad(elapsedSec)} / ${pad(maxVideoSeconds)}`}
          </ThemedText>
        </View>

        <View style={{ flexDirection: 'row', gap: spacing.xs }}>
          <Pressable
            onPress={handleFlashToggle}
            accessibilityRole="button"
            accessibilityLabel={t(
              flash === 'on'
                ? 'composer.record.flashOn'
                : 'composer.record.flashOff',
            )}
            hitSlop={12}
            style={[styles.iconButton, { backgroundColor: 'rgba(0,0,0,0.4)' }]}
          >
            {flash === 'on' ? (
              <Zap size={22} color={accent.warning} strokeWidth={1.75} />
            ) : (
              <ZapOff size={22} color={palette.white} strokeWidth={1.75} />
            )}
          </Pressable>
          <Pressable
            onPress={handleMicToggle}
            accessibilityRole="button"
            accessibilityLabel={t(
              muted ? 'composer.record.micOff' : 'composer.record.micOn',
            )}
            hitSlop={12}
            style={[styles.iconButton, { backgroundColor: 'rgba(0,0,0,0.4)' }]}
          >
            {muted ? (
              <MicOff size={22} color={palette.white} strokeWidth={1.75} />
            ) : (
              <Mic size={22} color={palette.white} strokeWidth={1.75} />
            )}
          </Pressable>
          <Pressable
            onPress={handleFlip}
            accessibilityRole="button"
            accessibilityLabel={t('composer.record.flip')}
            hitSlop={12}
            disabled={recording}
            style={[
              styles.iconButton,
              {
                backgroundColor: 'rgba(0,0,0,0.4)',
                opacity: recording ? 0.5 : 1,
              },
            ]}
          >
            <SwitchCamera size={22} color={palette.white} strokeWidth={1.75} />
          </Pressable>
        </View>
      </View>

      {/* Bottom record button + countdown */}
      <View
        style={[
          styles.bottomBar,
          {
            paddingBottom: insets.bottom + spacing.lg,
            paddingHorizontal: spacing.lg,
          },
        ]}
        pointerEvents="box-none"
      >
        <View
          style={{
            alignItems: 'center',
            justifyContent: 'center',
            gap: spacing.sm,
          }}
        >
          <ThemedText
            variant="caption"
            style={{ color: palette.white, opacity: 0.85 }}
          >
            {t('composer.record.remaining', { seconds: remainingSec })}
          </ThemedText>
          <Pressable
            onPress={handleRecordPress}
            accessibilityRole="button"
            accessibilityLabel={recordButtonAccessibilityLabel}
            disabled={busy && !recording}
            style={[
              styles.recordRing,
              {
                width: ringSize,
                height: ringSize,
                borderRadius: ringSize / 2,
                borderColor: recording ? accent.danger : palette.white,
                opacity: progress > 0 && progress < 1 ? 0.95 : 1,
              },
            ]}
          >
            <View
              style={{
                width: innerSize,
                height: innerSize,
                borderRadius: recording
                  ? radius.sm
                  : innerSize / 2,
                backgroundColor: recording ? accent.danger : palette.white,
              }}
            />
          </Pressable>
          <ThemedText
            variant="caption"
            style={{ color: palette.white, opacity: 0.7 }}
          >
            {t('composer.record.hint')}
          </ThemedText>
        </View>
      </View>

      {/* Subtle vertical guide for the platform note. Some Android devices
          ignore portrait lock; the guide reminds the user to hold the
          device upright. */}
      {Platform.OS === 'android' ? (
        <View
          style={[
            styles.portraitHint,
            { paddingHorizontal: spacing.sm, top: insets.top + 64 },
          ]}
          pointerEvents="none"
        >
          <ThemedText
            variant="caption"
            style={{ color: palette.white, opacity: 0.7, textAlign: 'center' }}
          >
            {t('composer.record.portraitHint')}
          </ThemedText>
        </View>
      ) : null}

    </View>
  );
}

function pad(n: number): string {
  const v = Math.max(0, Math.floor(n));
  return v < 10 ? `0${v}` : `${v}`;
}

const styles = StyleSheet.create({
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconButton: {
    minWidth: 44,
    minHeight: 44,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerPill: {
    minHeight: 32,
    paddingVertical: 6,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  recordRing: {
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  portraitHint: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
});
