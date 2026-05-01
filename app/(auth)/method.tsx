import React from 'react';
import { View, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Mail, Globe, Building2, Apple } from 'lucide-react-native';
import { ScreenContainer } from '@/components/ScreenContainer';
import { ThemedText } from '@/components/ThemedText';
import { PrimaryButton } from '@/components/PrimaryButton';
import { SecondaryButton } from '@/components/SecondaryButton';
import { GhostButton } from '@/components/GhostButton';
import { useTheme } from '@/lib/theme/useTheme';
import { showToast } from '@/lib/toast';

export default function MethodScreen(): React.ReactElement {
  const router = useRouter();
  const { t } = useTranslation();
  const { spacing, colors } = useTheme();

  const onSso = (): void => {
    showToast({ variant: 'info', message: t('auth.sso.pending') });
  };

  return (
    <ScreenContainer padded>
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <ThemedText
          variant="title"
          style={{ marginBottom: spacing.xs, textAlign: 'center' }}
        >
          {t('auth.method.title')}
        </ThemedText>
        <ThemedText
          variant="body"
          tone="secondary"
          style={{ textAlign: 'center', marginBottom: spacing.xl }}
        >
          {t('auth.method.subtitle')}
        </ThemedText>
        <View style={{ gap: spacing.sm }}>
          <PrimaryButton
            label={t('auth.method.continueEmail')}
            accessibilityLabel={t('auth.method.continueEmail')}
            leftIcon={<Mail size={18} color={colors.textInverse} strokeWidth={1.75} />}
            onPress={() => router.push('/(auth)/email')}
          />
          <SecondaryButton
            label={t('auth.method.continueGoogle')}
            accessibilityLabel={t('auth.method.continueGoogle')}
            leftIcon={<Globe size={18} color={colors.textPrimary} strokeWidth={1.75} />}
            onPress={onSso}
          />
          <SecondaryButton
            label={t('auth.method.continueMicrosoft')}
            accessibilityLabel={t('auth.method.continueMicrosoft')}
            leftIcon={<Building2 size={18} color={colors.textPrimary} strokeWidth={1.75} />}
            onPress={onSso}
          />
          {Platform.OS === 'ios' ? (
            <SecondaryButton
              label={t('auth.method.continueApple')}
              accessibilityLabel={t('auth.method.continueApple')}
              leftIcon={<Apple size={18} color={colors.textPrimary} strokeWidth={1.75} />}
              onPress={onSso}
            />
          ) : null}
        </View>
      </View>
      <View style={{ paddingBottom: spacing.lg }}>
        <GhostButton
          label={t('auth.welcome.haveInviteCode')}
          accessibilityLabel={t('auth.welcome.haveInviteCode')}
          fullWidth
          onPress={() => router.push('/(auth)/invite-code')}
        />
      </View>
    </ScreenContainer>
  );
}
