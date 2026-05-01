import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScreenContainer } from '@/components/ScreenContainer';
import { ThemedText } from '@/components/ThemedText';
import { OTPInput } from '@/components/OTPInput';
import { GhostButton } from '@/components/GhostButton';
import { useTheme } from '@/lib/theme/useTheme';
import { useEmailStart, useEmailVerify } from '@/lib/api/queries';
import { useAuthStore } from '@/lib/store/authStore';
import { showToast } from '@/lib/toast';
import { ApiError } from '@/types/api';

const RESEND_SECONDS = 30;

export default function OtpScreen(): React.ReactElement {
  const router = useRouter();
  const { t } = useTranslation();
  const { spacing } = useTheme();
  const params = useLocalSearchParams<{ email?: string }>();
  const email = typeof params.email === 'string' ? params.email : '';

  const [code, setCode] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number>(RESEND_SECONDS);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const emailStart = useEmailStart();
  const emailVerify = useEmailVerify();

  const startTimer = useCallback((): void => {
    setSecondsLeft(RESEND_SECONDS);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => {
    startTimer();
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [startTimer]);

  const handleResend = async (): Promise<void> => {
    if (secondsLeft > 0) return;
    try {
      await emailStart.mutateAsync({ email });
      setError(null);
      setCode('');
      startTimer();
      showToast({ variant: 'success', message: t('auth.otp.resendSent') });
    } catch {
      showToast({ variant: 'danger', message: t('common.error') });
    }
  };

  const handleComplete = async (value: string): Promise<void> => {
    setError(null);
    try {
      const res = await emailVerify.mutateAsync({ email, code: value });
      await useAuthStore
        .getState()
        .signIn(res.jwt, res.refreshToken, res.identity);
      if (res.identity === null) {
        router.replace('/(auth)/profile-setup');
      } else {
        router.replace('/');
      }
    } catch (err) {
      if (err instanceof ApiError && err.code === 'INVALID_OTP') {
        setError(t('auth.otp.invalid'));
        setCode('');
      } else {
        showToast({ variant: 'danger', message: t('common.error') });
      }
    }
  };

  return (
    <ScreenContainer padded>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <View style={{ flex: 1 }}>
          <ThemedText
            variant="title"
            style={{ marginBottom: spacing.xs, marginTop: spacing.lg }}
          >
            {t('auth.otp.title')}
          </ThemedText>
          <ThemedText
            variant="body"
            tone="secondary"
            style={{ marginBottom: spacing.xl }}
          >
            {t('auth.otp.body', { email })}
          </ThemedText>
          <OTPInput
            value={code}
            onChange={(v) => {
              setError(null);
              setCode(v);
            }}
            onComplete={(v) => {
              void handleComplete(v);
            }}
            autoFocus
            error={!!error}
            accessibilityLabel={t('auth.otp.title')}
          />
          {error ? (
            <ThemedText
              variant="caption"
              tone="danger"
              style={{ marginTop: spacing.sm }}
            >
              {error}
            </ThemedText>
          ) : null}
          <View style={{ marginTop: spacing.xl, alignItems: 'flex-start' }}>
            {secondsLeft > 0 ? (
              <ThemedText variant="caption" tone="muted">
                {t('auth.otp.resendIn', { seconds: secondsLeft })}
              </ThemedText>
            ) : (
              <GhostButton
                label={t('auth.otp.resend')}
                accessibilityLabel={t('auth.otp.resend')}
                onPress={() => {
                  void handleResend();
                }}
                disabled={emailStart.isPending}
              />
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
