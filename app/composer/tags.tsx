// Tag selection subscreen. Reachable from the composer/edit summary row.
// Users can only select / unselect from the admin-configured tag topology;
// they cannot create or delete tags or categories.

import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Plus, X } from 'lucide-react-native';
import { EmptyState } from '@/components/EmptyState';
import { GhostButton } from '@/components/GhostButton';
import { ModalSheet } from '@/components/ModalSheet';
import { ScreenContainer } from '@/components/ScreenContainer';
import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/lib/theme/useTheme';
import { useTenantStore } from '@/lib/store/tenantStore';
import { useDraftStore } from '@/lib/store/draftStore';
import { useTagTopology } from '@/lib/api/queries';
import type { Tag, TagCategory } from '@/types/api';
import { Tag as TagIconSvg } from 'lucide-react-native';

export default function ComposerTagsScreen(): React.ReactElement | null {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors, spacing, radius, accent } = useTheme();

  const activeWorkspaceId = useTenantStore((s) => s.activeWorkspaceId);
  const tagTopologyQuery = useTagTopology(activeWorkspaceId);

  const [tagIds, setTagIds] = useState<string[]>([]);
  const [pickerCategory, setPickerCategory] = useState<TagCategory | null>(
    null,
  );

  // Sync selection from the draft on focus.
  useFocusEffect(
    useCallback(() => {
      if (!activeWorkspaceId) {
        router.replace('/(tabs)/profile');
        return;
      }
      const existing = useDraftStore.getState().getDraft(activeWorkspaceId);
      if (existing) setTagIds(existing.tagIds);
    }, [activeWorkspaceId, router]),
  );

  const topology: TagCategory[] = tagTopologyQuery.data ?? [];

  const persist = useCallback(
    (next: string[]) => {
      if (!activeWorkspaceId) return;
      useDraftStore.getState().patchDraft(activeWorkspaceId, {
        tagIds: next,
      });
    },
    [activeWorkspaceId],
  );

  const removeTag = useCallback(
    (tagId: string) => {
      setTagIds((prev) => {
        const next = prev.filter((id) => id !== tagId);
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const addTag = useCallback(
    (tagId: string) => {
      setTagIds((prev) => {
        if (prev.includes(tagId)) return prev;
        const next = [...prev, tagId];
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const clearAll = useCallback(() => {
    setTagIds([]);
    persist([]);
  }, [persist]);

  const handleDone = useCallback((): void => {
    router.back();
  }, [router]);

  const availableInCategory = useCallback(
    (cat: TagCategory): Tag[] => {
      return cat.tags.filter((tg) => !tagIds.includes(tg.id));
    },
    [tagIds],
  );

  if (!activeWorkspaceId) return null;

  if (topology.length === 0) {
    return (
      <ScreenContainer edges={['top', 'left', 'right', 'bottom']} bg="bg">
        <Header onClose={handleDone} title={t('composer.tagsScreen.title')} />
        <View style={styles.center}>
          <EmptyState
            icon={TagIconSvg}
            title={t('composer.tagsScreen.emptyTitle')}
            description={t('composer.tagsScreen.emptyBody')}
          />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer edges={['top', 'left', 'right', 'bottom']} bg="bg">
      <Header
        onClose={handleDone}
        title={t('composer.tagsScreen.title')}
        rightAction={
          tagIds.length > 0 ? (
            <Pressable
              onPress={clearAll}
              accessibilityRole="button"
              accessibilityLabel={t('composer.tagsScreen.clearAll')}
              hitSlop={8}
              style={({ pressed }) => [
                styles.headerRightBtn,
                { opacity: pressed ? 0.6 : 1 },
              ]}
            >
              <ThemedText variant="caption" tone="secondary">
                {t('composer.tagsScreen.clearAll')}
              </ThemedText>
            </Pressable>
          ) : null
        }
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          padding: spacing.md,
          paddingBottom: spacing.xxxl,
          gap: spacing.md,
        }}
      >
        <ThemedText variant="body" tone="secondary">
          {t('composer.tagsScreen.body')}
        </ThemedText>

        {topology.map((category) => {
          const selectedInCat = category.tags.filter((tg) =>
            tagIds.includes(tg.id),
          );
          return (
            <View
              key={category.id}
              style={[
                styles.categoryCard,
                {
                  backgroundColor: colors.bgCard,
                  borderColor: colors.border,
                  borderRadius: radius.lg,
                  padding: spacing.md,
                  gap: spacing.sm,
                },
              ]}
            >
              <ThemedText variant="bodyMed" tone="primary">
                {category.name}
              </ThemedText>

              {selectedInCat.length === 0 ? (
                <ThemedText variant="caption" tone="muted">
                  {t('composer.tagsScreen.noneSelected')}
                </ThemedText>
              ) : null}

              <View style={styles.tagWrap}>
                {selectedInCat.map((tg) => (
                  <Pressable
                    key={tg.id}
                    onPress={() => removeTag(tg.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`${tg.name}, remove`}
                    style={({ pressed }) => [
                      styles.tagPillSelected,
                      {
                        backgroundColor: `${accent.primary}1f`,
                        borderColor: accent.primary,
                        borderRadius: radius.pill,
                        opacity: pressed ? 0.85 : 1,
                      },
                    ]}
                  >
                    <ThemedText
                      variant="caption"
                      style={{
                        color: accent.primary,
                        fontFamily: 'Outfit_600SemiBold',
                      }}
                    >
                      {tg.name}
                    </ThemedText>
                    <X size={14} color={accent.primary} strokeWidth={2} />
                  </Pressable>
                ))}
                <Pressable
                  onPress={() => setPickerCategory(category)}
                  accessibilityRole="button"
                  accessibilityLabel={t('composer.tagsScreen.addToCategory')}
                  disabled={availableInCategory(category).length === 0}
                  style={({ pressed }) => [
                    styles.addPill,
                    {
                      backgroundColor: colors.bgInput,
                      borderColor: colors.border,
                      borderRadius: radius.pill,
                      opacity:
                        availableInCategory(category).length === 0
                          ? 0.4
                          : pressed
                            ? 0.85
                            : 1,
                    },
                  ]}
                >
                  <Plus size={14} color={colors.textSecondary} strokeWidth={2} />
                  <ThemedText
                    variant="caption"
                    style={{ color: colors.textSecondary }}
                  >
                    {t('composer.tagsScreen.addToCategory')}
                  </ThemedText>
                </Pressable>
              </View>
            </View>
          );
        })}
      </ScrollView>

      <View
        style={[
          styles.bottomBar,
          {
            borderTopColor: colors.border,
            backgroundColor: colors.bg,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
          },
        ]}
      >
        <GhostButton
          label={t('composer.tagsScreen.done')}
          accessibilityLabel={t('composer.tagsScreen.done')}
          onPress={handleDone}
          fullWidth
        />
      </View>

      {/* Per-category picker - dropdown of remaining tags */}
      <ModalSheet
        visible={pickerCategory !== null}
        onClose={() => setPickerCategory(null)}
        title={pickerCategory?.name ?? ''}
        height="50%"
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: spacing.md,
            paddingBottom: spacing.lg,
          }}
        >
          {pickerCategory
            ? availableInCategory(pickerCategory).map((tg) => (
                <Pressable
                  key={tg.id}
                  onPress={() => {
                    addTag(tg.id);
                    // Close immediately - quick add and back to grid.
                    setPickerCategory(null);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={tg.name}
                  style={({ pressed }) => [
                    styles.pickerRow,
                    {
                      borderBottomColor: colors.border,
                      paddingVertical: spacing.md,
                      backgroundColor: pressed
                        ? colors.bgInput
                        : 'transparent',
                    },
                  ]}
                >
                  <ThemedText variant="body" tone="primary">
                    {tg.name}
                  </ThemedText>
                </Pressable>
              ))
            : null}
        </ScrollView>
      </ModalSheet>
    </ScreenContainer>
  );
}

interface HeaderProps {
  title: string;
  onClose: () => void;
  rightAction?: React.ReactNode;
}

function Header({
  title,
  onClose,
  rightAction,
}: HeaderProps): React.ReactElement {
  const { colors, spacing } = useTheme();
  const { t } = useTranslation();
  return (
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
        onPress={onClose}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel={t('common.back')}
        style={styles.headerLeft}
      >
        <ChevronLeft size={22} color={colors.textPrimary} strokeWidth={1.75} />
      </Pressable>
      <ThemedText variant="heading" style={styles.headerTitle}>
        {title}
      </ThemedText>
      <View style={styles.headerRight}>{rightAction}</View>
    </View>
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
  headerRightBtn: {
    paddingHorizontal: 8,
    minHeight: 44,
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  categoryCard: {
    borderWidth: 1,
  },
  tagWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  tagPillSelected: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
    borderWidth: 1,
  },
  addPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
    borderWidth: 1,
  },
  pickerRow: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  bottomBar: {
    borderTopWidth: 1,
  },
});
