import React, { useCallback, useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import Constants from 'expo-constants';
import {
  Bell,
  ChevronLeft,
  ChevronRight,
  FileText,
  Info,
  Languages,
  LifeBuoy,
  LogOut,
  Palette,
  ShieldCheck,
  Trash2,
  Wifi,
} from 'lucide-react-native';
import { Card } from '@/components/Card';
import { ScreenContainer } from '@/components/ScreenContainer';
import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/lib/theme/useTheme';
import { useThemeStore } from '@/lib/theme/themeStore';
import type { ThemeMode } from '@/lib/theme/themeStore';
import { useLanguageStore } from '@/lib/store/languageStore';
import type { LanguageCode } from '@/lib/store/languageStore';
import { useSettingsStore } from '@/lib/store/settingsStore';
import { useAuthStore } from '@/lib/store/authStore';
import { useTenantStore } from '@/lib/store/tenantStore';
import {
  getNotificationPreference,
  registerForPushNotifications,
  unregisterPushNotifications,
} from '@/lib/notifications/register';
import { useSignOut } from '@/lib/api/queries';

type ThemeSegmentKey = 'system' | 'light' | 'dark';

interface RowProps {
  icon: React.ReactNode;
  label: string;
  right?: React.ReactNode;
  onPress?: () => void;
  danger?: boolean;
  accessibilityLabel?: string;
}

function Row({
  icon,
  label,
  right,
  onPress,
  danger,
  accessibilityLabel,
}: RowProps): React.ReactElement {
  const { spacing, colors } = useTheme();
  const content = (
    <View style={[styles.rowInner, { paddingVertical: spacing.sm }]}>
      <View style={styles.rowIcon}>{icon}</View>
      <ThemedText
        variant="body"
        tone={danger ? 'danger' : 'primary'}
        style={{ flex: 1 }}
        numberOfLines={1}
      >
        {label}
      </ThemedText>
      {right ? <View style={styles.rowRight}>{right}</View> : null}
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        onPress={onPress}
        style={({ pressed }) => [
          styles.rowPressable,
          {
            paddingHorizontal: spacing.md,
            backgroundColor: pressed ? colors.bgInput : 'transparent',
          },
        ]}
      >
        {content}
      </Pressable>
    );
  }

  return (
    <View
      style={[
        styles.rowPressable,
        { paddingHorizontal: spacing.md },
      ]}
    >
      {content}
    </View>
  );
}

interface ThemeSegmentProps {
  active: ThemeSegmentKey;
  onChange: (next: ThemeSegmentKey) => void;
}

function ThemeSegment({
  active,
  onChange,
}: ThemeSegmentProps): React.ReactElement {
  const { t } = useTranslation();
  const { colors, accent, radius, spacing } = useTheme();
  const segments: { key: ThemeSegmentKey; label: string }[] = [
    { key: 'system', label: t('settings.theme.system') },
    { key: 'light', label: t('settings.theme.light') },
    { key: 'dark', label: t('settings.theme.dark') },
  ];

  return (
    <View
      style={[
        styles.segmentContainer,
        {
          backgroundColor: colors.bgInput,
          borderRadius: radius.md,
          padding: 2,
        },
      ]}
    >
      {segments.map((seg) => {
        const isActive = seg.key === active;
        return (
          <Pressable
            key={seg.key}
            accessibilityRole="button"
            accessibilityLabel={seg.label}
            accessibilityState={{ selected: isActive }}
            onPress={() => onChange(seg.key)}
            style={({ pressed }) => [
              styles.segment,
              {
                paddingHorizontal: spacing.sm,
                borderRadius: radius.sm,
                backgroundColor: isActive ? colors.bgCard : 'transparent',
                borderWidth: isActive ? 1 : 0,
                borderColor: isActive ? accent.primary : 'transparent',
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <ThemedText
              variant="mono"
              tone={isActive ? 'accent' : 'secondary'}
            >
              {seg.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

function languageDisplayName(
  code: LanguageCode,
  t: (key: string) => string,
): string {
  return t(`settings.language.${code}`);
}

export default function SettingsIndexScreen(): React.ReactElement {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors, spacing, accent } = useTheme();
  const queryClient = useQueryClient();

  const themeMode = useThemeStore((s) => s.mode);
  const setThemeMode = useThemeStore((s) => s.setMode);

  const languagePref = useLanguageStore((s) => s.preference);
  const resolvedLanguage = useLanguageStore((s) => s.resolved);

  const warnBeforeCellular = useSettingsStore((s) => s.warnBeforeCellular);
  const setWarnBeforeCellular = useSettingsStore(
    (s) => s.setWarnBeforeCellular,
  );
  const notificationsEnabledStored = useSettingsStore(
    (s) => s.notificationsEnabled,
  );
  const setNotificationsEnabled = useSettingsStore(
    (s) => s.setNotificationsEnabled,
  );

  const [notificationsOn, setNotificationsOn] = useState<boolean>(
    notificationsEnabledStored,
  );

  const authSignOut = useAuthStore((s) => s.signOut);
  const tenantClear = useTenantStore((s) => s.clear);
  const signOutMutation = useSignOut();

  // Seed the notifications toggle from the existing AsyncStorage flag so the
  // setting persists across app launches without diverging from the
  // notifications register flow's source of truth.
  useEffect(() => {
    let cancelled = false;
    void getNotificationPreference().then((value) => {
      if (cancelled) return;
      setNotificationsOn(value);
      setNotificationsEnabled(value);
    });
    return () => {
      cancelled = true;
    };
  }, [setNotificationsEnabled]);

  const handleBack = useCallback((): void => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/profile');
    }
  }, [router]);

  const handleNotificationsToggle = useCallback(
    async (value: boolean): Promise<void> => {
      setNotificationsOn(value);
      setNotificationsEnabled(value);
      if (value) {
        await registerForPushNotifications();
      } else {
        await unregisterPushNotifications(null);
      }
    },
    [setNotificationsEnabled],
  );

  const handleCellularToggle = useCallback(
    (value: boolean): void => {
      setWarnBeforeCellular(value);
    },
    [setWarnBeforeCellular],
  );

  const handlePrivacyPress = useCallback((): void => {
    router.push({
      pathname: '/settings/legal',
      params: {
        url:
          process.env.EXPO_PUBLIC_PRIVACY_URL ??
          'https://www.blinklink.com/privacy-policy',
        title: t('settings.privacyTitle'),
      },
    });
  }, [router, t]);

  const handleTermsPress = useCallback((): void => {
    router.push({
      pathname: '/settings/legal',
      params: {
        url:
          process.env.EXPO_PUBLIC_TERMS_URL ??
          'https://www.blinklink.com/terms-and-conditions',
        title: t('settings.termsTitle'),
      },
    });
  }, [router, t]);

  const handleSupportPress = useCallback((): void => {
    router.push('/settings/support');
  }, [router]);

  const handleLanguagePress = useCallback((): void => {
    router.push('/settings/language');
  }, [router]);

  const handleDeleteAccountPress = useCallback((): void => {
    router.push('/settings/delete-account');
  }, [router]);

  const handleSignOutPress = useCallback(async (): Promise<void> => {
    try {
      await signOutMutation.mutateAsync();
    } catch {
      // ignore network failure on sign-out; we still clear locally
    }
    await authSignOut();
    await tenantClear();
    queryClient.clear();
    router.replace('/(auth)/welcome');
  }, [signOutMutation, authSignOut, tenantClear, queryClient, router]);

  const appVersion: string =
    (Constants.expoConfig && typeof Constants.expoConfig.version === 'string'
      ? Constants.expoConfig.version
      : '0.0.0') ?? '0.0.0';
  const buildNumber: string = ((): string => {
    const cfg = Constants.expoConfig;
    const ios = cfg?.ios?.buildNumber;
    const android = cfg?.android?.versionCode;
    if (typeof ios === 'string' && ios.length > 0) return ios;
    if (typeof android === 'number') return String(android);
    return '0';
  })();

  const activeLanguageLabel: string =
    languagePref === 'system'
      ? `${t('settings.language.system')} (${languageDisplayName(resolvedLanguage, t)})`
      : languageDisplayName(resolvedLanguage, t);

  const themeSegmentValue: ThemeSegmentKey =
    themeMode === 'system'
      ? 'system'
      : themeMode === 'dark'
        ? 'dark'
        : 'light';

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
            {t('settings.title')}
          </ThemedText>
        </View>
        <View style={styles.headerButton} />
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingVertical: spacing.lg,
          gap: spacing.lg,
        }}
      >
        {/* Display section */}
        <View style={{ gap: spacing.xs }}>
          <ThemedText
            variant="mono"
            tone="muted"
            style={{
              paddingHorizontal: spacing.lg,
              marginBottom: spacing.xs,
            }}
          >
            {t('settings.sections.display')}
          </ThemedText>
          <Card padded={false}>
            <Row
              icon={
                <Palette
                  size={20}
                  color={colors.textPrimary}
                  strokeWidth={1.75}
                />
              }
              label={t('settings.theme.label')}
              right={
                <ThemeSegment
                  active={themeSegmentValue}
                  onChange={(next) => setThemeMode(next as ThemeMode)}
                />
              }
            />
            <View
              style={[styles.divider, { backgroundColor: colors.border }]}
            />
            <Row
              icon={
                <Languages
                  size={20}
                  color={colors.textPrimary}
                  strokeWidth={1.75}
                />
              }
              label={t('settings.language.label')}
              accessibilityLabel={t('settings.language.label')}
              onPress={handleLanguagePress}
              right={
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <ThemedText
                    variant="caption"
                    tone="secondary"
                    numberOfLines={1}
                  >
                    {activeLanguageLabel}
                  </ThemedText>
                  <ChevronRight
                    size={18}
                    color={colors.textMuted}
                    strokeWidth={1.75}
                  />
                </View>
              }
            />
          </Card>
        </View>

        {/* Notifications and uploads */}
        <View style={{ gap: spacing.xs }}>
          <ThemedText
            variant="mono"
            tone="muted"
            style={{
              paddingHorizontal: spacing.lg,
              marginBottom: spacing.xs,
            }}
          >
            {t('settings.sections.notifications')}
          </ThemedText>
          <Card padded={false}>
            <Row
              icon={
                <Bell
                  size={20}
                  color={colors.textPrimary}
                  strokeWidth={1.75}
                />
              }
              label={t('settings.notifications.label')}
              right={
                <Switch
                  value={notificationsOn}
                  onValueChange={(v) => {
                    void handleNotificationsToggle(v);
                  }}
                  accessibilityLabel={t('settings.notifications.label')}
                  trackColor={{
                    false: colors.bgInput,
                    true: accent.primary,
                  }}
                />
              }
            />
            <View
              style={[styles.divider, { backgroundColor: colors.border }]}
            />
            <Row
              icon={
                <Wifi
                  size={20}
                  color={colors.textPrimary}
                  strokeWidth={1.75}
                />
              }
              label={t('settings.cellular.label')}
              right={
                <Switch
                  value={warnBeforeCellular}
                  onValueChange={handleCellularToggle}
                  accessibilityLabel={t('settings.cellular.label')}
                  trackColor={{
                    false: colors.bgInput,
                    true: accent.primary,
                  }}
                />
              }
            />
          </Card>
        </View>

        {/* Legal and support */}
        <View style={{ gap: spacing.xs }}>
          <ThemedText
            variant="mono"
            tone="muted"
            style={{
              paddingHorizontal: spacing.lg,
              marginBottom: spacing.xs,
            }}
          >
            {t('settings.sections.legal')}
          </ThemedText>
          <Card padded={false}>
            <Row
              icon={
                <ShieldCheck
                  size={20}
                  color={colors.textPrimary}
                  strokeWidth={1.75}
                />
              }
              label={t('settings.privacyLabel')}
              onPress={handlePrivacyPress}
              right={
                <ChevronRight
                  size={18}
                  color={colors.textMuted}
                  strokeWidth={1.75}
                />
              }
            />
            <View
              style={[styles.divider, { backgroundColor: colors.border }]}
            />
            <Row
              icon={
                <FileText
                  size={20}
                  color={colors.textPrimary}
                  strokeWidth={1.75}
                />
              }
              label={t('settings.termsLabel')}
              onPress={handleTermsPress}
              right={
                <ChevronRight
                  size={18}
                  color={colors.textMuted}
                  strokeWidth={1.75}
                />
              }
            />
            <View
              style={[styles.divider, { backgroundColor: colors.border }]}
            />
            <Row
              icon={
                <LifeBuoy
                  size={20}
                  color={colors.textPrimary}
                  strokeWidth={1.75}
                />
              }
              label={t('settings.support.label')}
              onPress={handleSupportPress}
              right={
                <ChevronRight
                  size={18}
                  color={colors.textMuted}
                  strokeWidth={1.75}
                />
              }
            />
            <View
              style={[styles.divider, { backgroundColor: colors.border }]}
            />
            <Row
              icon={
                <Info
                  size={20}
                  color={colors.textPrimary}
                  strokeWidth={1.75}
                />
              }
              label={t('settings.about.label')}
              right={
                <View style={{ alignItems: 'flex-end' }}>
                  <ThemedText variant="caption" tone="secondary">
                    {t('settings.about.version', { version: appVersion })}
                  </ThemedText>
                  <ThemedText variant="mono" tone="muted">
                    {t('settings.about.build', { build: buildNumber })}
                  </ThemedText>
                </View>
              }
            />
          </Card>
        </View>

        {/* Account */}
        <View style={{ gap: spacing.xs }}>
          <ThemedText
            variant="mono"
            tone="muted"
            style={{
              paddingHorizontal: spacing.lg,
              marginBottom: spacing.xs,
            }}
          >
            {t('settings.sections.account')}
          </ThemedText>
          <Card padded={false}>
            <Row
              icon={
                <Trash2
                  size={20}
                  color={accent.danger}
                  strokeWidth={1.75}
                />
              }
              label={t('settings.deleteAccount.label')}
              danger
              onPress={handleDeleteAccountPress}
              right={
                <ChevronRight
                  size={18}
                  color={colors.textMuted}
                  strokeWidth={1.75}
                />
              }
            />
            <View
              style={[styles.divider, { backgroundColor: colors.border }]}
            />
            <Row
              icon={
                <LogOut
                  size={20}
                  color={accent.danger}
                  strokeWidth={1.75}
                />
              }
              label={t('settings.signOut.label')}
              danger
              onPress={() => {
                void handleSignOutPress();
              }}
            />
          </Card>
        </View>
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
  rowPressable: {
    minHeight: 56,
  },
  rowInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 44,
  },
  rowIcon: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowRight: {
    marginLeft: 8,
    alignItems: 'flex-end',
  },
  divider: {
    height: 1,
    marginLeft: 56,
  },
  segmentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  segment: {
    minHeight: 32,
    paddingVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
