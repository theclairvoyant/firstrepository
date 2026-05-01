import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { ChevronDown, ChevronUp, X } from 'lucide-react-native';
import { CTAPicker } from '@/components/CTAPicker';
import { EmptyState } from '@/components/EmptyState';
import { GhostButton } from '@/components/GhostButton';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenContainer } from '@/components/ScreenContainer';
import { ThemedText } from '@/components/ThemedText';
import { TagSection } from '@/components/TagSection';
import { ModalSheet } from '@/components/ModalSheet';
import { SecondaryButton } from '@/components/SecondaryButton';
import { DestructiveButton } from '@/components/DestructiveButton';
import { WorkspaceTypeBadge } from '@/components/WorkspaceTypeBadge';
import { useTheme } from '@/lib/theme/useTheme';
import { useTenantStore } from '@/lib/store/tenantStore';
import { useDraftStore } from '@/lib/store/draftStore';
import { useTagTopology, useWorkspace } from '@/lib/api/queries';
import type { CTA, Tag, TagCategory } from '@/types/api';

const TITLE_MAX = 80;
const DESCRIPTION_MAX = 500;

type SectionId = 'meta' | 'tags' | 'cta';

const urlSchema = z
  .string()
  .min(1)
  .url()
  .regex(/^https?:\/\//);

interface SectionHeaderProps {
  title: string;
  expanded: boolean;
  onToggle: () => void;
}

function SectionHeader({
  title,
  expanded,
  onToggle,
}: SectionHeaderProps): React.ReactElement {
  const { colors, spacing } = useTheme();
  const Icon = expanded ? ChevronUp : ChevronDown;
  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ expanded }}
      style={({ pressed }) => [
        styles.sectionHeader,
        {
          paddingVertical: spacing.sm,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <ThemedText variant="heading" style={{ flex: 1 }}>
        {title}
      </ThemedText>
      <Icon size={20} color={colors.textSecondary} strokeWidth={1.75} />
    </Pressable>
  );
}

interface MultilineFieldProps {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (v: string) => void;
  maxLength: number;
  error?: string;
  multiline?: boolean;
}

function MultilineField({
  label,
  placeholder,
  value,
  onChangeText,
  maxLength,
  error,
  multiline = false,
}: MultilineFieldProps): React.ReactElement {
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
        <ThemedText
          variant="caption"
          tone="secondary"
          style={{ flex: 1 }}
        >
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
            minHeight: multiline ? 120 : 52,
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
          style={[
            styles.input,
            {
              color: colors.textPrimary,
              minHeight: multiline ? 110 : 48,
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

export default function ComposerEditScreen(): React.ReactElement | null {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors, spacing } = useTheme();

  const activeWorkspaceId = useTenantStore((s) => s.activeWorkspaceId);
  const workspaceQuery = useWorkspace(activeWorkspaceId);
  const tagTopologyQuery = useTagTopology(activeWorkspaceId);

  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [ctaId, setCtaId] = useState<string | null>(null);
  const [dynamicUrl, setDynamicUrl] = useState<string>('');

  const [titleError, setTitleError] = useState<string | undefined>(undefined);
  const [urlError, setUrlError] = useState<string | undefined>(undefined);

  const [openSections, setOpenSections] = useState<Record<SectionId, boolean>>({
    meta: true,
    tags: false,
    cta: false,
  });

  const [discardOpen, setDiscardOpen] = useState<boolean>(false);

  // Prefill from draft on first focus.
  const hasPrefilledRef = React.useRef<boolean>(false);

  useFocusEffect(
    useCallback(() => {
      if (!activeWorkspaceId) {
        router.replace('/(tabs)/profile');
        return;
      }
      if (hasPrefilledRef.current) return;
      const existing = useDraftStore.getState().getDraft(activeWorkspaceId);
      if (existing) {
        setTitle(existing.title);
        setDescription(existing.description);
        setTagIds(existing.tagIds);
        setCtaId(existing.ctaId);
        setDynamicUrl(existing.ctaUrl ?? '');
      }
      hasPrefilledRef.current = true;
    }, [activeWorkspaceId, router]),
  );

  // Persist on field changes (cheap; the draft store is already debounced via storage write).
  useEffect(() => {
    if (!activeWorkspaceId || !hasPrefilledRef.current) return;
    useDraftStore.getState().patchDraft(activeWorkspaceId, {
      title,
      description,
      tagIds,
      ctaId,
      ctaUrl: dynamicUrl.length > 0 ? dynamicUrl : null,
    });
  }, [activeWorkspaceId, title, description, tagIds, ctaId, dynamicUrl]);

  const workspace = workspaceQuery.data ?? null;
  const tagTopology: TagCategory[] = tagTopologyQuery.data ?? [];
  const allowedCtas: CTA[] = workspace?.capabilities.allowedCtas ?? [];
  const tagsEnabled: boolean =
    workspace?.capabilities.creatorTagsEnabled ?? false;

  const selectedCta: CTA | null = useMemo(() => {
    if (!ctaId) return null;
    return allowedCtas.find((c) => c.id === ctaId) ?? null;
  }, [allowedCtas, ctaId]);

  const toggleSection = useCallback((id: SectionId) => {
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const toggleTag = useCallback(
    (categoryTags: Tag[], tagName: string) => {
      const tag = categoryTags.find((t2) => t2.name === tagName);
      if (!tag) return;
      setTagIds((prev) => {
        if (prev.includes(tag.id)) return prev.filter((id) => id !== tag.id);
        return [...prev, tag.id];
      });
    },
    [],
  );

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
      setOpenSections((prev) => ({ ...prev, meta: true }));
      valid = false;
    } else {
      setTitleError(undefined);
    }

    if (selectedCta && selectedCta.kind === 'dynamic') {
      const parsed = urlSchema.safeParse(dynamicUrl);
      if (!parsed.success) {
        setUrlError(t('composer.edit.urlInvalid'));
        setOpenSections((prev) => ({ ...prev, cta: true }));
        valid = false;
      } else {
        setUrlError(undefined);
      }
    } else {
      setUrlError(undefined);
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

  if (!activeWorkspaceId || !workspace) {
    return null;
  }

  return (
    <ScreenContainer edges={['top', 'left', 'right', 'bottom']} bg="bg">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        {/* Custom top header */}
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
          contentContainerStyle={{
            padding: spacing.md,
            paddingBottom: spacing.xxl,
            gap: spacing.md,
          }}
        >
          {/* Section 1 - Title and description */}
          <View
            style={[
              styles.sectionCard,
              {
                backgroundColor: colors.bgCard,
                borderColor: colors.border,
              },
            ]}
          >
            <SectionHeader
              title={t('composer.edit.sectionTitleAndDescription')}
              expanded={openSections.meta}
              onToggle={() => toggleSection('meta')}
            />
            {openSections.meta ? (
              <View style={{ padding: spacing.md, paddingTop: 0, gap: spacing.md }}>
                <MultilineField
                  label={t('composer.edit.titleLabel')}
                  placeholder={t('composer.edit.titlePlaceholder')}
                  value={title}
                  onChangeText={setTitle}
                  maxLength={TITLE_MAX}
                  error={titleError}
                />
                <MultilineField
                  label={t('composer.edit.descriptionLabel')}
                  placeholder={t('composer.edit.descriptionPlaceholder')}
                  value={description}
                  onChangeText={setDescription}
                  maxLength={DESCRIPTION_MAX}
                  multiline
                />
              </View>
            ) : null}
          </View>

          {/* Section 2 - Tags */}
          {tagsEnabled ? (
            <View
              style={[
                styles.sectionCard,
                {
                  backgroundColor: colors.bgCard,
                  borderColor: colors.border,
                },
              ]}
            >
              <SectionHeader
                title={t('composer.edit.sectionTags')}
                expanded={openSections.tags}
                onToggle={() => toggleSection('tags')}
              />
              {openSections.tags ? (
                <View
                  style={{
                    padding: spacing.md,
                    paddingTop: 0,
                    gap: spacing.md,
                  }}
                >
                  {tagTopology.map((category) => {
                    const tagNames = category.tags.map((tg) => tg.name);
                    const selectedNames = category.tags
                      .filter((tg) => tagIds.includes(tg.id))
                      .map((tg) => tg.name);
                    return (
                      <TagSection
                        key={category.id}
                        title={category.name}
                        tags={tagNames}
                        selected={selectedNames}
                        onToggle={(name) => toggleTag(category.tags, name)}
                      />
                    );
                  })}
                </View>
              ) : null}
            </View>
          ) : null}

          {/* Section 3 - Conversion */}
          <View
            style={[
              styles.sectionCard,
              {
                backgroundColor: colors.bgCard,
                borderColor: colors.border,
              },
            ]}
          >
            <SectionHeader
              title={t('composer.edit.sectionCta')}
              expanded={openSections.cta}
              onToggle={() => toggleSection('cta')}
            />
            {openSections.cta ? (
              <View
                style={{
                  padding: spacing.md,
                  paddingTop: 0,
                }}
              >
                {allowedCtas.length === 0 ? (
                  <EmptyState
                    title={t('composer.edit.noCtas')}
                  />
                ) : (
                  <CTAPicker
                    ctas={allowedCtas}
                    selectedId={ctaId}
                    onSelect={(id) => {
                      setCtaId(id);
                      setUrlError(undefined);
                    }}
                    dynamicUrl={dynamicUrl}
                    onChangeDynamicUrl={(url) => {
                      setDynamicUrl(url);
                      setUrlError(undefined);
                    }}
                    dynamicUrlError={urlError}
                  />
                )}
              </View>
            ) : null}
          </View>
        </ScrollView>

        {/* Sticky bottom bar */}
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
  sectionCard: {
    borderWidth: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
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
});
