import React, { useMemo, useState } from 'react';
import {
  View,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import type { ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, ImagePlus } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { ScreenContainer } from '@/components/ScreenContainer';
import { ThemedText } from '@/components/ThemedText';
import { PrimaryButton } from '@/components/PrimaryButton';
import { SecondaryButton } from '@/components/SecondaryButton';
import { Input } from '@/components/Input';
import { Avatar } from '@/components/Avatar';
import { useTheme } from '@/lib/theme/useTheme';
import { useAuthStore } from '@/lib/store/authStore';
import { usePatchMe, useUploadAvatar } from '@/lib/api/queries';
import { showToast } from '@/lib/toast';

const USERNAME_RE = /^[a-z0-9._-]+$/;

export default function EditGlobalProfileScreen(): React.ReactElement {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors, spacing, accent } = useTheme();
  const insets = useSafeAreaInsets();

  const creator = useAuthStore((s) => s.creator);
  const setCreator = useAuthStore((s) => s.setCreator);
  const patchMe = usePatchMe();
  const uploadAvatar = useUploadAvatar();

  const [firstName, setFirstName] = useState<string>(creator?.firstName ?? '');
  const [lastName, setLastName] = useState<string>(creator?.lastName ?? '');
  const [username, setUsername] = useState<string>(
    creator?.globalUsername ?? '',
  );
  const [phone, setPhone] = useState<string>(creator?.phone ?? '');
  const [usernameTouched, setUsernameTouched] = useState<boolean>(false);

  const usernameValid: boolean =
    USERNAME_RE.test(username) &&
    username.length >= 3 &&
    username.length <= 30;

  const phoneValid: boolean =
    phone.trim().length === 0 ||
    /^[+]?[\d\s().-]{7,24}$/.test(phone.trim());

  const dirty: boolean =
    !!creator &&
    (firstName !== creator.firstName ||
      lastName !== creator.lastName ||
      username !== creator.globalUsername ||
      (phone !== (creator.phone ?? '')));

  const canSubmit: boolean =
    !!creator &&
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    usernameValid &&
    phoneValid &&
    dirty &&
    !patchMe.isPending;

  const fullName: string = useMemo(() => {
    return `${firstName} ${lastName}`.trim();
  }, [firstName, lastName]);

  const onAvatarPress = async (): Promise<void> => {
    if (uploadAvatar.isPending) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        t('editGlobalProfile.avatarPermissionTitle'),
        t('editGlobalProfile.avatarPermissionBody'),
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
      selectionLimit: 1,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    if (!asset?.uri) return;
    try {
      const { avatarUrl } = await uploadAvatar.mutateAsync({});
      // SCAFFOLD mock returns a fixed URL; replace the local creator with the
      // picked URI so the UI reflects the choice immediately.
      if (creator) {
        setCreator({ ...creator, avatarUrl: asset.uri || avatarUrl });
      }
    } catch {
      showToast({
        variant: 'danger',
        message: t('editGlobalProfile.avatarSaveError'),
      });
    }
  };

  const onCancel = (): void => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/profile');
  };

  const onSave = async (): Promise<void> => {
    if (!creator || !canSubmit) return;
    try {
      const trimmedPhone = phone.trim();
      const next = await patchMe.mutateAsync({
        firstName,
        lastName,
        globalUsername: username,
        phone: trimmedPhone.length > 0 ? trimmedPhone : undefined,
      });
      setCreator(next);
      showToast({
        variant: 'success',
        message: t('editGlobalProfile.saved'),
      });
      onCancel();
    } catch {
      showToast({
        variant: 'danger',
        message: t('editGlobalProfile.saveError'),
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

  if (!creator) {
    return (
      <ScreenContainer edges={['left', 'right']}>
        <View style={headerStyle}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
            onPress={onCancel}
            hitSlop={8}
            style={({ pressed }) => [
              styles.backBtn,
              pressed && styles.pressed,
            ]}
          >
            <ChevronLeft
              size={24}
              color={colors.textPrimary}
              strokeWidth={1.75}
            />
          </Pressable>
          <ThemedText variant="heading" style={styles.headerTitle}>
            {t('editGlobalProfile.title')}
          </ThemedText>
        </View>
        <View style={styles.center}>
          <ThemedText variant="body" tone="muted">
            {t('editGlobalProfile.noProfile')}
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
          accessibilityLabel={t('common.back')}
          onPress={onCancel}
          hitSlop={8}
          style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
        >
          <ChevronLeft
            size={24}
            color={colors.textPrimary}
            strokeWidth={1.75}
          />
        </Pressable>
        <ThemedText variant="heading" style={styles.headerTitle}>
          {t('editGlobalProfile.title')}
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
              onPress={() => {
                void onAvatarPress();
              }}
              accessibilityRole="button"
              accessibilityLabel={t('editGlobalProfile.avatarPickFromGallery')}
              hitSlop={8}
              disabled={uploadAvatar.isPending}
              style={{ position: 'relative' }}
            >
              <Avatar
                size={80}
                name={fullName || ' '}
                uri={creator.avatarUrl || undefined}
              />
              <View
                style={{
                  position: 'absolute',
                  right: -2,
                  bottom: -2,
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  borderWidth: 2,
                  borderColor: colors.bg,
                  backgroundColor: accent.primary,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {uploadAvatar.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <ImagePlus size={14} color="#fff" strokeWidth={2} />
                )}
              </View>
            </Pressable>
            <ThemedText
              variant="caption"
              tone="muted"
              style={{ marginTop: spacing.sm }}
            >
              {t('editGlobalProfile.avatarPickFromGallery')}
            </ThemedText>
          </View>

          <View style={{ gap: spacing.md }}>
            <Input
              label={t('editGlobalProfile.firstName')}
              value={firstName}
              onChangeText={setFirstName}
              autoCapitalize="words"
              autoComplete="given-name"
              maxLength={40}
            />
            <Input
              label={t('editGlobalProfile.lastName')}
              value={lastName}
              onChangeText={setLastName}
              autoCapitalize="words"
              autoComplete="family-name"
              maxLength={40}
            />
            <Input
              label={t('editGlobalProfile.username')}
              value={username}
              onChangeText={(v) => setUsername(v.toLowerCase())}
              onBlur={() => setUsernameTouched(true)}
              autoCapitalize="none"
              autoComplete="username"
              autoCorrect={false}
              maxLength={30}
              helperText={
                !usernameTouched || usernameValid
                  ? t('editGlobalProfile.usernameHint')
                  : undefined
              }
              error={
                usernameTouched && !usernameValid
                  ? t('editGlobalProfile.usernameInvalid')
                  : undefined
              }
            />
            <Input
              label={t('editGlobalProfile.email')}
              value={creator.email}
              editable={false}
              helperText={t('editGlobalProfile.emailLocked')}
            />
            <Input
              label={t('editGlobalProfile.phone')}
              value={phone}
              onChangeText={setPhone}
              autoCapitalize="none"
              autoComplete="tel"
              keyboardType="phone-pad"
              maxLength={24}
              placeholder={t('editGlobalProfile.phonePlaceholder')}
              helperText={t('editGlobalProfile.phoneOptional')}
              error={
                !phoneValid ? t('editGlobalProfile.phoneInvalid') : undefined
              }
            />
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
              label={t('editGlobalProfile.cancel')}
              accessibilityLabel={t('editGlobalProfile.cancel')}
              onPress={onCancel}
            />
          </View>
          <View style={{ flex: 1 }}>
            <PrimaryButton
              label={t('editGlobalProfile.save')}
              accessibilityLabel={t('editGlobalProfile.save')}
              disabled={!canSubmit}
              loading={patchMe.isPending}
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
});
