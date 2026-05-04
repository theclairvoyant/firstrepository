// CTA selection subscreen. Reachable from the composer/edit summary row.
// Lists admin-allowed CTAs (workspace.capabilities.allowedCtas). Users can
// only pick one or pick None - they cannot create new CTAs. Static (admin
// link) CTAs need no input; dynamic CTAs require the user to add their own
// https URL.

import React, { useCallback, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { ChevronLeft, Zap } from 'lucide-react-native';
import { CTAPicker } from '@/components/CTAPicker';
import { EmptyState } from '@/components/EmptyState';
import { GhostButton } from '@/components/GhostButton';
import { ScreenContainer } from '@/components/ScreenContainer';
import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/lib/theme/useTheme';
import { useTenantStore } from '@/lib/store/tenantStore';
import { useDraftStore } from '@/lib/store/draftStore';
import { useWorkspace } from '@/lib/api/queries';
import type { CTA } from '@/types/api';

const urlSchema = z
  .string()
  .min(1)
  .url()
  .regex(/^https?:\/\//);

export default function ComposerCtaScreen(): React.ReactElement | null {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors, spacing } = useTheme();

  const activeWorkspaceId = useTenantStore((s) => s.activeWorkspaceId);
  const workspaceQuery = useWorkspace(activeWorkspaceId);

  const [ctaId, setCtaId] = useState<string | null>(null);
  const [dynamicUrl, setDynamicUrl] = useState<string>('');
  const [urlError, setUrlError] = useState<string | undefined>(undefined);

  useFocusEffect(
    useCallback(() => {
      if (!activeWorkspaceId) {
        router.replace('/(tabs)/profile');
        return;
      }
      const existing = useDraftStore.getState().getDraft(activeWorkspaceId);
      if (existing) {
        setCtaId(existing.ctaId);
        setDynamicUrl(existing.ctaUrl ?? '');
      }
    }, [activeWorkspaceId, router]),
  );

  const allowedCtas: CTA[] = workspaceQuery.data?.capabilities.allowedCtas ?? [];

  const selectedCta: CTA | null = useMemo(() => {
    if (!ctaId) return null;
    return allowedCtas.find((c) => c.id === ctaId) ?? null;
  }, [allowedCtas, ctaId]);

  const handleSelect = useCallback((nextId: string | null) => {
    setCtaId(nextId);
    setUrlError(undefined);
  }, []);

  const handleChangeUrl = useCallback((url: string) => {
    setDynamicUrl(url);
    setUrlError(undefined);
  }, []);

  const handleDone = useCallback(() => {
    if (!activeWorkspaceId) return;
    if (selectedCta && selectedCta.kind === 'dynamic') {
      const parsed = urlSchema.safeParse(dynamicUrl);
      if (!parsed.success) {
        setUrlError(t('composer.ctaScreen.linkRequired'));
        return;
      }
    }
    useDraftStore.getState().patchDraft(activeWorkspaceId, {
      ctaId,
      ctaUrl:
        selectedCta && selectedCta.kind === 'dynamic' ? dynamicUrl : null,
    });
    router.back();
  }, [
    activeWorkspaceId,
    selectedCta,
    ctaId,
    dynamicUrl,
    router,
    t,
  ]);

  if (!activeWorkspaceId || !workspaceQuery.data) return null;

  return (
    <ScreenContainer edges={['top', 'left', 'right', 'bottom']} bg="bg">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
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
            onPress={() => router.back()}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
            style={styles.headerLeft}
          >
            <ChevronLeft
              size={22}
              color={colors.textPrimary}
              strokeWidth={1.75}
            />
          </Pressable>
          <ThemedText variant="heading" style={styles.headerTitle}>
            {t('composer.ctaScreen.title')}
          </ThemedText>
          <View style={styles.headerRight} />
        </View>

        <ScrollView
          style={{ flex: 1 }}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            padding: spacing.md,
            paddingBottom: spacing.xxxl,
            gap: spacing.md,
          }}
        >
          {allowedCtas.length === 0 ? (
            <View style={styles.center}>
              <EmptyState
                icon={Zap}
                title={t('composer.ctaScreen.emptyTitle')}
                description={t('composer.ctaScreen.emptyBody')}
              />
            </View>
          ) : (
            <>
              <ThemedText variant="body" tone="secondary">
                {t('composer.ctaScreen.body')}
              </ThemedText>
              <CTAPicker
                ctas={allowedCtas}
                selectedId={ctaId}
                onSelect={handleSelect}
                dynamicUrl={dynamicUrl}
                onChangeDynamicUrl={handleChangeUrl}
                dynamicUrlError={urlError}
              />
            </>
          )}
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
            label={t('composer.ctaScreen.done')}
            accessibilityLabel={t('composer.ctaScreen.done')}
            onPress={handleDone}
            fullWidth
          />
        </View>
      </KeyboardAvoidingView>
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
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  bottomBar: {
    borderTopWidth: 1,
  },
});
