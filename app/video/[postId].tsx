import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  View,
} from 'react-native';
import type { NativeSyntheticEvent } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import PagerView from 'react-native-pager-view';
import { useVideoPlayer, VideoView } from 'expo-video';
import type { VideoPlayer } from 'expo-video';
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  Film,
  Heart,
  Info,
  MoreHorizontal,
  Pencil,
  Play,
  Pause,
  Share2,
  ThumbsDown,
  Trash2,
  Volume2,
  VolumeX,
} from 'lucide-react-native';
import { Card } from '@/components/Card';
import { DestructiveButton } from '@/components/DestructiveButton';
import { EmptyState } from '@/components/EmptyState';
import { CtaButton } from '@/components/CtaButton';
import { ModalSheet } from '@/components/ModalSheet';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenContainer } from '@/components/ScreenContainer';
import { SecondaryButton } from '@/components/SecondaryButton';
import { StatusBadge } from '@/components/StatusBadge';
import { TagPill } from '@/components/TagPill';
import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/lib/theme/useTheme';
import { useTenantStore } from '@/lib/store/tenantStore';
import { useLanguageStore } from '@/lib/store/languageStore';
import { useDraftStore } from '@/lib/store/draftStore';
import {
  keys,
  useDeletePost,
  useMyPosts,
  useTagTopology,
} from '@/lib/api/queries';
import { showToast } from '@/lib/toast';
import { buildPostUrl } from '@/lib/deeplinks/parser';
import type { CTA, Post, TagCategory } from '@/types/api';

// Cap so a tall vertical video doesn't dominate the screen.
const VIDEO_MAX_HEIGHT_PCT = 0.55;
const CONTROL_HIDE_MS = 2000;
// Default to a vertical 9:16 frame when the post has no recorded media specs.
const DEFAULT_ASPECT = 9 / 16;

function formatFileSize(bytes: number | undefined): string {
  if (!bytes || bytes <= 0) return '-';
  if (bytes >= 1024 * 1024) {
    const mb = bytes / (1024 * 1024);
    return `${mb >= 10 ? Math.round(mb) : mb.toFixed(1)} MB`;
  }
  if (bytes >= 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }
  return `${bytes} B`;
}

function formatResolution(w: number | undefined, h: number | undefined): string {
  if (!w || !h) return '-';
  return `${w} x ${h}`;
}

interface PageScrollEventData {
  position: number;
}

function formatPostedDate(iso: string, locale: string): string {
  try {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return iso;
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  } catch {
    return iso;
  }
}

function formatNumber(value: number, locale: string): string {
  try {
    return new Intl.NumberFormat(locale).format(value);
  } catch {
    return String(value);
  }
}

function formatPercent(rate: number, locale: string): string {
  // rate is stored as 0..1 in PostStats.
  const pct = Math.round(rate * 100);
  try {
    return `${new Intl.NumberFormat(locale).format(pct)}%`;
  } catch {
    return `${pct}%`;
  }
}

interface StatTileProps {
  label: string;
  value: string;
}

function StatTile({ label, value }: StatTileProps): React.ReactElement {
  const { spacing } = useTheme();
  return (
    <Card padded style={styles.statTile}>
      <ThemedText variant="title" tone="primary">
        {value}
      </ThemedText>
      <ThemedText
        variant="mono"
        tone="muted"
        style={{ marginTop: spacing.xxs }}
      >
        {label}
      </ThemedText>
    </Card>
  );
}

interface CtaPreviewProps {
  cta: CTA;
  ctaUrl: string | null | undefined;
}

function CtaPreview({ cta, ctaUrl }: CtaPreviewProps): React.ReactElement {
  const { spacing } = useTheme();
  const display: string = cta.kind === 'static' ? cta.url : (ctaUrl ?? '');

  return (
    <View style={{ gap: spacing.xs }}>
      <CtaButton cta={cta} fullWidth />
      {display ? (
        <ThemedText variant="mono" tone="muted" numberOfLines={1}>
          {display}
        </ThemedText>
      ) : null}
    </View>
  );
}

interface PostPageProps {
  post: Post;
  isActive: boolean;
  tagCategories: TagCategory[];
  screenWidth: number;
  screenHeight: number;
}

function PostPage({
  post,
  isActive,
  tagCategories,
  screenWidth,
  screenHeight,
}: PostPageProps): React.ReactElement {
  const { t } = useTranslation();
  const { colors, spacing, radius, palette, accent } = useTheme();
  const locale = useLanguageStore((s) => s.resolved);

  const [adminNoteOpen, setAdminNoteOpen] = useState<boolean>(false);
  const [statusOpen, setStatusOpen] = useState<boolean>(false);
  const [specsOpen, setSpecsOpen] = useState<boolean>(false);
  const [descExpanded, setDescExpanded] = useState<boolean>(false);
  const [muted, setMuted] = useState<boolean>(true);
  const [showControls, setShowControls] = useState<boolean>(true);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [playing, setPlaying] = useState<boolean>(false);

  // Char threshold beyond which the description gets a Show more / Show less
  // toggle. ~140 chars roughly fits 3 lines at body size.
  const DESC_TRUNCATE_AT = 140;
  const descIsLong: boolean = (post.description?.length ?? 0) > DESC_TRUNCATE_AT;

  // Compute frame dimensions from the post's intrinsic media aspect, capped
  // by both the screen width (minus side margin) and a max screen-height
  // percentage so very tall vertical videos still leave room for content.
  const frame = useMemo<{ width: number; height: number }>(() => {
    const aspect: number =
      post.mediaWidth && post.mediaHeight
        ? post.mediaWidth / post.mediaHeight
        : DEFAULT_ASPECT;
    const maxWidth = screenWidth - 32; // 16 each side
    const maxHeight = screenHeight * VIDEO_MAX_HEIGHT_PCT;
    let height = maxWidth / aspect;
    let width = maxWidth;
    if (height > maxHeight) {
      height = maxHeight;
      width = height * aspect;
    }
    return { width: Math.round(width), height: Math.round(height) };
  }, [post.mediaWidth, post.mediaHeight, screenWidth, screenHeight]);

  const player: VideoPlayer = useVideoPlayer(post.mediaUrl || null, (p) => {
    p.loop = true;
    p.muted = true;
  });

  // Drive play/pause from active flag.
  useEffect(() => {
    if (!post.mediaUrl) return;
    if (isActive) {
      player.muted = muted;
      player.play();
      setPlaying(true);
    } else {
      player.pause();
      setPlaying(false);
    }
  }, [isActive, player, post.mediaUrl, muted]);

  // Auto-hide controls.
  useEffect(() => {
    if (!showControls) return;
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      setShowControls(false);
    }, CONTROL_HIDE_MS);
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [showControls]);

  const togglePlay = useCallback((): void => {
    if (!post.mediaUrl) return;
    if (player.playing) {
      player.pause();
      setPlaying(false);
    } else {
      player.play();
      setPlaying(true);
    }
    setShowControls(true);
  }, [player, post.mediaUrl]);

  const toggleMute = useCallback((): void => {
    setMuted((prev) => {
      const next = !prev;
      player.muted = next;
      return next;
    });
    setShowControls(true);
  }, [player]);

  // Group the post's tagIds back under their TagCategory headings so the
  // detail screen reflects the workspace's category structure (Property
  // type / Topic / Audience etc.) instead of a flat list. Categories with
  // zero matching tags are omitted entirely.
  const tagsByCategory = useMemo<
    Array<{ id: string; name: string; tags: string[] }>
  >(() => {
    const selected = new Set(post.tagIds);
    return tagCategories
      .map((cat) => ({
        id: cat.id,
        name: cat.name,
        tags: cat.tags.filter((tg) => selected.has(tg.id)).map((tg) => tg.name),
      }))
      .filter((cat) => cat.tags.length > 0);
  }, [post.tagIds, tagCategories]);
  const hasTags: boolean = tagsByCategory.length > 0;

  const playerOverlayLabel = playing ? t('video.playToggle') : t('video.playToggle');

  const statusKey: string =
    post.status === 'needs_edits' ? 'needsEdits' : post.status;
  const statusLabel: string = t(`status.${statusKey}`);
  const statusDescription: string = t(`status.descriptions.${statusKey}`);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingBottom: spacing.xxxl,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Video frame - scrolls together with the body */}
      <View
        style={[
          styles.frameStage,
          { paddingTop: spacing.md, paddingBottom: spacing.md },
        ]}
      >
        <View
          style={[
            styles.frame,
            {
              width: frame.width,
              height: frame.height,
              borderRadius: radius.lg,
              borderColor: colors.border,
              backgroundColor: colors.bgInput,
            },
          ]}
        >
          {post.mediaUrl ? (
            <Pressable
              style={styles.playerPressable}
              onPress={togglePlay}
              accessibilityRole="button"
              accessibilityLabel={playerOverlayLabel}
            >
              <VideoView
                style={StyleSheet.absoluteFill}
                player={player}
                nativeControls={false}
                contentFit="cover"
                accessibilityIgnoresInvertColors
              />
              {showControls ? (
                <View
                  pointerEvents="none"
                  style={[
                    styles.playOverlay,
                    { backgroundColor: colors.bgOverlay },
                  ]}
                >
                  {playing ? (
                    <Pause
                      size={42}
                      color={palette.white}
                      strokeWidth={1.75}
                    />
                  ) : (
                    <Play size={42} color={palette.white} strokeWidth={1.75} />
                  )}
                </View>
              ) : null}
            </Pressable>
          ) : (
            <View style={styles.placeholderCenter}>
              <Film size={42} color={colors.textMuted} strokeWidth={1.75} />
              <ThemedText
                variant="caption"
                tone="muted"
                style={{ marginTop: spacing.sm, textAlign: 'center' }}
              >
                {t('video.scaffoldNoPreview')}
              </ThemedText>
            </View>
          )}

          {/* Volume toggle - top-right inside frame */}
          {post.mediaUrl ? (
            <Pressable
              onPress={toggleMute}
              accessibilityRole="button"
              accessibilityLabel={t('video.volumeToggle')}
              style={({ pressed }) => [
                styles.volumeButton,
                {
                  backgroundColor: colors.bgOverlay,
                  borderRadius: radius.pill,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
              hitSlop={8}
            >
              {muted ? (
                <VolumeX
                  size={16}
                  color={palette.white}
                  strokeWidth={1.75}
                />
              ) : (
                <Volume2 size={16} color={palette.white} strokeWidth={1.75} />
              )}
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* Body */}
      <View
        style={{
          paddingHorizontal: spacing.md,
          gap: spacing.md,
        }}
      >
        {/* Title + description (right under the video) */}
        <View style={{ gap: spacing.xs }}>
          <ThemedText variant="heading" tone="primary">
            {post.title}
          </ThemedText>
          <ThemedText
            variant="body"
            tone={post.description ? 'secondary' : 'muted'}
            numberOfLines={
              !post.description ? 1 : descExpanded ? undefined : 3
            }
          >
            {post.description || t('video.noDescription')}
          </ThemedText>
          {descIsLong ? (
            <Pressable
              onPress={() => setDescExpanded((v) => !v)}
              accessibilityRole="button"
              accessibilityLabel={
                descExpanded ? t('video.showLess') : t('video.showMore')
              }
              hitSlop={6}
            >
              <ThemedText
                variant="caption"
                style={{ color: accent.primary, fontFamily: 'Outfit_600SemiBold' }}
              >
                {descExpanded ? t('video.showLess') : t('video.showMore')}
              </ThemedText>
            </Pressable>
          ) : null}
        </View>

        {/* Status + specs row */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('video.openStatus')}
            onPress={() => setStatusOpen(true)}
            hitSlop={6}
          >
            <StatusBadge
              status={post.status}
              surface="overSurface"
              label={statusLabel}
            />
          </Pressable>
          {post.adminNote ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('video.openAdminNote')}
              onPress={() => setAdminNoteOpen(true)}
              style={{ flex: 1 }}
              hitSlop={6}
            >
              <ThemedText
                variant="caption"
                tone="secondary"
                numberOfLines={1}
              >
                {post.adminNote}
              </ThemedText>
            </Pressable>
          ) : (
            <View style={{ flex: 1 }} />
          )}
          <Pressable
            onPress={() => setSpecsOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={t('video.specs.open')}
            style={({ pressed }) => [
              styles.specsChip,
              {
                backgroundColor: colors.bgInput,
                borderRadius: radius.pill,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
            hitSlop={6}
          >
            <Info
              size={13}
              color={colors.textSecondary}
              strokeWidth={1.75}
            />
            <ThemedText
              variant="mono"
              style={{ color: colors.textPrimary, fontSize: 11, marginLeft: 6 }}
            >
              {formatFileSize(post.fileSizeBytes)}
            </ThemedText>
          </Pressable>
        </View>

        {/* Engagement chips */}
        <View style={styles.engagementRow}>
          <View
            style={[
              styles.engagementChip,
              { backgroundColor: colors.bgInput, borderRadius: radius.pill },
            ]}
          >
            <Heart size={14} color={accent.danger} strokeWidth={1.75} />
            <ThemedText
              variant="caption"
              style={{ color: colors.textPrimary, marginLeft: 6 }}
            >
              {formatNumber(post.stats.likes ?? 0, locale)}
            </ThemedText>
          </View>
          <View
            style={[
              styles.engagementChip,
              { backgroundColor: colors.bgInput, borderRadius: radius.pill },
            ]}
          >
            <ThumbsDown
              size={14}
              color={colors.textSecondary}
              strokeWidth={1.75}
            />
            <ThemedText
              variant="caption"
              style={{ color: colors.textPrimary, marginLeft: 6 }}
            >
              {formatNumber(post.stats.dislikes ?? 0, locale)}
            </ThemedText>
          </View>
          <View
            style={[
              styles.engagementChip,
              { backgroundColor: colors.bgInput, borderRadius: radius.pill },
            ]}
          >
            <Share2
              size={14}
              color={colors.textSecondary}
              strokeWidth={1.75}
            />
            <ThemedText
              variant="caption"
              style={{ color: colors.textPrimary, marginLeft: 6 }}
            >
              {formatNumber(post.stats.shares ?? 0, locale)}
            </ThemedText>
          </View>
        </View>

        {/* Stats grid 2x2 */}
        <View style={styles.statsGrid}>
          <View style={styles.statRow}>
            <StatTile
              label={t('video.statsLabels.views')}
              value={formatNumber(post.stats.views, locale)}
            />
            <StatTile
              label={t('video.statsLabels.clicks')}
              value={formatNumber(post.stats.clicks, locale)}
            />
          </View>
          <View style={styles.statRow}>
            <StatTile
              label={t('video.statsLabels.watchThroughRate')}
              value={formatPercent(post.stats.watchThroughRate, locale)}
            />
            <StatTile
              label={t('video.statsLabels.avgWatch')}
              value={t('video.secondsShort', {
                seconds: formatNumber(
                  Math.round(post.stats.avgWatchSeconds),
                  locale,
                ),
              })}
            />
          </View>
        </View>

        {/* Timeline - lifecycle timestamps */}
        <View
          style={[
            styles.timelineCard,
            {
              borderColor: colors.border,
              borderRadius: radius.lg,
              backgroundColor: colors.bgCard,
            },
          ]}
        >
          <ThemedText
            variant="mono"
            tone="muted"
            style={{ marginBottom: spacing.sm }}
          >
            {t('video.timeline.title')}
          </ThemedText>
          <TimelineRow
            label={t('video.timeline.uploaded')}
            value={formatPostedDate(post.createdAt, locale)}
            dotColor={colors.textMuted}
            isLast={!post.approvedAt && !post.publishedAt}
          />
          {post.approvedAt ? (
            <TimelineRow
              label={t('video.timeline.approved')}
              value={formatPostedDate(post.approvedAt, locale)}
              dotColor={accent.info}
              isLast={!post.publishedAt}
            />
          ) : null}
          {post.publishedAt ? (
            <TimelineRow
              label={t('video.timeline.published')}
              value={formatPostedDate(post.publishedAt, locale)}
              dotColor={accent.success}
              isLast
            />
          ) : null}
        </View>

        {/* Tags - grouped by category */}
        {hasTags ? (
          <View style={{ gap: spacing.sm }}>
            <ThemedText variant="mono" tone="muted">
              {t('video.section.tags')}
            </ThemedText>
            <View style={{ gap: spacing.sm }}>
              {tagsByCategory.map((cat) => (
                <View key={cat.id} style={{ gap: 6 }}>
                  <ThemedText variant="caption" tone="secondary">
                    {cat.name}
                  </ThemedText>
                  <View style={styles.tagRow}>
                    {cat.tags.map((name, idx) => (
                      <TagPill
                        key={`${cat.id}-${name}-${idx}`}
                        label={name}
                        selected
                        onPress={undefined}
                      />
                    ))}
                  </View>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* Conversion */}
        {post.cta ? (
          <View style={{ gap: spacing.sm }}>
            <ThemedText variant="mono" tone="muted">
              {t('video.section.conversion')}
            </ThemedText>
            <CtaPreview cta={post.cta} ctaUrl={post.ctaUrl ?? null} />
          </View>
        ) : null}
      </View>
      </ScrollView>

      {/* Admin note expanded modal */}
      {post.adminNote ? (
        <ModalSheet
          visible={adminNoteOpen}
          onClose={() => setAdminNoteOpen(false)}
          title={t('video.adminNote')}
          height="32%"
        >
          <View
            style={{
              padding: spacing.lg,
              gap: spacing.md,
            }}
          >
            <ThemedText variant="body" tone="primary">
              {post.adminNote}
            </ThemedText>
          </View>
        </ModalSheet>
      ) : null}

      {/* Status popup - explains what the badge means */}
      <ModalSheet
        visible={statusOpen}
        onClose={() => setStatusOpen(false)}
        title={statusLabel}
        height="32%"
      >
        <View style={{ padding: spacing.lg, gap: spacing.md }}>
          <View style={{ alignSelf: 'flex-start' }}>
            <StatusBadge
              status={post.status}
              surface="overSurface"
              label={statusLabel}
            />
          </View>
          <ThemedText variant="body" tone="secondary">
            {statusDescription}
          </ThemedText>
        </View>
      </ModalSheet>

      {/* Specs popup - file size, resolution, duration */}
      <ModalSheet
        visible={specsOpen}
        onClose={() => setSpecsOpen(false)}
        title={t('video.specs.title')}
        height="34%"
      >
        <View style={{ padding: spacing.lg, gap: spacing.sm }}>
          <SpecRow
            label={t('video.specs.fileSize')}
            value={formatFileSize(post.fileSizeBytes)}
          />
          <SpecRow
            label={t('video.specs.resolution')}
            value={formatResolution(post.mediaWidth, post.mediaHeight)}
          />
          <SpecRow
            label={t('video.specs.duration')}
            value={t('video.secondsShort', {
              seconds: formatNumber(post.durationSeconds, locale),
            })}
          />
        </View>
      </ModalSheet>
    </View>
  );
}

interface SpecRowProps {
  label: string;
  value: string;
}

function SpecRow({ label, value }: SpecRowProps): React.ReactElement {
  const { colors, spacing } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: spacing.xs,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.border,
      }}
    >
      <ThemedText variant="caption" tone="muted">
        {label}
      </ThemedText>
      <ThemedText variant="bodyMed" tone="primary">
        {value}
      </ThemedText>
    </View>
  );
}

interface TimelineRowProps {
  label: string;
  value: string;
  dotColor: string;
  isLast?: boolean;
}

function TimelineRow({
  label,
  value,
  dotColor,
  isLast = false,
}: TimelineRowProps): React.ReactElement {
  const { colors, spacing } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
      }}
    >
      <View
        style={{
          alignItems: 'center',
          width: 16,
          marginRight: spacing.sm,
          alignSelf: 'stretch',
        }}
      >
        <View
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            marginTop: 6,
            backgroundColor: dotColor,
          }}
        />
        {!isLast ? (
          <View
            style={{
              flex: 1,
              width: 1,
              backgroundColor: colors.border,
              marginTop: 2,
            }}
          />
        ) : null}
      </View>
      <View style={{ flex: 1, paddingBottom: isLast ? 0 : spacing.sm }}>
        <ThemedText variant="caption" tone="muted">
          {label}
        </ThemedText>
        <ThemedText variant="bodyMed" tone="primary">
          {value}
        </ThemedText>
      </View>
    </View>
  );
}

export default function VideoDetailScreen(): React.ReactElement {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors, spacing, accent, radius } = useTheme();
  const queryClient = useQueryClient();

  const params = useLocalSearchParams<{ postId?: string }>();
  const postId: string =
    typeof params.postId === 'string' ? params.postId : '';

  const activeWorkspaceId = useTenantStore((s) => s.activeWorkspaceId);
  const myPostsQuery = useMyPosts(activeWorkspaceId);
  const tagTopologyQuery = useTagTopology(activeWorkspaceId);
  const deleteMutation = useDeletePost();

  const posts = useMemo<Post[]>(() => {
    const flat = (myPostsQuery.data?.pages ?? []).flatMap((p) => p.posts);
    flat.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    return flat;
  }, [myPostsQuery.data]);

  const initialIndex = useMemo<number>(() => {
    if (posts.length === 0 || !postId) return -1;
    return posts.findIndex((p) => p.id === postId);
  }, [posts, postId]);

  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [activeIndexInitialized, setActiveIndexInitialized] =
    useState<boolean>(false);
  const [moreOpen, setMoreOpen] = useState<boolean>(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState<boolean>(false);

  const pagerRef = useRef<PagerView>(null);

  useEffect(() => {
    if (!activeIndexInitialized && initialIndex >= 0) {
      setActiveIndex(initialIndex);
      setActiveIndexInitialized(true);
    }
  }, [initialIndex, activeIndexInitialized]);

  const screenHeight = Dimensions.get('window').height;
  const screenWidth = Dimensions.get('window').width;

  const handlePageSelected = useCallback(
    (event: NativeSyntheticEvent<PageScrollEventData>): void => {
      setActiveIndex(event.nativeEvent.position);
    },
    [],
  );

  const goPrev = useCallback((): void => {
    if (activeIndex <= 0) return;
    pagerRef.current?.setPage(activeIndex - 1);
  }, [activeIndex]);

  const goNext = useCallback((): void => {
    if (activeIndex >= posts.length - 1) return;
    pagerRef.current?.setPage(activeIndex + 1);
  }, [activeIndex, posts.length]);

  const handleBack = useCallback((): void => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/profile');
    }
  }, [router]);

  const activePost: Post | null =
    posts.length > 0 && activeIndex >= 0 && activeIndex < posts.length
      ? posts[activeIndex]
      : null;

  const handleShare = useCallback(async (): Promise<void> => {
    if (!activePost) return;
    const url = buildPostUrl(activePost.id);
    setMoreOpen(false);
    try {
      await Share.share({ url, message: url, title: activePost.title });
    } catch {
      // user cancelled; nothing to do
    }
  }, [activePost]);

  // Clipboard fallback: expo-clipboard is not installed, so we share the URL.
  const handleCopyLink = useCallback(async (): Promise<void> => {
    if (!activePost) return;
    const url = buildPostUrl(activePost.id);
    setMoreOpen(false);
    try {
      await Share.share({ url, message: url, title: activePost.title });
      showToast({ variant: 'info', message: t('video.linkCopied') });
    } catch {
      // user cancelled; nothing to do
    }
  }, [activePost, t]);

  // Edit flow: hand the post off to the composer with the existing media
  // and metadata pre-loaded. The actual delete happens at submit time in
  // composer/preview, gated on draft.editingPostId, so the user can back
  // out without losing their published post.
  const startEdit = useCallback((): void => {
    if (!activePost || !activeWorkspaceId) return;
    useDraftStore.getState().setDraft({
      workspaceId: activeWorkspaceId,
      // Use the post's mediaUrl as the localUri. expo-video's player
      // accepts both file:// and https:// URIs, so the InlinePreview just
      // works. composer/preview re-validates at submit time.
      localUri: activePost.mediaUrl,
      durationMs: activePost.durationSeconds * 1000,
      width: activePost.mediaWidth ?? null,
      height: activePost.mediaHeight ?? null,
      title: activePost.title,
      description: activePost.description,
      tagIds: activePost.tagIds,
      ctaId: activePost.cta?.id ?? null,
      ctaUrl: activePost.ctaUrl ?? null,
      editingPostId: activePost.id,
      updatedAt: new Date().toISOString(),
    });
    router.replace('/composer/edit');
  }, [activePost, activeWorkspaceId, router]);

  const handleEditPress = useCallback((): void => {
    // Close the more-actions sheet first; defer the Alert until iOS has
    // fully torn down the modal, otherwise the new modal layer can stack
    // on top of the closing one and freeze touches.
    setMoreOpen(false);
    setTimeout(() => {
      Alert.alert(
        t('video.editTitle'),
        t('video.editBody'),
        [
          { text: t('video.editCancel'), style: 'cancel' },
          {
            text: t('video.editConfirm'),
            style: 'destructive',
            onPress: () => startEdit(),
          },
        ],
      );
    }, 250);
  }, [startEdit, t]);

  const handleDeletePress = useCallback((): void => {
    setMoreOpen(false);
    setConfirmDeleteOpen(true);
  }, []);

  const handleConfirmDelete = useCallback((): void => {
    if (!activePost || !activeWorkspaceId) return;
    deleteMutation.mutate(
      { postId: activePost.id, workspaceId: activeWorkspaceId },
      {
        onSuccess: () => {
          setConfirmDeleteOpen(false);
          void queryClient.invalidateQueries({
            queryKey: keys.myPosts(activeWorkspaceId),
          });
          showToast({ variant: 'success', message: t('video.deleted') });
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace('/(tabs)/profile');
          }
        },
        onError: () => {
          setConfirmDeleteOpen(false);
          showToast({ variant: 'danger', message: t('common.error') });
        },
      },
    );
  }, [
    activePost,
    activeWorkspaceId,
    deleteMutation,
    queryClient,
    router,
    t,
  ]);

  const isLoading: boolean =
    myPostsQuery.isLoading || tagTopologyQuery.isLoading;
  const tagCategories: TagCategory[] = tagTopologyQuery.data ?? [];

  if (isLoading && posts.length === 0) {
    return (
      <ScreenContainer>
        <View style={styles.center}>
          <ActivityIndicator color={colors.textMuted} />
        </View>
      </ScreenContainer>
    );
  }

  if (!myPostsQuery.isLoading && initialIndex === -1) {
    return (
      <ScreenContainer padded edges={['top', 'bottom', 'left', 'right']}>
        <View style={styles.center}>
          <EmptyState
            icon={Film}
            title={t('video.postNotFound')}
            description={t('video.postNotFoundBody')}
            cta={
              <SecondaryButton
                label={t('common.back')}
                accessibilityLabel={t('common.back')}
                onPress={handleBack}
              />
            }
          />
        </View>
      </ScreenContainer>
    );
  }

  const canPrev: boolean = activeIndex > 0;
  const canNext: boolean = activeIndex < posts.length - 1;

  return (
    <ScreenContainer edges={['top', 'left', 'right', 'bottom']}>
      {/* Header */}
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
          accessibilityLabel={t('video.back')}
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
            {t('video.title')}
          </ThemedText>
        </View>
        <View style={styles.headerRight}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('video.prev')}
            accessibilityState={{ disabled: !canPrev }}
            disabled={!canPrev}
            onPress={goPrev}
            hitSlop={8}
            style={({ pressed }) => [
              styles.headerButton,
              {
                opacity: !canPrev ? 0.35 : pressed ? 0.7 : 1,
              },
            ]}
          >
            <ChevronLeft
              size={20}
              color={colors.textPrimary}
              strokeWidth={1.75}
            />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('video.next')}
            accessibilityState={{ disabled: !canNext }}
            disabled={!canNext}
            onPress={goNext}
            hitSlop={8}
            style={({ pressed }) => [
              styles.headerButton,
              {
                opacity: !canNext ? 0.35 : pressed ? 0.7 : 1,
              },
            ]}
          >
            <ChevronRight
              size={20}
              color={colors.textPrimary}
              strokeWidth={1.75}
            />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('video.moreActions')}
            onPress={() => setMoreOpen(true)}
            hitSlop={8}
            style={({ pressed }) => [
              styles.headerButton,
              { opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <MoreHorizontal
              size={20}
              color={colors.textPrimary}
              strokeWidth={1.75}
            />
          </Pressable>
        </View>
      </View>

      {/* Pager */}
      {posts.length > 0 ? (
        <PagerView
          ref={pagerRef}
          style={{ flex: 1 }}
          orientation="horizontal"
          scrollEnabled
          initialPage={Math.max(0, initialIndex)}
          onPageSelected={handlePageSelected}
        >
          {posts.map((post, idx) => (
            <View key={post.id} style={{ flex: 1 }}>
              <PostPage
                post={post}
                isActive={idx === activeIndex}
                tagCategories={tagCategories}
                screenWidth={screenWidth}
                screenHeight={screenHeight}
              />
            </View>
          ))}
        </PagerView>
      ) : (
        <View style={styles.center}>
          <ActivityIndicator color={colors.textMuted} />
        </View>
      )}

      {/* More actions sheet - compact list, tap target stays at 44pt */}
      <ModalSheet
        visible={moreOpen}
        onClose={() => setMoreOpen(false)}
        title={t('video.moreActions')}
        height="42%"
      >
        <View style={{ paddingHorizontal: spacing.sm, paddingBottom: spacing.md }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('video.share')}
            onPress={() => {
              void handleShare();
            }}
            style={({ pressed }) => [
              styles.sheetRow,
              {
                paddingVertical: spacing.sm,
                opacity: pressed ? 0.7 : 1,
                borderRadius: radius.md,
                backgroundColor: pressed ? colors.bgInput : 'transparent',
              },
            ]}
          >
            <Share2 size={18} color={colors.textPrimary} strokeWidth={1.75} />
            <ThemedText variant="bodyMed" tone="primary">
              {t('video.share')}
            </ThemedText>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('video.copyLink')}
            onPress={() => {
              void handleCopyLink();
            }}
            style={({ pressed }) => [
              styles.sheetRow,
              {
                paddingVertical: spacing.sm,
                opacity: pressed ? 0.7 : 1,
                borderRadius: radius.md,
                backgroundColor: pressed ? colors.bgInput : 'transparent',
              },
            ]}
          >
            <Copy size={18} color={colors.textPrimary} strokeWidth={1.75} />
            <ThemedText variant="bodyMed" tone="primary">
              {t('video.copyLink')}
            </ThemedText>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('video.edit')}
            onPress={handleEditPress}
            style={({ pressed }) => [
              styles.sheetRow,
              {
                paddingVertical: spacing.sm,
                opacity: pressed ? 0.7 : 1,
                borderRadius: radius.md,
                backgroundColor: pressed ? colors.bgInput : 'transparent',
              },
            ]}
          >
            <Pencil size={18} color={colors.textPrimary} strokeWidth={1.75} />
            <ThemedText variant="bodyMed" tone="primary">
              {t('video.edit')}
            </ThemedText>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('video.delete')}
            onPress={handleDeletePress}
            style={({ pressed }) => [
              styles.sheetRow,
              {
                paddingVertical: spacing.sm,
                opacity: pressed ? 0.7 : 1,
                borderRadius: radius.md,
                backgroundColor: pressed ? colors.bgInput : 'transparent',
              },
            ]}
          >
            <Trash2 size={18} color={accent.danger} strokeWidth={1.75} />
            <ThemedText variant="bodyMed" tone="danger">
              {t('video.delete')}
            </ThemedText>
          </Pressable>
        </View>
      </ModalSheet>

      {/* Confirm delete sheet */}
      <ModalSheet
        visible={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
        title={t('video.deleteTitle')}
        height="38%"
      >
        <View
          style={{
            padding: spacing.lg,
            gap: spacing.md,
          }}
        >
          <ThemedText variant="body" tone="secondary">
            {t('video.deleteBody')}
          </ThemedText>
          <View
            style={{
              flexDirection: 'row',
              gap: spacing.sm,
              marginTop: spacing.md,
            }}
          >
            <View style={{ flex: 1 }}>
              <SecondaryButton
                label={t('video.deleteCancel')}
                accessibilityLabel={t('video.deleteCancel')}
                onPress={() => setConfirmDeleteOpen(false)}
                disabled={deleteMutation.isPending}
              />
            </View>
            <View style={{ flex: 1 }}>
              <DestructiveButton
                label={t('video.deleteConfirm')}
                accessibilityLabel={t('video.deleteConfirm')}
                loading={deleteMutation.isPending}
                onPress={handleConfirmDelete}
              />
            </View>
          </View>
        </View>
      </ModalSheet>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    minHeight: 48,
    gap: 8,
  },
  headerTitleWrap: {
    flex: 1,
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  frameStage: {
    alignItems: 'center',
    position: 'relative',
  },
  frame: {
    overflow: 'hidden',
    borderWidth: 1,
    position: 'relative',
  },
  playerPressable: {
    flex: 1,
  },
  placeholderCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  volumeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    minWidth: 36,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Inline pill on the status row showing the file size at a glance; tap
  // opens the full specs popup.
  specsChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  timelineCard: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  engagementRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  engagementChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statsGrid: {
    gap: 8,
  },
  statRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statTile: {
    flex: 1,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  // Tighter more-actions row: smaller vertical padding so the sheet doesn't
  // feel sparse when there are only 3 entries.
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
  },
});
