import React, { useCallback, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Film } from 'lucide-react-native';
import { GhostButton } from '@/components/GhostButton';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenContainer } from '@/components/ScreenContainer';
import { SecondaryButton } from '@/components/SecondaryButton';
import { TagPill } from '@/components/TagPill';
import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/lib/theme/useTheme';
import { useTenantStore } from '@/lib/store/tenantStore';
import { useDraftStore } from '@/lib/store/draftStore';
import {
  keys,
  useCreatePost,
  useTagTopology,
  useWorkspace,
} from '@/lib/api/queries';
import { showToast } from '@/lib/toast';
import type { CTA, CtaStyle } from '@/types/api';

interface CtaPreviewProps {
  cta: CTA;
  url: string | null;
}

function CtaPreview({ cta, url }: CtaPreviewProps): React.ReactElement {
  const { spacing } = useTheme();
  const { t } = useTranslation();
  const style: CtaStyle = cta.style;
  const display: string =
    cta.kind === 'static'
      ? cta.url
      : url && url.length > 0
        ? url
        : t('composer.preview.ctaUrlPlaceholder');

  return (
    <View style={{ gap: spacing.xs }}>
      {style === 'primary' ? (
        <PrimaryButton
          label={cta.label}
          accessibilityLabel={cta.label}
          onPress={() => undefined}
          disabled
        />
      ) : style === 'secondary' ? (
        <SecondaryButton
          label={cta.label}
          accessibilityLabel={cta.label}
          onPress={() => undefined}
          disabled
        />
      ) : (
        <View style={{ alignSelf: 'flex-start' }}>
          <GhostButton
            label={cta.label}
            accessibilityLabel={cta.label}
            onPress={() => undefined}
            disabled
          />
        </View>
      )}
      <ThemedText variant="mono" tone="muted">
        {display}
      </ThemedText>
    </View>
  );
}

export default function ComposerPreviewScreen(): React.ReactElement | null {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors, spacing } = useTheme();
  const queryClient = useQueryClient();

  const activeWorkspaceId = useTenantStore((s) => s.activeWorkspaceId);
  const workspaceQuery = useWorkspace(activeWorkspaceId);
  const tagTopologyQuery = useTagTopology(activeWorkspaceId);

  const drafts = useDraftStore((s) => s.drafts);
  const draft = activeWorkspaceId ? (drafts[activeWorkspaceId] ?? null) : null;

  const createPost = useCreatePost();

  // Guards: bounce back to edit if the draft is missing critical fields.
  useFocusEffect(
    useCallback(() => {
      if (!activeWorkspaceId) {
        router.replace('/(tabs)/profile');
        return;
      }
      const current = useDraftStore.getState().getDraft(activeWorkspaceId);
      if (!current || current.title.trim().length === 0) {
        router.replace('/composer/edit');
      }
    }, [activeWorkspaceId, router]),
  );

  // Compute selected CTA + tag chips.
  const workspace = workspaceQuery.data ?? null;
  const allowedCtas = workspace?.capabilities.allowedCtas ?? [];
  const selectedCta: CTA | null = useMemo(() => {
    if (!draft || !draft.ctaId) return null;
    return allowedCtas.find((c) => c.id === draft.ctaId) ?? null;
  }, [allowedCtas, draft]);

  const tagNames: string[] = useMemo(() => {
    if (!draft) return [];
    const list: string[] = [];
    const topology = tagTopologyQuery.data ?? [];
    for (const cat of topology) {
      for (const tag of cat.tags) {
        if (draft.tagIds.includes(tag.id)) list.push(tag.name);
      }
    }
    return list;
  }, [draft, tagTopologyQuery.data]);

  const requireApproval: boolean =
    workspace?.capabilities.requireApproval ?? true;

  const primaryLabel: string = requireApproval
    ? t('composer.preview.sendForApproval')
    : t('composer.preview.publish');

  const handleEdit = useCallback(() => {
    router.back();
  }, [router]);

  const handlePublish = useCallback(() => {
    if (!activeWorkspaceId || !workspace || !draft) return;

    if (!draft.localUri) {
      showToast({ variant: 'warning', message: t('composer.preview.noMedia') });
      return;
    }

    const mediaKey = `mock_${Date.now()}`;
    const ctaIdToSubmit: string = draft.ctaId ?? '';
    const ctaUrlToSubmit: string | undefined =
      selectedCta && selectedCta.kind === 'dynamic' && draft.ctaUrl
        ? draft.ctaUrl
        : undefined;

    createPost.mutate(
      {
        workspaceId: activeWorkspaceId,
        input: {
          title: draft.title.trim(),
          description: draft.description,
          tagIds: draft.tagIds,
          ctaId: ctaIdToSubmit,
          ctaUrl: ctaUrlToSubmit,
          mediaKey,
        },
      },
      {
        onSuccess: () => {
          if (activeWorkspaceId) {
            useDraftStore.getState().clearDraft(activeWorkspaceId);
            void queryClient.invalidateQueries({
              queryKey: keys.myPosts(activeWorkspaceId),
            });
          }
          showToast({
            variant: 'success',
            message: t('composer.preview.posted'),
          });
          if (router.canDismiss()) {
            router.dismissAll();
          }
          router.replace('/(tabs)/profile');
        },
        onError: (err) => {
          showToast({
            variant: 'danger',
            message: err.message || t('common.error'),
          });
        },
      },
    );
  }, [
    activeWorkspaceId,
    workspace,
    draft,
    selectedCta,
    createPost,
    router,
    queryClient,
    t,
  ]);

  if (!activeWorkspaceId || !workspace || !draft) {
    return null;
  }

  return (
    <ScreenContainer edges={['top', 'left', 'right', 'bottom']}>
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
          onPress={handleEdit}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={t('composer.preview.back')}
          style={styles.headerLeft}
        >
          <ChevronLeft size={24} color={colors.textPrimary} strokeWidth={1.75} />
        </Pressable>
        <ThemedText variant="heading" style={styles.headerTitle}>
          {t('composer.preview.title')}
        </ThemedText>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          padding: spacing.md,
          paddingBottom: spacing.xxl,
          gap: spacing.md,
        }}
      >
        {/* Phone-frame preview */}
        <View
          style={[
            styles.previewFrame,
            {
              backgroundColor: colors.bgInput,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.previewInner}>
            <Film size={48} color={colors.textMuted} strokeWidth={1.5} />
            <ThemedText
              variant="caption"
              tone="muted"
              style={{ marginTop: spacing.sm, textAlign: 'center' }}
            >
              {t('composer.preview.previewPlaceholder')}
            </ThemedText>
          </View>
        </View>

        {/* Meta */}
        <View style={{ gap: spacing.xs }}>
          <ThemedText variant="heading">{draft.title.trim()}</ThemedText>
          {draft.description.length > 0 ? (
            <ThemedText variant="body" tone="secondary">
              {draft.description}
            </ThemedText>
          ) : (
            <ThemedText variant="body" tone="muted">
              {t('composer.preview.descriptionEmpty')}
            </ThemedText>
          )}
        </View>

        {/* Tags */}
        {tagNames.length > 0 ? (
          <View style={styles.tagRow}>
            {tagNames.map((name) => (
              <TagPill
                key={name}
                label={name}
                selected
                style={{ marginRight: spacing.xs, marginBottom: spacing.xs }}
              />
            ))}
          </View>
        ) : null}

        {/* CTA */}
        {selectedCta ? (
          <CtaPreview cta={selectedCta} url={draft.ctaUrl} />
        ) : null}
      </ScrollView>

      {/* Bottom buttons */}
      <View
        style={[
          styles.bottomBar,
          {
            borderTopColor: colors.border,
            backgroundColor: colors.bg,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
            gap: spacing.sm,
          },
        ]}
      >
        <View style={{ flex: 1 }}>
          <SecondaryButton
            label={t('composer.preview.edit')}
            accessibilityLabel={t('composer.preview.edit')}
            onPress={handleEdit}
            disabled={createPost.isPending}
          />
        </View>
        <View style={{ flex: 1 }}>
          <PrimaryButton
            label={primaryLabel}
            accessibilityLabel={primaryLabel}
            onPress={handlePublish}
            loading={createPost.isPending}
          />
        </View>
      </View>
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
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
  },
  previewFrame: {
    width: '100%',
    aspectRatio: 9 / 16,
    borderWidth: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  previewInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  bottomBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
  },
});
