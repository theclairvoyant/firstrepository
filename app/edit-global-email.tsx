// Change the global creator email. Two-step flow:
//   1. Enter new email -> Send code (mocks emailStart)
//   2. Enter the OTP code -> Verify (mocks emailVerify with 123456)
// On verify success, patch the creator profile with the new email and
// pop back to the edit-global-profile screen.

import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
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
import { ChevronLeft } from 'lucide-react-native';
import { Input } from '@/components/Input';
import { OTPInput } from '@/components/OTPInput';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenContainer } from '@/components/ScreenContainer';
import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/lib/theme/useTheme';
import { useAuthStore } from '@/lib/store/authStore';
import {
  useEmailStart,
  useEmailVerify,
  usePatchMe,
} from '@/lib/api/queries';
import { showToast } from '@/lib/toast';
import { ApiError } from '@/types/api';

const emailSchema = z.string().email();

type Step = 'enter' | 'verify';

export default function EditGlobalEmailScreen(): React.ReactElement {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();

  const creator = useAuthStore((s) => s.creator);
  const setCreator = useAuthStore((s) => s.setCreator);
  const emailStart = useEmailStart();
  const emailVerify = useEmailVerify();
  const patchMe = usePatchMe();

  const [step, setStep] = useState<Step>('enter');
  const [email, setEmail] = useState<string>('');
  const [emailTouched, setEmailTouched] = useState<boolean>(false);
  const [code, setCode] = useState<string>('');
  const [codeError, setCodeError] = useState<string | undefined>(undefined);

  const emailValid: boolean = useMemo(() => {
    return emailSchema.safeParse(email.trim()).success;
  }, [email]);

  const isSameAsCurrent: boolean =
    !!creator && creator.email.trim().toLowerCase() === email.trim().toLowerCase();

  const handleBack = useCallback((): void => {
    if (router.canGoBack()) router.back();
    else router.replace('/edit-global-profile');
  }, [router]);

  const handleSendCode = useCallback(async (): Promise<void> => {
    if (!emailValid || isSameAsCurrent) return;
    try {
      await emailStart.mutateAsync({ email: email.trim() });
      setStep('verify');
    } catch {
      showToast({
        variant: 'danger',
        message: t('editGlobalEmail.sendError'),
      });
    }
  }, [email, emailValid, isSameAsCurrent, emailStart, t]);

  const handleVerify = useCallback(async (): Promise<void> => {
    if (code.length !== 6) return;
    setCodeError(undefined);
    try {
      // Verify the new email. The mock returns mock auth tokens we don't
      // need here (we're already signed in); we only care that it
      // succeeded.
      await emailVerify.mutateAsync({ email: email.trim(), code });
      // Persist the new email on the creator profile.
      const next = await patchMe.mutateAsync({ email: email.trim() });
      setCreator(next);
      Alert.alert(
        t('editGlobalEmail.successTitle'),
        t('editGlobalEmail.successBody', { email: email.trim() }),
        [{ text: t('common.continue'), onPress: handleBack }],
      );
    } catch (err) {
      if (err instanceof ApiError && err.code === 'INVALID_OTP') {
        setCodeError(t('editGlobalEmail.codeInvalid'));
        return;
      }
      showToast({
        variant: 'danger',
        message: t('editGlobalEmail.verifyError'),
      });
    }
  }, [code, email, emailVerify, patchMe, setCreator, handleBack, t]);

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
          {t('editGlobalEmail.title')}
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
          <ThemedText variant="body" tone="secondary">
            {step === 'enter'
              ? t('editGlobalEmail.enterBody', {
                  current: creator?.email ?? '',
                })
              : t('editGlobalEmail.verifyBody', { email: email.trim() })}
          </ThemedText>

          {step === 'enter' ? (
            <Input
              label={t('editGlobalEmail.newEmailLabel')}
              value={email}
              onChangeText={setEmail}
              onBlur={() => setEmailTouched(true)}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              autoCorrect={false}
              placeholder={t('editGlobalEmail.newEmailPlaceholder')}
              error={
                emailTouched && email.length > 0 && !emailValid
                  ? t('editGlobalEmail.invalidEmail')
                  : isSameAsCurrent
                    ? t('editGlobalEmail.sameEmail')
                    : undefined
              }
            />
          ) : (
            <View style={{ gap: spacing.sm }}>
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
                onPress={() => setStep('enter')}
                accessibilityRole="button"
                accessibilityLabel={t('editGlobalEmail.backToEmail')}
                hitSlop={6}
                style={({ pressed }) => ({
                  alignSelf: 'flex-start',
                  opacity: pressed ? 0.7 : 1,
                  paddingVertical: 6,
                })}
              >
                <ThemedText variant="caption" tone="secondary">
                  {t('editGlobalEmail.backToEmail')}
                </ThemedText>
              </Pressable>
            </View>
          )}
        </ScrollView>

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
              label={t('editGlobalEmail.sendCode')}
              accessibilityLabel={t('editGlobalEmail.sendCode')}
              onPress={() => {
                void handleSendCode();
              }}
              disabled={!emailValid || isSameAsCurrent}
              loading={emailStart.isPending}
            />
          ) : (
            <PrimaryButton
              label={t('editGlobalEmail.verify')}
              accessibilityLabel={t('editGlobalEmail.verify')}
              onPress={() => {
                void handleVerify();
              }}
              disabled={code.length !== 6}
              loading={emailVerify.isPending || patchMe.isPending}
            />
          )}
        </View>
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
});
