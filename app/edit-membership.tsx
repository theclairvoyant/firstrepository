import React, { useMemo, useState } from 'react';
import {
  View,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  StyleSheet,
} from 'react-native';
import type { ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { ScreenContainer } from '@/components/ScreenContainer';
import { ThemedText } from '@/components/ThemedText';
import { PrimaryButton } from '@/components/PrimaryButton';
import { SecondaryButton } from '@/components/SecondaryButton';
import { Input } from '@/components/Input';
import { Avatar } from '@/components/Avatar';
import { useTheme } from '@/lib/theme/useTheme';
import { useTenantStore } from '@/lib/store/tenantStore';
import { useMemberships, usePatchMembership } from '@/lib/api/queries';
import { showToast } from '@/lib/toast';

const USERNAME_RE = /^[a-z0-9._-]+$/;
const BIO_MAX = 160;

export default function EditMembershipScreen(): React.ReactElement {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors, spacing, radius, accent } = useTheme();
  const insets = useSafeAreaInsets();

  const activeWorkspaceId = useTenantStore((s) => s.activeWorkspaceId);
  const membershipsQuery = useMemberships();
  const patchMembership = usePatchMembership();

  const membership = useMemo(() => {
    if (!activeWorkspaceId) return null;
    const list = membershipsQuery.data ?? [];
    return list.find((m) => m.workspace.id === activeWorkspaceId) ?? null;
  }, [activeWorkspaceId, membershipsQuery.data]);

  const [username, setUsername] = useState<string>(
    membership?.workspaceUsername ?? '',
  );
  const [bio, setBio] = useState<string>(membership?.bio ?? '');
  const [usernameTouched, setUsernameTouched] = useState<boolean>(false);

  const usernameValid: boolean =
    USERNAME_RE.test(username) &&
    username.length >= 3 &&
    username.length <= 30;

  const bioValid: boolean = bio.length <= BIO_MAX;

  const dirty: boolean =
    !!membership &&
    (username !== membership.workspaceUsername || bio !== membership.bio);

  const canSubmit: boolean =
    !!membership &&
    usernameValid &&
    bioValid &&
    dirty &&
    !patchMembership.isPending;

  const onAvatarPress = (): void => {
    showToast({ variant: 'info', message: t('editMembership.avatarSoon') });
  };

  const onCancel = (): void => {
    router.back();
  };

  const onSave = async (): Promise<void> => {
    if (!membership || !canSubmit) return;
    try {
      await patchMembership.mutateAsync({
        membershipId: membership.membershipId,
        input: { workspaceUsername: username, bio },
      });
      showToast({ variant: 'success', message: t('editMembership.saved') });
      router.back();
    } catch {
      showToast({
        variant: 'danger',
        message: t('editMembership.saveError'),
      });
    }
  };

  const headerStyle: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: insets.top,
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.bgElevated,
  };

  if (!membership) {
    return (
      <ScreenContainer edges={['left', 'right']}>
        <View style={headerStyle}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('editMembership.back')}
            onPress={onCancel}
            hitSlop={8}
            style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
          >
            <ChevronLeft size={24} color={colors.textPrimary} strokeWidth={1.75} />
          </Pressable>
          <ThemedText variant="heading" style={styles.headerTitle}>
            {t('editMembership.title')}
          </ThemedText>
        </View>
        <View style={styles.center}>
          <ThemedText variant="body" tone="muted">
            {t('profileTab.noWorkspaceTitle')}
          </ThemedText>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer edges={['left', 'right']} bg="bg">
      <View style={headerStyle}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('editMembership.back')}
          onPress={onCancel}
          hitSlop={8}
          style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
        >
          <ChevronLeft size={24} color={colors.textPrimary} strokeWidth={1.75} />
        </Pressable>
        <ThemedText variant="heading" style={styles.headerTitle}>
          {t('editMembership.title')}
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
          }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ alignItems: 'center', marginBottom: spacing.xl }}>
            <Pressable
              onPress={onAvatarPress}
              accessibilityRole="button"
              accessibilityLabel={t('editMembership.avatarChange')}
              hitSlop={8}
            >
              <Avatar
                size={80}
                name={membership.workspaceUsername}
                uri={membership.workspaceAvatarUrl || undefined}
              />
            </Pressable>
            <ThemedText
              variant="caption"
              tone="muted"
              style={{ marginTop: spacing.xs }}
            >
              {t('editMembership.avatarChange')}
            </ThemedText>
          </View>

          <View style={{ gap: spacing.md }}>
            <Input
              label={t('editMembership.usernameLabel')}
              value={username}
              onChangeText={(v) => setUsername(v.toLowerCase())}
              onBlur={() => setUsernameTouched(true)}
              autoCapitalize="none"
              autoComplete="username"
              autoCorrect={false}
              maxLength={30}
              helperText={
                !usernameTouched || usernameValid
                  ? t('editMembership.usernameHint')
                  : undefined
              }
              error={
                usernameTouched && !usernameValid
                  ? t('editMembership.usernameInvalid')
                  : undefined
              }
            />

            <View>
              <ThemedText
                variant="caption"
                tone="secondary"
                style={{ marginBottom: spacing.xs }}
              >
                {t('editMembership.bioLabel')}
              </ThemedText>
              <View
                style={[
                  styles.bioField,
                  {
                    backgroundColor: colors.bgInput,
                    borderColor: bio.length > BIO_MAX ? accent.danger : colors.border,
                    borderRadius: radius.md,
                    paddingHorizontal: spacing.md,
                    paddingVertical: spacing.sm,
                  },
                ]}
              >
                <TextInput
                  value={bio}
                  onChangeText={setBio}
                  placeholder={t('editMembership.bioPlaceholder')}
                  placeholderTextColor={colors.textMuted}
                  multiline
                  maxLength={BIO_MAX}
                  textAlignVertical="top"
                  style={{
                    color: colors.textPrimary,
                    fontFamily: 'Outfit_400Regular',
                    fontSize: 15,
                    minHeight: 96,
                  }}
                />
              </View>
              <ThemedText
                variant="caption"
                tone="muted"
                style={{ marginTop: spacing.xs, textAlign: 'right' }}
              >
                {t('editMembership.bioCounter', {
                  current: bio.length,
                  max: BIO_MAX,
                })}
              </ThemedText>
            </View>
          </View>
        </ScrollView>

        <View
          style={{
            flexDirection: 'row',
            gap: spacing.md,
            paddingHorizontal: spacing.md,
            paddingBottom: insets.bottom + spacing.md,
            paddingTop: spacing.md,
            borderTopWidth: 1,
            borderTopColor: colors.border,
            backgroundColor: colors.bgElevated,
          }}
        >
          <View style={{ flex: 1 }}>
            <SecondaryButton
              label={t('editMembership.cancel')}
              accessibilityLabel={t('editMembership.cancel')}
              onPress={onCancel}
            />
          </View>
          <View style={{ flex: 1 }}>
            <PrimaryButton
              label={t('editMembership.save')}
              accessibilityLabel={t('editMembership.save')}
              disabled={!canSubmit}
              loading={patchMembership.isPending}
              onPress={() => {
                void onSave();
              }}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
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
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bioField: {
    borderWidth: 1,
  },
});
