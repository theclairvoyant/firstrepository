// Notifications preferences. Three switches:
//   - Master notifications on/off (asks for permission, registers push token)
//   - Post is live - the user's post got approved + published
//   - Engagement updates - milestone view counts, likes, etc.
//
// Sub-toggles are visually disabled when master is off. This screen is
// read-write only - the FE no longer maintains an in-app notification inbox.

import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Bell, ChevronLeft, Sparkles, Zap } from 'lucide-react-native';
import { Card } from '@/components/Card';
import { ScreenContainer } from '@/components/ScreenContainer';
import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/lib/theme/useTheme';
import { useSettingsStore } from '@/lib/store/settingsStore';
import {
  getNotificationPreference,
  registerForPushNotifications,
  unregisterPushNotifications,
} from '@/lib/notifications/register';

export default function NotificationsSettingsScreen(): React.ReactElement {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors, spacing, accent } = useTheme();

  const masterStored = useSettingsStore((s) => s.notificationsEnabled);
  const setMasterStored = useSettingsStore((s) => s.setNotificationsEnabled);
  const notifyPostLive = useSettingsStore((s) => s.notifyPostLive);
  const notifyEngagement = useSettingsStore((s) => s.notifyEngagement);
  const setNotifyPostLive = useSettingsStore((s) => s.setNotifyPostLive);
  const setNotifyEngagement = useSettingsStore((s) => s.setNotifyEngagement);

  // Source of truth for the master toggle is the AsyncStorage flag the
  // notifications register flow owns. Hydrate on mount and mirror writes.
  const [masterEnabled, setMasterEnabled] = useState<boolean>(masterStored);
  useEffect(() => {
    let cancelled = false;
    void getNotificationPreference().then((value) => {
      if (cancelled) return;
      setMasterEnabled(value);
      setMasterStored(value);
    });
    return () => {
      cancelled = true;
    };
  }, [setMasterStored]);

  const handleBack = useCallback((): void => {
    if (router.canGoBack()) router.back();
    else router.replace('/settings');
  }, [router]);

  const handleMasterToggle = useCallback(
    async (value: boolean): Promise<void> => {
      setMasterEnabled(value);
      setMasterStored(value);
      if (value) {
        await registerForPushNotifications();
      } else {
        await unregisterPushNotifications(null);
      }
    },
    [setMasterStored],
  );

  const subToggleDisabled: boolean = !masterEnabled;

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
          <ThemedText
            variant="heading"
            tone="primary"
            numberOfLines={1}
            style={{ textAlign: 'center' }}
          >
            {t('notifications.title')}
          </ThemedText>
        </View>
        <View style={styles.headerButton} />
      </View>

      <View style={{ padding: spacing.md, gap: spacing.md }}>
        <View style={{ gap: spacing.sm }}>
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: `${accent.primary}1f`,
            }}
          >
            <Bell size={20} color={accent.primary} strokeWidth={1.75} />
          </View>
          <ThemedText variant="title" tone="primary">
            {t('notifications.heading')}
          </ThemedText>
          <ThemedText variant="body" tone="secondary">
            {t('notifications.body')}
          </ThemedText>
        </View>

        <Card padded={false}>
          <View style={{ paddingHorizontal: spacing.md }}>
            <View
              style={[
                styles.row,
                { paddingVertical: spacing.sm },
              ]}
            >
              <View style={styles.iconBox}>
                <Bell size={20} color={colors.textPrimary} strokeWidth={1.75} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <ThemedText variant="body" tone="primary">
                  {t('notifications.master.label')}
                </ThemedText>
                <ThemedText variant="caption" tone="muted">
                  {t('notifications.master.description')}
                </ThemedText>
              </View>
              <Switch
                value={masterEnabled}
                onValueChange={(v) => {
                  void handleMasterToggle(v);
                }}
                accessibilityLabel={t('notifications.master.label')}
                trackColor={{ false: colors.bgInput, true: accent.primary }}
              />
            </View>

            <View
              style={[styles.divider, { backgroundColor: colors.border }]}
            />

            <View
              style={[
                styles.row,
                { paddingVertical: spacing.sm },
              ]}
            >
              <View style={styles.iconBox}>
                <Sparkles
                  size={20}
                  color={subToggleDisabled ? colors.textMuted : accent.success}
                  strokeWidth={1.75}
                />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <ThemedText
                  variant="body"
                  tone={subToggleDisabled ? 'muted' : 'primary'}
                >
                  {t('notifications.postLive.label')}
                </ThemedText>
                <ThemedText variant="caption" tone="muted">
                  {t('notifications.postLive.description')}
                </ThemedText>
              </View>
              <Switch
                value={notifyPostLive && masterEnabled}
                onValueChange={setNotifyPostLive}
                disabled={subToggleDisabled}
                accessibilityLabel={t('notifications.postLive.label')}
                trackColor={{ false: colors.bgInput, true: accent.primary }}
              />
            </View>

            <View
              style={[styles.divider, { backgroundColor: colors.border }]}
            />

            <View
              style={[
                styles.row,
                { paddingVertical: spacing.sm },
              ]}
            >
              <View style={styles.iconBox}>
                <Zap
                  size={20}
                  color={subToggleDisabled ? colors.textMuted : accent.primary}
                  strokeWidth={1.75}
                />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <ThemedText
                  variant="body"
                  tone={subToggleDisabled ? 'muted' : 'primary'}
                >
                  {t('notifications.engagement.label')}
                </ThemedText>
                <ThemedText variant="caption" tone="muted">
                  {t('notifications.engagement.description')}
                </ThemedText>
              </View>
              <Switch
                value={notifyEngagement && masterEnabled}
                onValueChange={setNotifyEngagement}
                disabled={subToggleDisabled}
                accessibilityLabel={t('notifications.engagement.label')}
                trackColor={{ false: colors.bgInput, true: accent.primary }}
              />
            </View>
          </View>
        </Card>

        {subToggleDisabled ? (
          <ThemedText variant="caption" tone="muted">
            {t('notifications.masterOffHint')}
          </ThemedText>
        ) : null}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  headerButton: {
    width: 44,
    height: 44,
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
    gap: 12,
    minHeight: 56,
  },
  iconBox: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    height: 1,
    marginLeft: 36,
  },
});
