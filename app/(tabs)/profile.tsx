import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  RefreshControl,
  Share,
  StyleSheet,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Image as ExpoImage } from 'expo-image';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { FlashList } from '@shopify/flash-list';
import {
  AlertCircle,
  Building2,
  Clock,
  Film,
  Mail,
  ShieldOff,
} from 'lucide-react-native';
import { Avatar } from '@/components/Avatar';
import { EmptyState } from '@/components/EmptyState';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenContainer } from '@/components/ScreenContainer';
import { SecondaryButton } from '@/components/SecondaryButton';
import { ThemedText } from '@/components/ThemedText';
import { UploadProgressBanner } from '@/components/UploadProgressBanner';
import { VideoTile } from '@/components/VideoTile';
import { useTheme } from '@/lib/theme/useTheme';
import { useTenantStore } from '@/lib/store/tenantStore';
import { useUploadStore } from '@/lib/store/uploadStore';
import {
  keys,
  useMemberships,
  useMyPosts,
  useWorkspace,
} from '@/lib/api/queries';
import { showToast } from '@/lib/toast';
import { buildWorkspaceUserUrl } from '@/lib/deeplinks/parser';
import type { Post, MembershipStatus } from '@/types/api';

const SKELETON_COUNT = 6;
const GRID_GAP = 4;
// Floating tab pill (height 64 = 56 cell + 4+4 padding) + safe area + 12pt
// gap. Mirrors the pill layout in app/(tabs)/_layout.tsx so content never
// tucks under it.
const TAB_PILL_RESERVE = 64 + 24;

type PostFilter = 'live' | 'review';

interface FilterPillsProps {
  active: PostFilter;
  liveCount: number;
  reviewCount: number;
  onChange: (next: PostFilter) => void;
}

function FilterPills({
  active,
  liveCount,
  reviewCount,
  onChange,
}: FilterPillsProps): React.ReactElement {
  const { colors, accent, radius, spacing } = useTheme();
  const { t } = useTranslation();

  const renderPill = (
    key: PostFilter,
    label: string,
    count: number,
  ): React.ReactElement => {
    const focused = active === key;
    return (
      <Pressable
        key={key}
        onPress={() => onChange(key)}
        accessibilityRole="button"
        accessibilityLabel={`${label} ${count}`}
        accessibilityState={{ selected: focused }}
        style={({ pressed }) => [
          styles.filterPill,
          {
            backgroundColor: focused
              ? `${accent.primary}1f`
              : 'transparent',
            borderColor: focused ? accent.primary : colors.border,
            borderRadius: radius.pill,
            paddingHorizontal: spacing.sm + 2,
            paddingVertical: 6,
            opacity: pressed ? 0.85 : 1,
          },
        ]}
      >
        <ThemedText
          variant="caption"
          style={{
            color: focused ? accent.primary : colors.textSecondary,
            fontFamily: 'Outfit_600SemiBold',
            fontSize: 12,
          }}
        >
          {label}
        </ThemedText>
        <ThemedText
          variant="mono"
          style={{
            color: focused ? accent.primary : colors.textMuted,
            fontSize: 11,
            marginLeft: 6,
          }}
        >
          {count}
        </ThemedText>
      </Pressable>
    );
  };

  return (
    <View style={[styles.filterRow, { gap: spacing.xs }]}>
      {renderPill('live', t('profileTab.filter.live'), liveCount)}
      {renderPill('review', t('profileTab.filter.review'), reviewCount)}
    </View>
  );
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

interface StatCellProps {
  value: number;
  label: string;
}

function StatCell({ value, label }: StatCellProps): React.ReactElement {
  const { spacing, colors } = useTheme();
  return (
    <View style={styles.statCell}>
      <ThemedText
        tone="primary"
        style={{
          textAlign: 'center',
          fontFamily: 'Outfit_600SemiBold',
          fontSize: 17,
          lineHeight: 20,
          color: colors.textPrimary,
        }}
      >
        {formatCount(value)}
      </ThemedText>
      <ThemedText
        variant="caption"
        tone="muted"
        style={{ marginTop: spacing.xxs, textAlign: 'center', fontSize: 11 }}
      >
        {label}
      </ThemedText>
    </View>
  );
}

interface BannerProps {
  status: Exclude<MembershipStatus, 'active'>;
}

function MembershipBanner({ status }: BannerProps): React.ReactElement {
  const { colors, accent, radius, spacing } = useTheme();
  const { t } = useTranslation();

  const tone: { stripe: string; icon: typeof Clock; key: string } = (() => {
    if (status === 'pending_invite') {
      return {
        stripe: accent.info,
        icon: Clock,
        key: 'profileTab.banner.pendingInvite',
      };
    }
    if (status === 'pending_request') {
      return {
        stripe: accent.warning,
        icon: Clock,
        key: 'profileTab.banner.pendingRequest',
      };
    }
    return {
      stripe: accent.danger,
      icon: AlertCircle,
      key: 'profileTab.banner.revoked',
    };
  })();

  const Icon = tone.icon;

  return (
    <View
      style={[
        styles.bannerWrap,
        {
          backgroundColor: colors.bgCard,
          borderColor: colors.border,
          borderRadius: radius.lg,
        },
      ]}
    >
      <View
        style={[
          styles.bannerStripe,
          {
            backgroundColor: tone.stripe,
            borderTopLeftRadius: radius.lg,
            borderBottomLeftRadius: radius.lg,
          },
        ]}
      />
      <View
        style={[
          styles.bannerBody,
          { padding: spacing.md, gap: spacing.sm },
        ]}
      >
        <Icon size={18} color={tone.stripe} strokeWidth={1.75} />
        <ThemedText variant="body" tone="primary" style={styles.bannerText}>
          {t(tone.key)}
        </ThemedText>
      </View>
    </View>
  );
}

interface SkeletonGridProps {
  count: number;
}

function ShimmerCell(): React.ReactElement {
  const { colors } = useTheme();
  const pulse = useSharedValue<number>(0.45);

  useEffect(() => {
    // Pulse 0.45 -> 0.95 -> 0.45, ~1s loop, ease in/out. Cheap and reads
    // as "loading" without the cost of a moving-gradient shader.
    pulse.value = withRepeat(
      withTiming(0.95, {
        duration: 900,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true,
    );
  }, [pulse]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: pulse.value,
  }));

  return (
    <View style={styles.skeletonCellWrap}>
      <Animated.View
        style={[
          styles.skeletonCell,
          { backgroundColor: colors.bgInput },
          animatedStyle,
        ]}
      />
    </View>
  );
}

function SkeletonGrid({ count }: SkeletonGridProps): React.ReactElement {
  const cells: number[] = [];
  for (let i = 0; i < count; i += 1) cells.push(i);
  return (
    <View style={styles.skeletonGrid}>
      {cells.map((i) => (
        <ShimmerCell key={i} />
      ))}
    </View>
  );
}

export default function ProfileTabScreen(): React.ReactElement {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors, spacing, accent, radius } = useTheme();
  const queryClient = useQueryClient();

  const activeWorkspaceId = useTenantStore((s) => s.activeWorkspaceId);
  const isHydrated = useTenantStore((s) => s.isHydrated);

  const workspaceQuery = useWorkspace(activeWorkspaceId);
  const membershipsQuery = useMemberships();
  const myPostsQuery = useMyPosts(activeWorkspaceId);

  const cancelJob = useUploadStore((s) => s.cancel);
  const retryJob = useUploadStore((s) => s.retry);
  const removeJob = useUploadStore((s) => s.remove);
  const setActiveTenant = useTenantStore((s) => s.setActive);

  const [postFilter, setPostFilter] = useState<PostFilter>('live');
  const [bioExpanded, setBioExpanded] = useState<boolean>(false);
  const [bioTruncated, setBioTruncated] = useState<boolean>(false);

  const membership = useMemo(() => {
    if (!activeWorkspaceId) return null;
    const list = membershipsQuery.data ?? [];
    return list.find((m) => m.workspace.id === activeWorkspaceId) ?? null;
  }, [activeWorkspaceId, membershipsQuery.data]);

  const initialLoading: boolean =
    !isHydrated ||
    (!!activeWorkspaceId &&
      (workspaceQuery.isLoading || membershipsQuery.isLoading));

  const onRefresh = useCallback(() => {
    void membershipsQuery.refetch();
    if (activeWorkspaceId) {
      void myPostsQuery.refetch();
    }
  }, [activeWorkspaceId, membershipsQuery, myPostsQuery]);

  const handleBannerCancel = useCallback(() => {
    const active = useUploadStore.getState().getActive();
    if (!active) return;
    cancelJob(active.id);
    showToast({
      variant: 'info',
      message: t('profileTab.uploadCancelled'),
    });
  }, [cancelJob, t]);

  const handleBannerRetry = useCallback(() => {
    const failed = useUploadStore.getState().jobs.find((j) => j.state === 'failed');
    if (!failed) return;
    retryJob(failed.id);
  }, [retryJob]);

  const handleBannerResume = useCallback(() => {
    const resumable = useUploadStore.getState().getResumable();
    if (!resumable) return;
    void setActiveTenant(resumable.workspaceId).then(() => {
      router.push('/composer/preview');
    });
  }, [router, setActiveTenant]);

  const handleBannerDismiss = useCallback(() => {
    const resumable = useUploadStore.getState().getResumable();
    if (!resumable) return;
    removeJob(resumable.id);
  }, [removeJob]);

  const handleSharePress = useCallback(() => {
    if (!membership || !activeWorkspaceId) return;
    const url = buildWorkspaceUserUrl(
      activeWorkspaceId,
      membership.workspaceUsername,
    );
    void Share.share({
      url,
      message: url,
      title: t('profileTab.shareSubject'),
    });
  }, [activeWorkspaceId, membership, t]);

  const handleEditProfilePress = useCallback(() => {
    router.push('/edit-membership');
  }, [router]);

  const handlePostPress = useCallback(
    (post: Post) => {
      router.push({
        pathname: '/video/[postId]',
        params: { postId: post.id },
      });
    },
    [router],
  );

  const renderHeader = useCallback((): React.ReactElement | null => {
    if (!membership || !workspaceQuery.data) return null;
    return (
      <View style={{ paddingBottom: spacing.lg }}>
        <UploadProgressBanner
          onCancel={handleBannerCancel}
          onRetry={handleBannerRetry}
          onResume={handleBannerResume}
          onDismiss={handleBannerDismiss}
        />

        {membership.bannerUrl ? (
          <ExpoImage
            source={{ uri: membership.bannerUrl }}
            style={[
              styles.banner,
              {
                // Sit inside the screen padding so the edges aren't clipped
                // by the device-side margins. Width is the FlashList
                // header content box (already inset by 10pt each side).
                width: '100%',
                aspectRatio: 16 / 6,
                backgroundColor: colors.bgInput,
                borderRadius: 18,
                marginTop: spacing.xs,
              },
            ]}
            contentFit="cover"
            accessibilityIgnoresInvertColors
          />
        ) : null}

        <View style={[styles.headerTop, { marginTop: spacing.md }]}>
          <Avatar
            size={80}
            name={membership.workspaceUsername}
            uri={membership.workspaceAvatarUrl || undefined}
            accessibilityLabel={membership.workspaceUsername}
            style={
              membership.bannerUrl
                ? {
                    marginTop: -40,
                    borderWidth: 3,
                    borderColor: colors.bg,
                  }
                : undefined
            }
          />
          <View style={styles.statsRow}>
            <StatCell
              value={membership.postCount}
              label={t('profileTab.stats.posts')}
            />
            <StatCell
              value={membership.totalViews}
              label={t('profileTab.stats.views')}
            />
            <StatCell
              value={membership.totalLikes}
              label={t('profileTab.stats.likes')}
            />
          </View>
        </View>

        <View style={{ marginTop: spacing.md, gap: spacing.xxs }}>
          <ThemedText variant="heading" numberOfLines={1}>
            {membership.displayName && membership.displayName.length > 0
              ? membership.displayName
              : membership.workspace.name}
          </ThemedText>
          <ThemedText variant="mono" tone="muted">
            {`@${membership.workspaceUsername}`}
          </ThemedText>
          {membership.bio ? (
            <View style={{ marginTop: spacing.xs }}>
              <ThemedText
                variant="body"
                tone="secondary"
                numberOfLines={bioExpanded ? undefined : 2}
                onTextLayout={(e) => {
                  // Detect truncation by measuring the laid-out lines while
                  // collapsed. When expanded the count exceeds 2 by design.
                  if (!bioExpanded) {
                    const lines = e.nativeEvent.lines.length;
                    if (lines > 2 && !bioTruncated) setBioTruncated(true);
                  }
                }}
              >
                {membership.bio}
              </ThemedText>
              {bioTruncated ? (
                <Pressable
                  onPress={() => setBioExpanded((v) => !v)}
                  accessibilityRole="button"
                  accessibilityLabel={
                    bioExpanded
                      ? t('profileTab.bioShowLess')
                      : t('profileTab.bioShowMore')
                  }
                  hitSlop={6}
                  style={({ pressed }) => ({
                    marginTop: 4,
                    opacity: pressed ? 0.7 : 1,
                    alignSelf: 'flex-start',
                  })}
                >
                  <ThemedText
                    variant="caption"
                    style={{
                      color: accent.primary,
                      fontFamily: 'Outfit_600SemiBold',
                    }}
                  >
                    {bioExpanded
                      ? t('profileTab.bioShowLess')
                      : t('profileTab.bioShowMore')}
                  </ThemedText>
                </Pressable>
              ) : null}
            </View>
          ) : null}
        </View>

        <View
          style={{
            flexDirection: 'row',
            gap: spacing.sm,
            marginTop: spacing.lg,
          }}
        >
          <View style={{ flex: 1 }}>
            <SecondaryButton
              size="sm"
              label={t('profileTab.editProfile')}
              accessibilityLabel={t('profileTab.editProfile')}
              onPress={handleEditProfilePress}
            />
          </View>
          <View style={{ flex: 1 }}>
            <SecondaryButton
              size="sm"
              label={t('profileTab.shareProfile')}
              accessibilityLabel={t('profileTab.shareProfile')}
              onPress={handleSharePress}
            />
          </View>
        </View>

        {membership.status !== 'active' ? (
          <View style={{ marginTop: spacing.md }}>
            <MembershipBanner status={membership.status} />
          </View>
        ) : null}
      </View>
    );
  }, [
    membership,
    workspaceQuery.data,
    spacing,
    colors.bg,
    colors.bgInput,
    accent.primary,
    bioExpanded,
    bioTruncated,
    t,
    handleBannerCancel,
    handleBannerRetry,
    handleBannerResume,
    handleBannerDismiss,
    handleEditProfilePress,
    handleSharePress,
  ]);

  if (initialLoading) {
    return (
      <ScreenContainer padded edges={['left', 'right']}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.textMuted} />
        </View>
      </ScreenContainer>
    );
  }

  if (!activeWorkspaceId || !workspaceQuery.data) {
    return (
      <ScreenContainer padded edges={['left', 'right']}>
        <View style={styles.center}>
          <EmptyState
            icon={Building2}
            title={t('profileTab.noWorkspaceTitle')}
            description={t('profileTab.noWorkspaceBody')}
            cta={
              <View style={{ alignSelf: 'stretch', gap: spacing.sm }}>
                <PrimaryButton
                  label={t('profileTab.pasteInviteCode')}
                  accessibilityLabel={t('profileTab.pasteInviteCode')}
                  onPress={() => router.push('/add-tenant')}
                />
                <SecondaryButton
                  label={t('profileTab.searchByEmail')}
                  accessibilityLabel={t('profileTab.searchByEmail')}
                  onPress={() => router.push('/search-by-email')}
                />
              </View>
            }
          />
        </View>
      </ScreenContainer>
    );
  }

  if (!membership) {
    return (
      <ScreenContainer padded edges={['left', 'right']}>
        <View style={styles.center}>
          <EmptyState
            icon={Building2}
            title={t('profileTab.noWorkspaceTitle')}
            description={t('profileTab.noWorkspaceBody')}
            cta={
              <View style={{ alignSelf: 'stretch', gap: spacing.sm }}>
                <PrimaryButton
                  label={t('profileTab.pasteInviteCode')}
                  accessibilityLabel={t('profileTab.pasteInviteCode')}
                  onPress={() => router.push('/add-tenant')}
                />
                <SecondaryButton
                  label={t('profileTab.searchByEmail')}
                  accessibilityLabel={t('profileTab.searchByEmail')}
                  onPress={() => router.push('/search-by-email')}
                />
              </View>
            }
          />
        </View>
      </ScreenContainer>
    );
  }

  // Revoked: dedicated deactivated state. Shows the brand so the user knows
  // which workspace they're locked out of and one action - email this
  // workspace's support address so they can ask why / appeal.
  if (membership.status === 'revoked') {
    const ws = membership.workspace;
    const supportEmail: string = ws.supportEmail ?? '';
    const handleEmailSupport = (): void => {
      if (!supportEmail) return;
      const subject = t('profileTab.revoked.mailSubject', {
        workspace: ws.name,
      });
      const url = `mailto:${supportEmail}?subject=${encodeURIComponent(subject)}`;
      Linking.openURL(url).catch(() => {
        Alert.alert(
          t('profileTab.revoked.mailErrorTitle'),
          t('profileTab.revoked.mailErrorBody', { email: supportEmail }),
        );
      });
    };
    return (
      <ScreenContainer padded edges={['left', 'right']}>
        <View
          style={{
            flex: 1,
            paddingHorizontal: spacing.md,
            paddingBottom: TAB_PILL_RESERVE,
            justifyContent: 'center',
            alignItems: 'center',
            gap: spacing.lg,
          }}
        >
          <Avatar
            size={80}
            name={ws.name}
            uri={ws.brand.logoUrl || undefined}
          />
          <View style={{ alignItems: 'center', gap: spacing.xs }}>
            <ThemedText variant="title" tone="primary">
              {ws.name}
            </ThemedText>
            <ThemedText variant="mono" tone="muted">
              {`@${ws.handle}`}
            </ThemedText>
          </View>
          <View
            style={{
              alignItems: 'center',
              gap: spacing.sm,
              padding: spacing.lg,
              borderRadius: radius.lg,
              backgroundColor: colors.bgCard,
              borderWidth: 1,
              borderColor: colors.border,
              alignSelf: 'stretch',
            }}
          >
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: `${accent.danger}1f`,
              }}
            >
              <ShieldOff size={22} color={accent.danger} strokeWidth={1.75} />
            </View>
            <ThemedText
              variant="heading"
              tone="primary"
              style={{ textAlign: 'center' }}
            >
              {t('profileTab.revoked.title')}
            </ThemedText>
            <ThemedText
              variant="body"
              tone="secondary"
              style={{ textAlign: 'center' }}
            >
              {t('profileTab.revoked.body')}
            </ThemedText>
          </View>
          {supportEmail ? (
            <View style={{ alignSelf: 'stretch' }}>
              <PrimaryButton
                label={t('profileTab.revoked.emailSupport')}
                accessibilityLabel={t('profileTab.revoked.emailSupport')}
                onPress={handleEmailSupport}
                leftIcon={
                  <Mail size={18} color="#fff" strokeWidth={2} />
                }
              />
            </View>
          ) : (
            <ThemedText variant="caption" tone="muted">
              {t('profileTab.revoked.noSupportEmail')}
            </ThemedText>
          )}
        </View>
      </ScreenContainer>
    );
  }

  const isActiveMembership: boolean = membership.status === 'active';
  const posts: Post[] = isActiveMembership
    ? (myPostsQuery.data?.pages ?? []).flatMap((page) => page.posts)
    : [];
  const liveCount: number = posts.filter((p) => p.status === 'live').length;
  const reviewCount: number = posts.length - liveCount;
  const filteredPosts: Post[] =
    postFilter === 'live'
      ? posts.filter((p) => p.status === 'live')
      : posts.filter((p) => p.status !== 'live');
  const isPostsInitialLoading: boolean =
    isActiveMembership &&
    myPostsQuery.isLoading &&
    posts.length === 0;
  const isPostsError: boolean = isActiveMembership && myPostsQuery.isError;
  const showEmpty: boolean =
    isActiveMembership &&
    !myPostsQuery.isLoading &&
    !myPostsQuery.isError &&
    posts.length === 0;
  const showFilterEmpty: boolean =
    isActiveMembership &&
    !myPostsQuery.isLoading &&
    !myPostsQuery.isError &&
    posts.length > 0 &&
    filteredPosts.length === 0;

  // When the workspace is not active or the active workspace has no posts,
  // we render only the header (and optional empty state) and skip the grid.
  if (!isActiveMembership) {
    return (
      <ScreenContainer padded edges={['left', 'right']}>
        <View style={{ flex: 1, paddingBottom: TAB_PILL_RESERVE }}>
          {renderHeader()}
        </View>
      </ScreenContainer>
    );
  }

  if (isPostsInitialLoading) {
    return (
      <ScreenContainer padded edges={['left', 'right']}>
        <View style={{ flex: 1, gap: spacing.md, paddingBottom: TAB_PILL_RESERVE }}>
          {renderHeader()}
          <SkeletonGrid count={SKELETON_COUNT} />
        </View>
      </ScreenContainer>
    );
  }

  if (isPostsError) {
    return (
      <ScreenContainer padded edges={['left', 'right']}>
        <View style={{ flex: 1, gap: spacing.md, paddingBottom: TAB_PILL_RESERVE }}>
          {renderHeader()}
          <EmptyState
            icon={AlertCircle}
            title={t('profileTab.errorTitle')}
            description={t('profileTab.errorBody')}
            cta={
              <PrimaryButton
                label={t('common.tryAgain')}
                accessibilityLabel={t('common.tryAgain')}
                onPress={() => {
                  void myPostsQuery.refetch();
                  void queryClient.invalidateQueries({
                    queryKey: keys.myPosts(activeWorkspaceId),
                  });
                }}
              />
            }
          />
        </View>
      </ScreenContainer>
    );
  }

  if (showEmpty) {
    return (
      <ScreenContainer padded edges={['left', 'right']}>
        <View style={{ flex: 1, gap: spacing.md, paddingBottom: TAB_PILL_RESERVE }}>
          {renderHeader()}
          <EmptyState
            icon={Film}
            title={t('profileTab.empty.title')}
            description={t('profileTab.empty.body')}
          />
        </View>
      </ScreenContainer>
    );
  }

  // Header for the FlashList = profile metadata + filter pills. Pills only
  // ride along when there's something to filter; the standalone empty state
  // above this branch handles the "zero posts" case.
  const renderListHeader = (): React.ReactElement | null => {
    return (
      <View>
        {renderHeader()}
        <View style={{ paddingBottom: spacing.sm }}>
          <FilterPills
            active={postFilter}
            liveCount={liveCount}
            reviewCount={reviewCount}
            onChange={setPostFilter}
          />
        </View>
      </View>
    );
  };

  return (
    <ScreenContainer padded edges={['left', 'right']}>
      <View style={{ flex: 1 }}>
        <FlashList<Post>
          data={filteredPosts}
          keyExtractor={(item) => item.id}
          numColumns={2}
          renderItem={({ item }) => (
            <View style={{ padding: GRID_GAP / 2 }}>
              <VideoTile
                post={item}
                onPress={handlePostPress}
                showStatusBadge={postFilter === 'review'}
              />
            </View>
          )}
          ListHeaderComponent={renderListHeader}
          ListEmptyComponent={
            showFilterEmpty ? (
              <View style={{ paddingTop: spacing.xl }}>
                <EmptyState
                  icon={Film}
                  title={
                    postFilter === 'live'
                      ? t('profileTab.filter.emptyLiveTitle')
                      : t('profileTab.filter.emptyReviewTitle')
                  }
                  description={
                    postFilter === 'live'
                      ? t('profileTab.filter.emptyLiveBody')
                      : t('profileTab.filter.emptyReviewBody')
                  }
                />
              </View>
            ) : null
          }
          ListFooterComponent={
            myPostsQuery.isFetchingNextPage ? (
              <SkeletonGrid count={4} />
            ) : myPostsQuery.isFetchNextPageError ? (
              <View style={{ paddingVertical: spacing.lg, alignItems: 'center' }}>
                <Pressable
                  onPress={() => {
                    void myPostsQuery.fetchNextPage();
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={t('common.tryAgain')}
                  hitSlop={8}
                  style={({ pressed }) => ({
                    paddingHorizontal: spacing.md,
                    paddingVertical: spacing.sm,
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <ThemedText
                    variant="caption"
                    style={{
                      color: accent.primary,
                      fontFamily: 'Outfit_600SemiBold',
                    }}
                  >
                    {t('common.tryAgain')}
                  </ThemedText>
                </Pressable>
              </View>
            ) : null
          }
          onEndReached={() => {
            // Never block scroll. Only fire when there's more and we're not
            // already fetching. fetchNextPageError is treated as a soft fail
            // (footer shows Try again) - we don't auto-retry here so a
            // flaky network doesn't loop on the spinner.
            if (
              myPostsQuery.hasNextPage &&
              !myPostsQuery.isFetchingNextPage &&
              !myPostsQuery.isFetchNextPageError
            ) {
              void myPostsQuery.fetchNextPage();
            }
          }}
          onEndReachedThreshold={0.6}
          contentContainerStyle={{ paddingBottom: TAB_PILL_RESERVE + spacing.lg }}
          refreshControl={
            <RefreshControl
              refreshing={
                membershipsQuery.isFetching || myPostsQuery.isRefetching
              }
              onRefresh={onRefresh}
              tintColor={accent.primary}
              colors={[accent.primary]}
            />
          }
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 4,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  banner: {
    overflow: 'hidden',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statsRow: {
    flex: 1,
    flexDirection: 'row',
    marginLeft: 16,
    // Nudge the stats column up so the numbers sit closer to the visual
    // center of the avatar, not below it.
    marginTop: -4,
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerWrap: {
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 1,
  },
  bannerStripe: {
    width: 4,
    alignSelf: 'stretch',
  },
  bannerBody: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  bannerText: {
    flex: 1,
  },
  skeletonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  // Cells inherit the same 2px-each-side wrap that real VideoTile cells use
  // (GRID_GAP / 2), so the shimmer rows align pixel-perfectly with the grid
  // tiles above them while the next page loads.
  skeletonCellWrap: {
    width: '50%',
    padding: GRID_GAP / 2,
  },
  skeletonCell: {
    width: '100%',
    aspectRatio: 9 / 16,
    borderRadius: 12,
  },
});
