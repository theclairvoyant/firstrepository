// Workspace discovery via verified work email. Three-step flow:
//   1. Enter email (prefilled from the global creator profile)
//   2. Send a 6-digit verification code (mocks emailStart, code 123456)
//   3. Verify -> look up workspaces whitelisting this email domain
// On match the user is shown the matching workspaces and can request /
// auto-join. On no match we surface a helpful message and route them to
// add-tenant for an invite-code attempt instead. The verify step is the
// gate: a workspace cannot be joined without a verified email on the
// admin's allowlist.

import React, { useCallback, useMemo, useState } from 'react';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { z } from 'zod';
import { Building2, ChevronLeft, Mail, ShieldCheck } from 'lucide-react-native';
import { Avatar } from '@/components/Avatar';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { GhostButton } from '@/components/GhostButton';
import { Input } from '@/components/Input';
import { OTPInput } from '@/components/OTPInput';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenContainer } from '@/components/ScreenContainer';
import { SecondaryButton } from '@/components/SecondaryButton';
import { ThemedText } from '@/components/ThemedText';
import { WorkspaceTypeBadge } from '@/components/WorkspaceTypeBadge';
import { useTheme } from '@/lib/theme/useTheme';
import { useAuthStore } from '@/lib/store/authStore';
import {
  useByDomain,
  useEmailStart,
  useEmailVerify,
  useRequestInvite,
} from '@/lib/api/queries';
import { showToast } from '@/lib/toast';
import { ApiError } from '@/types/api';
import type { DiscoveryByDomainEntry } from '@/types/api';

const emailSchema = z.string().email();

type Step = 'enter' | 'verify' | 'results';

export default function SearchByEmailScreen(): React.ReactElement {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors, spacing, accent } = useTheme();
  const insets = useSafeAreaInsets();

  const creator = useAuthStore((s) => s.creator);
  const emailStart = useEmailStart();
  const emailVerify = useEmailVerify();
  const byDomain = useByDomain();
  const requestInvite = useRequestInvite();

  const [step, setStep] = useState<Step>('enter');
  // Default to the verified global email so the user just has to confirm.
  const [email, setEmail] = useState<string>(creator?.email ?? '');
  const [emailTouched, setEmailTouched] = useState<boolean>(false);
  const [code, setCode] = useState<string>('');
  const [codeError, setCodeError] = useState<string | undefined>(undefined);
  const [results, setResults] = useState<DiscoveryByDomainEntry[]>([]);

  const emailValid: boolean = useMemo(() => {
    return emailSchema.safeParse(email.trim()).success;
  }, [email]);

  const emailInheritedFromGlobal: boolean =
    !!creator &&
    creator.emailVerified &&
    creator.email.trim().toLowerCase() === email.trim().toLowerCase();

  const handleBack = useCallback((): void => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/profile');
  }, [router]);

  // Inherited verified email skips the OTP step entirely - we already
  // trust the address.
  const handleSendOrSkip = useCallback(async (): Promise<void> => {
    if (!emailValid) return;
    if (emailInheritedFromGlobal) {
      try {
        const res = await byDomain.mutateAsync();
        setResults(res.workspaces);
        setStep('results');
      } catch {
        setResults([]);
        setStep('results');
      }
      return;
    }
    try {
      await emailStart.mutateAsync({ email: email.trim() });
      setStep('verify');
    } catch {
      showToast({
        variant: 'danger',
        message: t('searchByEmail.sendError'),
      });
    }
  }, [
    emailValid,
    emailInheritedFromGlobal,
    byDomain,
    emailStart,
    email,
    t,
  ]);

  const handleVerify = useCallback(async (): Promise<void> => {
    if (code.length !== 6) return;
    setCodeError(undefined);
    try {
      await emailVerify.mutateAsync({ email: email.trim(), code });
      const res = await byDomain.mutateAsync();
      setResults(res.workspaces);
      setStep('results');
    } catch (err) {
      if (err instanceof ApiError && err.code === 'INVALID_OTP') {
        setCodeError(t('searchByEmail.codeInvalid'));
        return;
      }
      showToast({
        variant: 'danger',
        message: t('searchByEmail.verifyError'),
      });
    }
  }, [code, email, emailVerify, byDomain, t]);

  const handleRequest = useCallback(
    async (entry: DiscoveryByDomainEntry): Promise<void> => {
      try {
        await requestInvite.mutateAsync({
          workspaceId: entry.workspace.id,
        });
        showToast({
          variant: 'success',
          message: t('searchByEmail.requestSent'),
        });
        if (router.canGoBack()) router.back();
        else router.replace('/(tabs)/profile');
      } catch {
        showToast({
          variant: 'danger',
          message: t('searchByEmail.requestError'),
        });
      }
    },
    [requestInvite, router, t],
  );

  const handleTryInviteCode = useCallback((): void => {
    router.replace('/add-tenant');
  }, [router]);

  return (
    <ScreenContainer edges={['left', 'right']} bg="bg">
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top,
            paddingBottom: spacing.sm,
            paddingHorizontal: spacing.xs,
            borderBottomColor: colors.border,
            backgroundColor: colors.bgElevated,
          },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          onPress={handleBack}
          hitSlop={8}
          style={({ pressed }) => [
            styles.backBtn,
            pressed && styles.pressed,
          ]}
        >
          <ChevronLeft size={24} color={colors.textPrimary} strokeWidth={1.75} />
        </Pressable>
        <ThemedText variant="heading" style={styles.headerTitle}>
          {t('searchByEmail.title')}
        </ThemedText>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: spacing.md,
            paddingTop: spacing.xl,
            paddingBottom: spacing.xl,
            gap: spacing.md,
          }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          automaticallyAdjustKeyboardInsets
        >
          {step === 'enter' ? (
            <>
              <View style={{ gap: spacing.sm }}>
                <View
                  style={[
                    styles.iconBubble,
                    { backgroundColor: `${accent.primary}1f` },
                  ]}
                >
                  <Mail size={22} color={accent.primary} strokeWidth={1.75} />
                </View>
                <ThemedText variant="title" tone="primary">
                  {t('searchByEmail.heading')}
                </ThemedText>
                <ThemedText variant="body" tone="secondary">
                  {t('searchByEmail.body')}
                </ThemedText>
              </View>
              <Input
                label={t('searchByEmail.emailLabel')}
                value={email}
                onChangeText={setEmail}
                onBlur={() => setEmailTouched(true)}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                autoCorrect={false}
                placeholder={t('searchByEmail.emailPlaceholder')}
                error={
                  emailTouched && email.length > 0 && !emailValid
                    ? t('searchByEmail.invalidEmail')
                    : undefined
                }
                helperText={
                  emailInheritedFromGlobal
                    ? t('searchByEmail.inheritedHint')
                    : t('searchByEmail.verifyHint')
                }
              />
            </>
          ) : null}

          {step === 'verify' ? (
            <>
              <View style={{ gap: spacing.sm }}>
                <View
                  style={[
                    styles.iconBubble,
                    { backgroundColor: `${accent.primary}1f` },
                  ]}
                >
                  <ShieldCheck
                    size={22}
                    color={accent.primary}
                    strokeWidth={1.75}
                  />
                </View>
                <ThemedText variant="title" tone="primary">
                  {t('searchByEmail.verifyHeading')}
                </ThemedText>
                <ThemedText variant="body" tone="secondary">
                  {t('searchByEmail.verifyBody', { email: email.trim() })}
                </ThemedText>
              </View>
              <OTPInput
                value={code}
                onChange={(v) => {
                  setCode(v);
                  setCodeError(undefined);
                }}
                error={!!codeError}
              />
              {codeError ? (
                <ThemedText variant="caption" tone="danger">
                  {codeError}
                </ThemedText>
              ) : null}
              <Pressable
                onPress={() => {
                  setStep('enter');
                  setCode('');
                  setCodeError(undefined);
                }}
                accessibilityRole="button"
                accessibilityLabel={t('searchByEmail.useDifferentEmail')}
                hitSlop={6}
                style={({ pressed }) => ({
                  alignSelf: 'flex-start',
                  opacity: pressed ? 0.7 : 1,
                  paddingVertical: 6,
                })}
              >
                <ThemedText variant="caption" tone="secondary">
                  {t('searchByEmail.useDifferentEmail')}
                </ThemedText>
              </Pressable>
            </>
          ) : null}

          {step === 'results' ? (
            results.length === 0 ? (
              <View style={{ paddingTop: spacing.xl }}>
                <EmptyState
                  icon={Building2}
                  title={t('searchByEmail.noResultsTitle')}
                  description={t('searchByEmail.noResultsBody', {
                    email: email.trim(),
                  })}
                  cta={
                    <View style={{ alignSelf: 'stretch' }}>
                      <SecondaryButton
                        label={t('searchByEmail.tryInviteCode')}
                        accessibilityLabel={t('searchByEmail.tryInviteCode')}
                        onPress={handleTryInviteCode}
                      />
                    </View>
                  }
                />
              </View>
            ) : (
              <View style={{ gap: spacing.md }}>
                <ThemedText variant="body" tone="secondary">
                  {t('searchByEmail.resultsBody', {
                    count: results.length,
                  })}
                </ThemedText>
                {results.map((entry) => {
                  const ws = entry.workspace;
                  return (
                    <Card key={ws.id}>
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: spacing.md,
                        }}
                      >
                        <Avatar
                          size={56}
                          name={ws.name}
                          uri={ws.brand.logoUrl || undefined}
                          accessibilityLabel={ws.name}
                        />
                        <View style={{ flex: 1, gap: 2 }}>
                          <ThemedText
                            variant="heading"
                            numberOfLines={1}
                          >
                            {ws.name}
                          </ThemedText>
                          <ThemedText
                            variant="mono"
                            tone="muted"
                            numberOfLines={1}
                          >
                            {`@${ws.handle}`}
                          </ThemedText>
                        </View>
                        <WorkspaceTypeBadge
                          type={ws.type}
                          style={{ alignSelf: 'center' }}
                        />
                      </View>
                      <View style={{ marginTop: spacing.md }}>
                        <PrimaryButton
                          label={
                            entry.autoJoined
                              ? t('searchByEmail.joined')
                              : t('searchByEmail.requestAccess')
                          }
                          accessibilityLabel={t(
                            'searchByEmail.requestAccess',
                          )}
                          disabled={entry.autoJoined}
                          loading={requestInvite.isPending}
                          onPress={() => {
                            void handleRequest(entry);
                          }}
                        />
                      </View>
                    </Card>
                  );
                })}
                <GhostButton
                  label={t('searchByEmail.searchAgain')}
                  accessibilityLabel={t('searchByEmail.searchAgain')}
                  fullWidth
                  onPress={() => {
                    setStep('enter');
                    setResults([]);
                    setCode('');
                  }}
                />
              </View>
            )
          ) : null}
        </ScrollView>

        {step !== 'results' ? (
          <View
            style={{
              paddingHorizontal: spacing.md,
              paddingBottom: insets.bottom + spacing.md,
              paddingTop: spacing.md,
              borderTopWidth: 1,
              borderTopColor: colors.border,
              backgroundColor: colors.bgElevated,
            }}
          >
            {step === 'enter' ? (
              <PrimaryButton
                label={
                  emailInheritedFromGlobal
                    ? t('searchByEmail.searchWorkspaces')
                    : t('searchByEmail.sendCode')
                }
                accessibilityLabel={t('searchByEmail.sendCode')}
                onPress={() => {
                  void handleSendOrSkip();
                }}
                disabled={!emailValid}
                loading={emailStart.isPending || byDomain.isPending}
              />
            ) : (
              <PrimaryButton
                label={t('searchByEmail.verify')}
                accessibilityLabel={t('searchByEmail.verify')}
                onPress={() => {
                  void handleVerify();
                }}
                disabled={code.length !== 6}
                loading={emailVerify.isPending || byDomain.isPending}
              />
            )}
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  backBtn: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
  },
  pressed: {
    opacity: 0.7,
  },
  iconBubble: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
