import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  InputAccessoryView,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { useVideoPlayer, VideoView } from 'expo-video';
import type { VideoPlayer } from 'expo-video';
import {
  ChevronRight,
  Pause,
  Play,
  Tag as TagIcon,
  Volume2,
  VolumeX,
  X,
  Zap,
} from 'lucide-react-native';
import { GhostButton } from '@/components/GhostButton';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenContainer } from '@/components/ScreenContainer';
import { ThemedText } from '@/components/ThemedText';
import { ModalSheet } from '@/components/ModalSheet';
import { SecondaryButton } from '@/components/SecondaryButton';
import { DestructiveButton } from '@/components/DestructiveButton';
import { WorkspaceTypeBadge } from '@/components/WorkspaceTypeBadge';
import { useTheme } from '@/lib/theme/useTheme';
import { useTenantStore } from '@/lib/store/tenantStore';
import { useDraftStore } from '@/lib/store/draftStore';
import { useTagTopology, useWorkspace } from '@/lib/api/queries';
import type { CTA } from '@/types/api';

const TITLE_MAX = 80;
const DESCRIPTION_MAX = 500;
// Portrait-friendly cap. Width is derived from the source aspect ratio so a
// 9:16 clip renders narrow-and-tall and a landscape clip renders wide-and-
// short, with both fitting inside the same vertical budget.
const PREVIEW_MAX_HEIGHT = 320;
const PREVIEW_DEFAULT_ASPECT = 9 / 16;

const urlSchema = z
  .string()
  .min(1)
  .url()
  .regex(/^https?:\/\//);

interface InlinePreviewProps {
  uri: string;
  aspectRatio: number;
}

function InlinePreview({
  uri,
  aspectRatio,
}: InlinePreviewProps): React.ReactElement {
  const { colors, palette, radius, spacing } = useTheme();
  const { t } = useTranslation();
  const player: VideoPlayer = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.muted = false;
    p.play();
  });
  const [muted, setMuted] = useState<boolean>(false);
  const [playing, setPlaying] = useState<boolean>(true);

  // Pause when the screen loses focus (user opens tags / cta subscreens).
  // Don't auto-resume on return - they can tap to play again if they want.
  useFocusEffect(
    useCallback(() => {
      return () => {
        try {
          player.pause();
        } catch {
          // player may already be released
        }
        setPlaying(false);
      };
    }, [player]),
  );

  const togglePlay = useCallback((): void => {
    if (player.playing) {
      player.pause();
      setPlaying(false);
    } else {
      player.play();
      setPlaying(true);
    }
  }, [player]);

  const toggleMute = useCallback((): void => {
    setMuted((prev) => {
      const next = !prev;
      player.muted = next;
      return next;
    });
  }, [player]);

  // Frame fits within PREVIEW_MAX_HEIGHT while preserving the source aspect.
  // Width derives from height so portrait clips stay portrait, centered.
  const frameHeight = PREVIEW_MAX_HEIGHT;
  const frameWidth = Math.round(PREVIEW_MAX_HEIGHT * aspectRatio);

  return (
    <View style={{ alignItems: 'center' }}>
      <View
        style={[
          styles.previewFrame,
          {
            width: frameWidth,
            height: frameHeight,
            borderRadius: radius.lg,
            borderColor: colors.border,
            backgroundColor: colors.bgInput,
          },
        ]}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={togglePlay}
          accessibilityRole="button"
          accessibilityLabel={
            playing
              ? t('composer.edit.videoPause')
              : t('composer.edit.videoPlay')
          }
        >
          <VideoView
            style={StyleSheet.absoluteFill}
            player={player}
            nativeControls={false}
            contentFit="cover"
            accessibilityIgnoresInvertColors
          />
          {!playing ? (
            <View style={styles.previewOverlay} pointerEvents="none">
              <Play size={36} color={palette.white} strokeWidth={1.75} />
            </View>
          ) : null}
        </Pressable>

        <View
          style={[
            styles.previewControls,
            { right: spacing.sm, top: spacing.sm },
          ]}
        >
          <Pressable
            onPress={togglePlay}
            accessibilityRole="button"
            accessibilityLabel={
              playing
                ? t('composer.edit.videoPause')
                : t('composer.edit.videoPlay')
            }
            hitSlop={6}
            style={({ pressed }) => [
              styles.previewBtn,
              { backgroundColor: colors.bgOverlay, opacity: pressed ? 0.8 : 1 },
            ]}
          >
            {playing ? (
              <Pause size={16} color={palette.white} strokeWidth={1.75} />
            ) : (
              <Play size={16} color={palette.white} strokeWidth={1.75} />
            )}
          </Pressable>
          <Pressable
            onPress={toggleMute}
            accessibilityRole="button"
            accessibilityLabel={
              muted
                ? t('composer.edit.videoUnmute')
                : t('composer.edit.videoMute')
            }
            hitSlop={6}
            style={({ pressed }) => [
              styles.previewBtn,
              { backgroundColor: colors.bgOverlay, opacity: pressed ? 0.8 : 1 },
            ]}
          >
            {muted ? (
              <VolumeX size={16} color={palette.white} strokeWidth={1.75} />
            ) : (
              <Volume2 size={16} color={palette.white} strokeWidth={1.75} />
            )}
          </Pressable>
        </View>
      </View>
    </View>
  );
}

interface NavRowProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  onPress: () => void;
  disabled?: boolean;
  disabledHint?: string;
}

function NavRow({
  icon,
  label,
  value,
  onPress,
  disabled = false,
  disabledHint,
}: NavRowProps): React.ReactElement {
  const { colors, spacing, radius } = useTheme();
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.navRow,
        {
          backgroundColor: colors.bgCard,
          borderColor: colors.border,
          borderRadius: radius.md,
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.md,
          opacity: disabled ? 0.55 : pressed ? 0.85 : 1,
        },
      ]}
    >
      <View style={styles.navRowIcon}>{icon}</View>
      <View style={{ flex: 1, gap: 2 }}>
        <ThemedText variant="bodyMed" tone="primary">
          {label}
        </ThemedText>
        <ThemedText variant="caption" tone="muted" numberOfLines={1}>
          {disabled && disabledHint ? disabledHint : value}
        </ThemedText>
      </View>
      {!disabled ? (
        <ChevronRight
          size={20}
          color={colors.textMuted}
          strokeWidth={1.75}
        />
      ) : null}
    </Pressable>
  );
}

interface FieldProps {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (v: string) => void;
  maxLength: number;
  error?: string;
  multiline?: boolean;
  inputAccessoryViewID?: string;
  returnKeyType?: 'done' | 'next' | 'default';
  blurOnSubmit?: boolean;
}

function Field({
  label,
  placeholder,
  value,
  onChangeText,
  maxLength,
  error,
  multiline = false,
  inputAccessoryViewID,
  returnKeyType,
  blurOnSubmit,
}: FieldProps): React.ReactElement {
  const { colors, radius, spacing, accent } = useTheme();
  const [focused, setFocused] = useState<boolean>(false);
  const { t } = useTranslation();

  const borderColor = error
    ? accent.danger
    : focused
      ? colors.borderFocus
      : colors.border;

  return (
    <View>
      <View style={styles.labelRow}>
        <ThemedText variant="caption" tone="secondary" style={{ flex: 1 }}>
          {label}
        </ThemedText>
        <ThemedText variant="mono" tone="muted">
          {t('composer.edit.charCounter', {
            current: value.length,
            max: maxLength,
          })}
        </ThemedText>
      </View>
      <View
        style={[
          styles.fieldShell,
          {
            backgroundColor: colors.bgInput,
            borderColor,
            borderRadius: radius.md,
            paddingHorizontal: spacing.md,
            paddingVertical: multiline ? spacing.sm : 0,
            minHeight: multiline ? 110 : 48,
          },
        ]}
      >
        <TextInput
          value={value}
          onChangeText={(text) => onChangeText(text.slice(0, maxLength))}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          multiline={multiline}
          textAlignVertical={multiline ? 'top' : 'center'}
          maxLength={maxLength}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          returnKeyType={returnKeyType}
          blurOnSubmit={blurOnSubmit}
          inputAccessoryViewID={
            Platform.OS === 'ios' ? inputAccessoryViewID : undefined
          }
          style={[
            styles.input,
            {
              color: colors.textPrimary,
              minHeight: multiline ? 100 : 44,
            },
          ]}
          accessibilityLabel={label}
        />
      </View>
      {error ? (
        <ThemedText
          variant="caption"
          tone="danger"
          style={{ marginTop: spacing.xs }}
        >
          {error}
        </ThemedText>
      ) : null}
    </View>
  );
}

// inputAccessoryViewID for the iOS Done bar over the description (multiline
// fields don't get a Return-key dismiss).
const ACCESSORY_DONE_ID = 'composer-edit-done';

export default function ComposerEditScreen(): React.ReactElement | null {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors, spacing, accent } = useTheme();
  const insets = useSafeAreaInsets();

  const activeWorkspaceId = useTenantStore((s) => s.activeWorkspaceId);
  const workspaceQuery = useWorkspace(activeWorkspaceId);
  const tagTopologyQuery = useTagTopology(activeWorkspaceId);

  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [ctaId, setCtaId] = useState<string | null>(null);
  const [dynamicUrl, setDynamicUrl] = useState<string>('');
  const [localUri, setLocalUri] = useState<string | null>(null);
  const [previewAspect, setPreviewAspect] = useState<number>(
    PREVIEW_DEFAULT_ASPECT,
  );

  const [titleError, setTitleError] = useState<string | undefined>(undefined);

  const [discardOpen, setDiscardOpen] = useState<boolean>(false);

  // Re-sync from the draft store every focus so subscreens (tags / cta) can
  // patch the draft and have us pick up the change on return.
  useFocusEffect(
    useCallback(() => {
      if (!activeWorkspaceId) {
        router.replace('/(tabs)/profile');
        return;
      }
      const existing = useDraftStore.getState().getDraft(activeWorkspaceId);
      if (existing) {
        setTitle(existing.title);
        setDescription(existing.description);
        setTagIds(existing.tagIds);
        setCtaId(existing.ctaId);
        setDynamicUrl(existing.ctaUrl ?? '');
        setLocalUri(existing.localUri);
        if (
          existing.width != null &&
          existing.height != null &&
          existing.width > 0 &&
          existing.height > 0
        ) {
          setPreviewAspect(existing.width / existing.height);
        }
      }
    }, [activeWorkspaceId, router]),
  );

  // Persist title / description on change. Tags + CTA are persisted by the
  // subscreens themselves so we don't fight them on return.
  useEffect(() => {
    if (!activeWorkspaceId) return;
    useDraftStore.getState().patchDraft(activeWorkspaceId, {
      title,
      description,
    });
  }, [activeWorkspaceId, title, description]);

  const workspace = workspaceQuery.data ?? null;
  const allowedCtas: CTA[] = workspace?.capabilities.allowedCtas ?? [];
  const tagsEnabled: boolean =
    workspace?.capabilities.creatorTagsEnabled ?? false;
  const tagTopology = tagTopologyQuery.data ?? [];

  const tagSummary: string = useMemo(() => {
    if (!tagsEnabled) return t('composer.edit.tagsRowDisabled');
    if (tagIds.length === 0) return t('composer.edit.tagsRowEmpty');
    return t('composer.edit.tagsRowCount', { count: tagIds.length });
  }, [tagsEnabled, tagIds.length, t]);

  const selectedCta: CTA | null = useMemo(() => {
    if (!ctaId) return null;
    return allowedCtas.find((c) => c.id === ctaId) ?? null;
  }, [allowedCtas, ctaId]);

  const ctaSummary: string = useMemo(() => {
    if (allowedCtas.length === 0) return t('composer.edit.ctaRowDisabled');
    if (!selectedCta) return t('composer.edit.ctaRowEmpty');
    return selectedCta.label;
  }, [allowedCtas.length, selectedCta, t]);

  const handleClose = useCallback(() => {
    setDiscardOpen(true);
  }, []);

  const handleDiscard = useCallback(() => {
    if (activeWorkspaceId) {
      useDraftStore.getState().clearDraft(activeWorkspaceId);
    }
    setDiscardOpen(false);
    router.back();
  }, [activeWorkspaceId, router]);

  const handleStay = useCallback(() => {
    setDiscardOpen(false);
  }, []);

  const validate = useCallback((): boolean => {
    let valid = true;
    const trimmed = title.trim();
    if (trimmed.length < 1 || trimmed.length > TITLE_MAX) {
      setTitleError(t('composer.edit.titleRequired'));
      valid = false;
    } else {
      setTitleError(undefined);
    }
    if (selectedCta && selectedCta.kind === 'dynamic') {
      const parsed = urlSchema.safeParse(dynamicUrl);
      if (!parsed.success) {
        // CTA url errors are surfaced on the CTA subscreen; show a toast
        // here so the user knows where to look.
        valid = false;
      }
    }
    return valid;
  }, [title, selectedCta, dynamicUrl, t]);

  const handlePreview = useCallback(() => {
    if (!activeWorkspaceId) return;
    if (!validate()) return;
    useDraftStore.getState().patchDraft(activeWorkspaceId, {
      title: title.trim(),
      description,
      tagIds,
      ctaId,
      ctaUrl:
        selectedCta && selectedCta.kind === 'dynamic' ? dynamicUrl : null,
    });
    router.push('/composer/preview');
  }, [
    activeWorkspaceId,
    validate,
    title,
    description,
    tagIds,
    ctaId,
    dynamicUrl,
    selectedCta,
    router,
  ]);

  const handleOpenTags = useCallback(() => {
    router.push('/composer/tags');
  }, [router]);

  const handleOpenCta = useCallback(() => {
    router.push('/composer/cta');
  }, [router]);

  if (!activeWorkspaceId || !workspace) return null;

  const tagTopologyEmpty: boolean =
    tagsEnabled && tagTopology.length === 0;

  return (
    <ScreenContainer edges={['top', 'left', 'right']} bg="bg">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View
          style={[
            styles.headerBar,
            {
              borderBottomColor: colors.border,
              paddingHorizontal: spacing.md,
            },
          ]}
        >
          <Pressable
            onPress={handleClose}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={t('composer.edit.close')}
            style={styles.headerLeft}
          >
            <X size={22} color={colors.textPrimary} strokeWidth={1.75} />
          </Pressable>
          <ThemedText variant="heading" style={styles.headerTitle}>
            {t('composer.edit.title')}
          </ThemedText>
          <View style={styles.headerRight}>
            <WorkspaceTypeBadge type={workspace.type} />
          </View>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          automaticallyAdjustKeyboardInsets
          contentContainerStyle={{
            padding: spacing.md,
            paddingBottom: spacing.xxl,
            gap: spacing.md,
          }}
        >
          {/* Inline video preview */}
          {localUri ? (
            <InlinePreview uri={localUri} aspectRatio={previewAspect} />
          ) : null}

          {/* Details */}
          <View style={{ gap: spacing.md }}>
            <Field
              label={t('composer.edit.titleLabel')}
              placeholder={t('composer.edit.titlePlaceholder')}
              value={title}
              onChangeText={setTitle}
              maxLength={TITLE_MAX}
              error={titleError}
              returnKeyType="done"
              blurOnSubmit
            />
            <Field
              label={t('composer.edit.descriptionLabel')}
              placeholder={t('composer.edit.descriptionPlaceholder')}
              value={description}
              onChangeText={setDescription}
              maxLength={DESCRIPTION_MAX}
              multiline
              inputAccessoryViewID={ACCESSORY_DONE_ID}
            />
          </View>

          {/* Tags row */}
          {tagsEnabled || tagTopologyEmpty ? (
            <NavRow
              icon={
                <TagIcon
                  size={18}
                  color={accent.primary}
                  strokeWidth={1.75}
                />
              }
              label={t('composer.edit.tagsRowLabel')}
              value={tagSummary}
              onPress={handleOpenTags}
              disabled={!tagsEnabled || tagTopology.length === 0}
              disabledHint={
                !tagsEnabled
                  ? t('composer.edit.tagsRowDisabled')
                  : t('composer.tagsScreen.emptyTitle')
              }
            />
          ) : null}

          {/* CTA row */}
          <NavRow
            icon={
              <Zap
                size={18}
                color={accent.primary}
                strokeWidth={1.75}
              />
            }
            label={t('composer.edit.ctaRowLabel')}
            value={ctaSummary}
            onPress={handleOpenCta}
            disabled={allowedCtas.length === 0}
            disabledHint={t('composer.edit.ctaRowDisabled')}
          />
        </ScrollView>

        {/* Sticky bottom bar - manual safe-area inset so we can drop the
            ScreenContainer "bottom" edge that fights KeyboardAvoidingView. */}
        <View
          style={[
            styles.bottomBar,
            {
              borderTopColor: colors.border,
              backgroundColor: colors.bg,
              paddingHorizontal: spacing.md,
              paddingTop: spacing.sm,
              paddingBottom: spacing.sm + insets.bottom,
              gap: spacing.sm,
            },
          ]}
        >
          <View style={{ flex: 1 }}>
            <GhostButton
              label={t('composer.edit.cancel')}
              accessibilityLabel={t('composer.edit.cancel')}
              onPress={handleClose}
              fullWidth
            />
          </View>
          <View style={{ flex: 1 }}>
            <PrimaryButton
              label={t('composer.edit.preview')}
              accessibilityLabel={t('composer.edit.preview')}
              onPress={handlePreview}
              disabled={title.trim().length === 0}
            />
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* iOS Done bar over the multiline description. Android shows the
          system "back" gesture or returnKeyType="done" on single fields,
          so this is iOS-only. */}
      {Platform.OS === 'ios' ? (
        <InputAccessoryView nativeID={ACCESSORY_DONE_ID}>
          <View
            style={[
              styles.accessoryBar,
              {
                backgroundColor: colors.bgElevated,
                borderTopColor: colors.border,
                paddingHorizontal: spacing.md,
              },
            ]}
          >
            <Pressable
              onPress={() => Keyboard.dismiss()}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={t('composer.edit.keyboardDone')}
              style={({ pressed }) => [
                styles.accessoryBtn,
                { opacity: pressed ? 0.6 : 1 },
              ]}
            >
              <ThemedText
                variant="bodyMed"
                style={{ color: accent.primary }}
              >
                {t('composer.edit.keyboardDone')}
              </ThemedText>
            </Pressable>
          </View>
        </InputAccessoryView>
      ) : null}

      <ModalSheet
        visible={discardOpen}
        onClose={handleStay}
        title={t('composer.edit.discardTitle')}
        height="40%"
      >
        <View style={{ padding: spacing.lg, gap: spacing.md }}>
          <ThemedText variant="body" tone="secondary">
            {t('composer.edit.discardBody')}
          </ThemedText>
          <DestructiveButton
            label={t('composer.edit.discard')}
            accessibilityLabel={t('composer.edit.discard')}
            onPress={handleDiscard}
          />
          <SecondaryButton
            label={t('composer.edit.stay')}
            accessibilityLabel={t('composer.edit.stay')}
            onPress={handleStay}
          />
        </View>
      </ModalSheet>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    borderBottomWidth: 1,
  },
  headerLeft: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  headerRight: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
  },
  previewFrame: {
    overflow: 'hidden',
    borderWidth: 1,
    position: 'relative',
  },
  previewOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  previewControls: {
    position: 'absolute',
    flexDirection: 'row',
    gap: 6,
  },
  previewBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navRow: {
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  navRowIcon: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldShell: {
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  input: {
    flex: 1,
    fontFamily: 'Outfit_400Regular',
    fontSize: 15,
    // Pin letterSpacing explicitly. iOS sometimes injects default
    // tracking on single-line TextInput placeholders that doesn't match
    // multiline. Setting 0 keeps the placeholder visually consistent
    // across both fields.
    letterSpacing: 0,
    paddingVertical: 0,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  bottomBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
  },
  accessoryBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    minHeight: 44,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  accessoryBtn: {
    minHeight: 44,
    minWidth: 60,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
