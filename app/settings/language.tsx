import React, { useCallback } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Check, ChevronLeft } from 'lucide-react-native';
import { Card } from '@/components/Card';
import { ScreenContainer } from '@/components/ScreenContainer';
import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/lib/theme/useTheme';
import {
  SUPPORTED_LANGUAGES,
  useLanguageStore,
} from '@/lib/store/languageStore';
import type { LanguageCode, LanguagePreference } from '@/lib/store/languageStore';
import { changeLanguage } from '@/lib/i18n';

interface LangRowProps {
  label: string;
  nativeLabel?: string;
  selected: boolean;
  onPress: () => void;
  isFirst?: boolean;
}

function LangRow({
  label,
  nativeLabel,
  selected,
  onPress,
  isFirst,
}: LangRowProps): React.ReactElement {
  const { colors, accent, spacing } = useTheme();
  return (
    <>
      {!isFirst ? (
        <View
          style={[
            styles.divider,
            { backgroundColor: colors.border },
          ]}
        />
      ) : null}
      <Pressable
        accessibilityRole="radio"
        accessibilityState={{ selected }}
        accessibilityLabel={label}
        onPress={onPress}
        style={({ pressed }) => [
          styles.row,
          {
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
            backgroundColor: pressed ? colors.bgInput : 'transparent',
          },
        ]}
      >
        <View style={{ flex: 1, gap: 2 }}>
          <ThemedText variant="body" tone="primary" numberOfLines={1}>
            {label}
          </ThemedText>
          {nativeLabel ? (
            <ThemedText
              variant="caption"
              tone="secondary"
              numberOfLines={1}
            >
              {nativeLabel}
            </ThemedText>
          ) : null}
        </View>
        {selected ? (
          <Check size={20} color={accent.primary} strokeWidth={2} />
        ) : null}
      </Pressable>
    </>
  );
}

function nameForCode(
  code: LanguageCode,
  t: (key: string) => string,
): { display: string; native: string } {
  return {
    display: t(`settings.language.${code}`),
    native: t(`settings.language.${code}Native`),
  };
}

export default function LanguageSettingsScreen(): React.ReactElement {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors, spacing } = useTheme();

  const preference = useLanguageStore((s) => s.preference);

  const handleBack = useCallback((): void => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/settings');
    }
  }, [router]);

  const handleSelect = useCallback(
    (next: LanguagePreference): void => {
      void changeLanguage(next);
    },
    [],
  );

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
            {t('settings.language.title')}
          </ThemedText>
        </View>
        <View style={styles.headerButton} />
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingVertical: spacing.lg,
          paddingHorizontal: spacing.md,
          gap: spacing.md,
        }}
      >
        <Card padded={false}>
          <LangRow
            label={t('settings.language.system')}
            nativeLabel={t('settings.language.systemDescription')}
            selected={preference === 'system'}
            onPress={() => handleSelect('system')}
            isFirst
          />
          {SUPPORTED_LANGUAGES.map((code) => {
            const names = nameForCode(code, t);
            return (
              <LangRow
                key={code}
                label={names.display}
                nativeLabel={names.native}
                selected={preference === code}
                onPress={() => handleSelect(code)}
              />
            );
          })}
        </Card>
      </ScrollView>
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
  },
  divider: {
    height: 1,
    marginLeft: 16,
  },
});
