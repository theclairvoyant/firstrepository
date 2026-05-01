import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScreenContainer } from '@/components/ScreenContainer';
import { ThemedText } from '@/components/ThemedText';
import { PrimaryButton } from '@/components/PrimaryButton';
import { GhostButton } from '@/components/GhostButton';
import { useTheme } from '@/lib/theme/useTheme';

export default function WelcomeScreen(): React.ReactElement {
  const router = useRouter();
  const { t } = useTranslation();
  const { spacing } = useTheme();

  return (
    <ScreenContainer padded>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ThemedText
          variant="display"
          style={{ textAlign: 'center', marginBottom: spacing.sm }}
        >
          {t('auth.welcome.title')}
        </ThemedText>
        <ThemedText
          variant="body"
          tone="secondary"
          style={{ textAlign: 'center' }}
        >
          {t('auth.welcome.tagline')}
        </ThemedText>
      </View>
      <View style={{ paddingBottom: spacing.lg, gap: spacing.sm }}>
        <PrimaryButton
          label={t('auth.welcome.getStarted')}
          accessibilityLabel={t('auth.welcome.getStarted')}
          onPress={() => router.push('/(auth)/method')}
        />
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
