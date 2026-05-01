import React, { useCallback, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, ChevronLeft } from 'lucide-react-native';
import { Card } from '@/components/Card';
import { DestructiveButton } from '@/components/DestructiveButton';
import { Input } from '@/components/Input';
import { ScreenContainer } from '@/components/ScreenContainer';
import { SecondaryButton } from '@/components/SecondaryButton';
import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/lib/theme/useTheme';
import { useAuthStore } from '@/lib/store/authStore';
import { useTenantStore } from '@/lib/store/tenantStore';
import { useDraftStore } from '@/lib/store/draftStore';
import { useUploadStore } from '@/lib/store/uploadStore';
import { useDeleteMe } from '@/lib/api/queries';
import { showToast } from '@/lib/toast';

const CONFIRM_TOKEN = 'DELETE';

export default function DeleteAccountScreen(): React.ReactElement {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors, spacing, accent } = useTheme();
  const queryClient = useQueryClient();

  const [confirmText, setConfirmText] = useState<string>('');

  const authSignOut = useAuthStore((s) => s.signOut);
  const tenantClear = useTenantStore((s) => s.clear);
  const draftClearAll = useDraftStore((s) => s.clearAll);

  const deleteMe = useDeleteMe();

  const canConfirm: boolean = confirmText === CONFIRM_TOKEN;

  const handleBack = useCallback((): void => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/settings');
    }
  }, [router]);

  const handleConfirm = useCallback((): void => {
    if (!canConfirm) return;
    deleteMe.mutate(undefined, {
      onSuccess: async () => {
        // Best-effort local cleanup. Cancel any non-terminal upload jobs and
        // clear terminal ones; we then drop drafts, auth, and tenant state.
        const upload = useUploadStore.getState();
        for (const job of upload.jobs) {
          if (
            job.state !== 'done' &&
            job.state !== 'cancelled'
          ) {
            upload.cancel(job.id);
          }
        }
        upload.clearTerminal();
        draftClearAll();
        await authSignOut();
        await tenantClear();
        queryClient.clear();
        showToast({
          variant: 'success',
          message: t('settings.deleteAccount.deleted'),
        });
        router.replace('/(auth)/welcome');
      },
      onError: () => {
        showToast({
          variant: 'danger',
          message: t('settings.deleteAccount.error'),
        });
      },
    });
  }, [
    canConfirm,
    deleteMe,
    authSignOut,
    tenantClear,
    draftClearAll,
    queryClient,
    router,
    t,
  ]);

  return (
    <ScreenContainer>
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
          accessibilityLabel={t('settings.back')}
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
          <ThemedText variant="heading" tone="primary">
            {t('settings.deleteAccount.title')}
          </ThemedText>
        </View>
        <View style={styles.headerButton} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{
            padding: spacing.lg,
            gap: spacing.lg,
          }}
        >
          <View style={{ alignItems: 'center', gap: spacing.md }}>
            <AlertTriangle
              size={48}
              color={accent.danger}
              strokeWidth={1.75}
            />
            <ThemedText
              variant="title"
              tone="primary"
              style={{ textAlign: 'center' }}
            >
              {t('settings.deleteAccount.title')}
            </ThemedText>
            <ThemedText
              variant="body"
              tone="secondary"
              style={{ textAlign: 'center' }}
            >
              {t('settings.deleteAccount.body')}
            </ThemedText>
          </View>

          <Card padded>
            <ThemedText
              variant="caption"
              tone="muted"
              style={{ marginBottom: spacing.sm }}
            >
              {t('settings.deleteAccount.confirmHint')}
            </ThemedText>
            <Input
              value={confirmText}
              onChangeText={setConfirmText}
              placeholder={t('settings.deleteAccount.confirmPlaceholder')}
              autoCapitalize="characters"
              autoCorrect={false}
              accessibilityLabel={t(
                'settings.deleteAccount.confirmPlaceholder',
              )}
            />
          </Card>

          <View style={{ gap: spacing.sm }}>
            <DestructiveButton
              label={t('settings.deleteAccount.confirmAction')}
              accessibilityLabel={t(
                'settings.deleteAccount.confirmAction',
              )}
              loading={deleteMe.isPending}
              disabled={!canConfirm || deleteMe.isPending}
              onPress={handleConfirm}
            />
            <SecondaryButton
              label={t('settings.deleteAccount.cancel')}
              accessibilityLabel={t('settings.deleteAccount.cancel')}
              onPress={handleBack}
              disabled={deleteMe.isPending}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    minHeight: 48,
  },
  headerButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: {
    flex: 1,
    alignItems: 'center',
  },
});
