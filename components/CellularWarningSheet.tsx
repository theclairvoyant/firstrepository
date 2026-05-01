// Pre-upload prompt shown when the active connection is cellular and the
// validated file is over the cellular size threshold (configured upstream).
// The user can either queue the upload until Wi-Fi returns or proceed now.

import React from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { WifiOff } from 'lucide-react-native';
import { ModalSheet } from './ModalSheet';
import { PrimaryButton } from './PrimaryButton';
import { SecondaryButton } from './SecondaryButton';
import { ThemedText } from './ThemedText';
import { useTheme } from '@/lib/theme/useTheme';

export interface CellularWarningSheetProps {
  visible: boolean;
  fileSizeMB: number;
  onWaitForWifi: () => void;
  onUploadNow: () => void;
  onClose: () => void;
}

export function CellularWarningSheet({
  visible,
  fileSizeMB,
  onWaitForWifi,
  onUploadNow,
  onClose,
}: CellularWarningSheetProps): React.ReactElement {
  const { t } = useTranslation();
  const { colors, spacing, accent } = useTheme();

  const sizeText: string = fileSizeMB.toFixed(1);

  return (
    <ModalSheet
      visible={visible}
      onClose={onClose}
      title={t('cellularSheet.title')}
      height="50%"
    >
      <View
        style={{
          padding: spacing.lg,
          gap: spacing.md,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
          }}
        >
          <View
            style={{
              width: 44,
              height: 44,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <WifiOff size={28} color={accent.warning} strokeWidth={1.75} />
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText variant="heading" tone="primary">
              {t('cellularSheet.headline')}
            </ThemedText>
            <ThemedText
              variant="body"
              tone="secondary"
              style={{ marginTop: spacing.xxs }}
            >
              {t('cellularSheet.body', { sizeMB: sizeText })}
            </ThemedText>
          </View>
        </View>

        <View style={{ gap: spacing.sm, marginTop: spacing.xs }}>
          <PrimaryButton
            label={t('cellularSheet.waitForWifi')}
            accessibilityLabel={t('cellularSheet.waitForWifi')}
            onPress={onWaitForWifi}
          />
          <SecondaryButton
            label={t('cellularSheet.uploadNow')}
            accessibilityLabel={t('cellularSheet.uploadNow')}
            onPress={onUploadNow}
          />
        </View>

        <ThemedText
          variant="caption"
          tone="muted"
          style={{ textAlign: 'center', color: colors.textMuted }}
        >
          {t('cellularSheet.hint')}
        </ThemedText>
      </View>
    </ModalSheet>
  );
}
