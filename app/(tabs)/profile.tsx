import React, { useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  Share,
  StyleSheet,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { FlashList } from '@shopify/flash-list';
import {
  AlertCircle,
  Building2,
  Clock,
  Film,
} from 'lucide-react-native';
import { Avatar } from '@/components/Avatar';
import { Card } from '@/components/Card';
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
const GRID_GAP = 2;

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
  const { spacing } = useTheme();
  return (
    <View style={styles.statCell}>
      <ThemedText
        variant="title"
        tone="primary"
        style={{ textAlign: 'center' }}
      >
        {formatCount(value)}
      </ThemedText>
      <ThemedText
        variant="mono"
        tone="muted"
        style={{ marginTop: spacing.xxs, textAlign: 'center' }}
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

function SkeletonGrid({ count }: SkeletonGridProps): React.ReactElement {
  const { colors } = useTheme();
  const cells: number[] = [];
  for (let i = 0; i < count; i += 1) cells.push(i);
  return (
    <View style={styles.skeletonGrid}>
      {cells.map((i) => (
        <View
          key={i}
          style={[
            styles.skeletonCell,
            { backgroundColor: colors.bgInput },
          ]}
        />
      ))}
    </View>
  );
}

export default function ProfileTabScreen(): React.ReactElement {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors, spacing, accent } = useTheme();
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
    showToast({
      variant: 'info',
      message: t('profileTab.editProfileSoon'),
    });
  }, [t]);

  const handlePostPress = useCallback(() => {
    // Phase 7 will route to the video detail screen.
    showToast({
      variant: 'info',
      message: t('profileTab.openPostSoon'),
    });
  }, [t]);

  const renderHeader = useCallback((): React.ReactElement | null => {
    if (!membership || !workspaceQuery.data) return null;
    return (
      <View style={{ gap: spacing.md, paddingBottom: spacing.md }}>
        <UploadProgressBanner
          onCancel={handleBannerCancel}
          onRetry={handleBannerRetry}
          onResume={handleBannerResume}
          onDismiss={handleBannerDismiss}
        />

        <Card padded>
          <View style={styles.headerTop}>
            <Avatar
              size={80}
              name={membership.workspaceUsername}
              uri={membership.workspaceAvatarUrl || undefined}
              accessibilityLabel={membership.workspaceUsername}
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
                value={membership.totalClicks}
                label={t('profileTab.stats.clicks')}
              />
            </View>
          </View>

          <View style={{ marginTop: spacing.md, gap: spacing.xxs }}>
            <ThemedText variant="heading" numberOfLines={1}>
              {membership.workspace.brand.name}
            </ThemedText>
            <ThemedText variant="mono" tone="secondary">
              {`@${membership.workspaceUsername}`}
            </ThemedText>
            {membership.bio ? (
              <ThemedText
                variant="body"
                tone="secondary"
                numberOfLines={3}
                style={{ marginTop: spacing.xxs }}
              >
                {membership.bio}
              </ThemedText>
            ) : null}
          </View>

          <View
            style={{
              flexDirection: 'row',
              gap: spacing.sm,
              marginTop: spacing.md,
            }}
          >
            <View style={{ flex: 1 }}>
              <SecondaryButton
                label={t('profileTab.editProfile')}
                accessibilityLabel={t('profileTab.editProfile')}
                onPress={handleEditProfilePress}
              />
            </View>
            <View style={{ flex: 1 }}>
              <SecondaryButton
                label={t('profileTab.shareProfile')}
                accessibilityLabel={t('profileTab.shareProfile')}
                onPress={handleSharePress}
              />
            </View>
          </View>
        </Card>

        {membership.status !== 'active' ? (
          <MembershipBanner status={membership.status} />
        ) : null}
      </View>
    );
  }, [
    membership,
    workspaceQuery.data,
    spacing,
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
              <PrimaryButton
                label={t('profileTab.findWorkspace')}
                accessibilityLabel={t('profileTab.findWorkspace')}
                onPress={() => router.push('/add-tenant')}
              />
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
              <PrimaryButton
                label={t('profileTab.findWorkspace')}
                accessibilityLabel={t('profileTab.findWorkspace')}
                onPress={() => router.push('/add-tenant')}
              />
            }
          />
        </View>
      </ScreenContainer>
    );
  }

  const isActiveMembership: boolean = membership.status === 'active';
  const posts: Post[] = isActiveMembership
    ? (myPostsQuery.data?.pages ?? []).flatMap((page) => page.posts)
    : [];
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

  // When the workspace is not active or the active workspace has no posts,
  // we render only the header (and optional empty state) and skip the grid.
  if (!isActiveMembership) {
    return (
      <ScreenContainer padded edges={['left', 'right']}>
        <View style={{ flex: 1, paddingVertical: spacing.lg }}>
          {renderHeader()}
        </View>
      </ScreenContainer>
    );
  }

  if (isPostsInitialLoading) {
    return (
      <ScreenContainer padded edges={['left', 'right']}>
        <View style={{ flex: 1, paddingVertical: spacing.lg, gap: spacing.md }}>
          {renderHeader()}
          <SkeletonGrid count={SKELETON_COUNT} />
        </View>
      </ScreenContainer>
    );
  }

  if (isPostsError) {
    return (
      <ScreenContainer padded edges={['left', 'right']}>
        <View style={{ flex: 1, paddingVertical: spacing.lg, gap: spacing.md }}>
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
        <View style={{ flex: 1, paddingVertical: spacing.lg, gap: spacing.md }}>
          {renderHeader()}
          <EmptyState
            icon={Film}
            title={t('profileTab.empty.title')}
            description={t('profileTab.empty.body')}
            cta={
              <PrimaryButton
                label={t('profileTab.empty.cta')}
                accessibilityLabel={t('profileTab.empty.cta')}
                onPress={() => router.push('/(tabs)/upload')}
              />
            }
          />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer padded edges={['left', 'right']}>
      <View style={{ flex: 1, paddingTop: spacing.lg }}>
        <FlashList<Post>
          data={posts}
          keyExtractor={(item) => item.id}
          numColumns={2}
          renderItem={({ item }) => (
            <View style={{ padding: GRID_GAP / 2 }}>
              <VideoTile post={item} onPress={handlePostPress} />
            </View>
          )}
          ListHeaderComponent={renderHeader}
          ListFooterComponent={
            myPostsQuery.isFetchingNextPage ? (
              <View style={{ paddingVertical: spacing.lg }}>
                <ActivityIndicator color={colors.textMuted} />
              </View>
            ) : null
          }
          onEndReached={() => {
            if (myPostsQuery.hasNextPage && !myPostsQuery.isFetchingNextPage) {
              void myPostsQuery.fetchNextPage();
            }
          }}
          onEndReachedThreshold={0.4}
          contentContainerStyle={{ paddingBottom: spacing.xl }}
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
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statsRow: {
    flex: 1,
    flexDirection: 'row',
    marginLeft: 16,
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
  skeletonCell: {
    width: '50%',
    aspectRatio: 9 / 16,
    borderColor: 'transparent',
    borderWidth: 1,
  },
});
