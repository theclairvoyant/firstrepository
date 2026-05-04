import React, { useCallback } from 'react';
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, LifeBuoy, Mail } from 'lucide-react-native';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenContainer } from '@/components/ScreenContainer';
import { ThemedText } from '@/components/ThemedText';
import { showToast } from '@/lib/toast';
import { useTheme } from '@/lib/theme/useTheme';

const SUPPORT_EMAIL: string =
  process.env.EXPO_PUBLIC_SUPPORT_EMAIL ?? 'support@blinklink.com';

export default function SupportScreen(): React.ReactElement {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors, spacing, accent, radius } = useTheme();
  const insets = useSafeAreaInsets();

  const handleBack = useCallback((): void => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/settings');
    }
  }, [router]);

  const handleOpenMail = useCallback((): void => {
    const subject = encodeURIComponent(t('settings.support.mailSubject'));
    void Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${subject}`).catch(
      () => {
        showToast({
          variant: 'danger',
          message: t('settings.support.openError', {
            defaultValue: "Couldn't open your email app.",
          }),
        });
      },
    );
  }, [t]);

  return (
    <ScreenContainer>
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
          accessibilityLabel={t('common.back')}
          onPress={handleBack}
          hitSlop={8}
          style={({ pressed }) => [
            styles.headerButton,
            { opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <ChevronLeft size={24} color={colors.textPrimary} strokeWidth={1.75} />
        </Pressable>
        <View style={styles.headerTitleWrap}>
          <ThemedText variant="heading" tone="primary">
            {t('settings.support.screenTitle', { defaultValue: 'Support' })}
          </ThemedText>
        </View>
        <View style={styles.headerButton} />
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.xl,
          paddingBottom: spacing.xl,
          gap: spacing.lg,
        }}
      >
        <View style={{ alignItems: 'center', gap: spacing.md }}>
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 36,
              backgroundColor: `${accent.primary}1f`,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <LifeBuoy
              size={32}
              color={accent.primary}
              strokeWidth={1.75}
            />
          </View>
          <ThemedText
            variant="title"
            tone="primary"
            style={{ textAlign: 'center' }}
          >
            {t('settings.support.heading', {
              defaultValue: 'Need a hand?',
            })}
          </ThemedText>
          <ThemedText
            variant="body"
            tone="secondary"
            style={{ textAlign: 'center' }}
          >
            {t('settings.support.body', {
              defaultValue:
                "Email our team and we'll get back to you within one business day. Include screenshots and the steps you took so we can help faster.",
            })}
          </ThemedText>
        </View>

        <View
          style={[
            styles.contactCard,
            {
              borderColor: colors.border,
              backgroundColor: colors.bgCard,
              borderRadius: radius.lg,
              padding: spacing.md,
              gap: spacing.xs,
            },
          ]}
        >
          <ThemedText variant="caption" tone="muted">
            {t('settings.support.emailLabel', { defaultValue: 'Email us at' })}
          </ThemedText>
          <ThemedText
            variant="bodyMed"
            tone="primary"
            selectable
            style={{ fontFamily: 'JetBrainsMono_400Regular' }}
          >
            {SUPPORT_EMAIL}
          </ThemedText>
        </View>
      </ScrollView>

      <View
        style={{
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.md,
          paddingBottom: insets.bottom + spacing.md,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          backgroundColor: colors.bgElevated,
        }}
      >
        <PrimaryButton
          label={t('settings.support.openMail', {
            defaultValue: 'Email us',
          })}
          accessibilityLabel={t('settings.support.openMail', {
            defaultValue: 'Email us',
          })}
          leftIcon={<Mail size={18} color="#fff" strokeWidth={2} />}
          onPress={handleOpenMail}
        />
      </View>
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
  contactCard: {
    borderWidth: 1,
  },
});
