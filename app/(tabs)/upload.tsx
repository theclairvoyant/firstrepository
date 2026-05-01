import React from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Image as ImageIcon, Video } from 'lucide-react-native';
import { ScreenContainer } from '@/components/ScreenContainer';
import { ThemedText } from '@/components/ThemedText';
import { PrimaryButton } from '@/components/PrimaryButton';
import { SecondaryButton } from '@/components/SecondaryButton';
import { useTheme } from '@/lib/theme/useTheme';
import { showToast } from '@/lib/toast';

export default function UploadTabScreen(): React.ReactElement {
  const { t } = useTranslation();
  const { spacing, palette } = useTheme();

  const handleGallery = (): void => {
    showToast({ variant: 'info', message: t('uploadTab.pickerSoon') });
  };

  const handleRecord = (): void => {
    showToast({ variant: 'info', message: t('uploadTab.recordSoon') });
  };

  return (
    <ScreenContainer padded edges={['left', 'right']}>
      <View style={{ flex: 1, paddingVertical: spacing.lg, gap: spacing.md }}>
        <ThemedText variant="title">{t('uploadTab.title')}</ThemedText>
        <ThemedText variant="body" tone="secondary" style={{ marginBottom: spacing.md }}>
          {t('uploadTab.body')}
        </ThemedText>

        <PrimaryButton
          label={t('uploadTab.chooseFromGallery')}
          accessibilityLabel={t('uploadTab.chooseFromGallery')}
          onPress={handleGallery}
          leftIcon={<ImageIcon size={18} color={palette.white} strokeWidth={1.75} />}
        />
        <SecondaryButton
          label={t('uploadTab.recordNow')}
          accessibilityLabel={t('uploadTab.recordNow')}
          onPress={handleRecord}
          leftIcon={<Video size={18} strokeWidth={1.75} />}
        />
      </View>
    </ScreenContainer>
  );
}
