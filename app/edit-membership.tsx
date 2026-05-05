import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Pressable,
  ScrollView,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import type { ViewStyle } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, ImagePlus, Image as ImageIcon } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { ScreenContainer } from '@/components/ScreenContainer';
import { ThemedText } from '@/components/ThemedText';
import { PrimaryButton } from '@/components/PrimaryButton';
import { SecondaryButton } from '@/components/SecondaryButton';
import { Input } from '@/components/Input';
import { Avatar } from '@/components/Avatar';
import { useTheme } from '@/lib/theme/useTheme';
import { useTenantStore } from '@/lib/store/tenantStore';
import {
  useMemberships,
  usePatchMembership,
  useUploadMembershipAvatar,
  useUsernameAvailable,
} from '@/lib/api/queries';
import { showToast } from '@/lib/toast';
import { bioContainsUrl } from '@/lib/validators/bio';

const USERNAME_RE = /^[a-z0-9._-]+$/;
const BIO_MAX = 160;
const COVER_DEBOUNCE_MS = 350;

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState<T>(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

export default function EditMembershipScreen(): React.ReactElement {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors, spacing, radius, accent } = useTheme();
  const insets = useSafeAreaInsets();

  const activeWorkspaceId = useTenantStore((s) => s.activeWorkspaceId);
  const membershipsQuery = useMemberships();
  const patchMembership = usePatchMembership();
  const uploadAvatar = useUploadMembershipAvatar();

  const membership = useMemo(() => {
    if (!activeWorkspaceId) return null;
    const list = membershipsQuery.data ?? [];
    return list.find((m) => m.workspace.id === activeWorkspaceId) ?? null;
  }, [activeWorkspaceId, membershipsQuery.data]);

  const [displayName, setDisplayName] = useState<string>(
    membership?.displayName ?? '',
  );
  const [username, setUsername] = useState<string>(
    membership?.workspaceUsername ?? '',
  );
  const [bio, setBio] = useState<string>(membership?.bio ?? '');
  const [usernameTouched, setUsernameTouched] = useState<boolean>(false);
  const [coverPickPending, setCoverPickPending] = useState<boolean>(false);

  const usernameValid: boolean =
    USERNAME_RE.test(username) &&
    username.length >= 3 &&
    username.length <= 30;

  const displayNameValid: boolean =
    displayName.length === 0 || displayName.trim().length <= 60;

  const bioHasUrl: boolean = bioContainsUrl(bio);
  const bioValid: boolean = bio.length <= BIO_MAX && !bioHasUrl;

  const dirty: boolean =
    !!membership &&
    (username !== membership.workspaceUsername ||
      bio !== membership.bio ||
      displayName !== (membership.displayName ?? ''));

  // Username availability checker. Skip while the value matches the saved
  // one (no point asking the backend if the user typed back to the original)
  // or while invalid.
  const isUsernameUnchanged: boolean =
    username === (membership?.workspaceUsername ?? '');
  const debouncedUsername = useDebouncedValue<string>(
    usernameValid && !isUsernameUnchanged ? username : '',
    COVER_DEBOUNCE_MS,
  );
  const usernameQuery = useUsernameAvailable(debouncedUsername);
  const usernameStatus: 'idle' | 'checking' | 'available' | 'taken' = (() => {
    if (!usernameValid) return 'idle';
    if (isUsernameUnchanged) return 'idle';
    if (debouncedUsername !== username) return 'checking';
    if (usernameQuery.isFetching || usernameQuery.isPending) return 'checking';
    if (usernameQuery.data?.available) return 'available';
    if (usernameQuery.data && !usernameQuery.data.available) return 'taken';
    return 'idle';
  })();

  const usernameOk: boolean =
    isUsernameUnchanged
      ? usernameValid
      : usernameValid && usernameStatus === 'available';

  const canSubmit: boolean =
    !!membership &&
    usernameOk &&
    displayNameValid &&
    bioValid &&
    dirty &&
    !patchMembership.isPending;

  const onCoverPress = async (): Promise<void> => {
    if (!membership || coverPickPending) return;
    setCoverPickPending(true);
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          t('editMembership.coverPermissionTitle'),
          t('editMembership.coverPermissionBody'),
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [16, 6],
        quality: 0.85,
        selectionLimit: 1,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (!asset?.uri) return;
      // SCAFFOLD: persist the picked file:// URI as the cover. FULL backend
      // would replace this with a CDN URL after upload (separate endpoint).
      try {
        await patchMembership.mutateAsync({
          membershipId: membership.membershipId,
          input: { bannerUrl: asset.uri },
        });
      } catch {
        showToast({
          variant: 'danger',
          message: t('editMembership.coverSaveError'),
        });
      }
    } finally {
      setCoverPickPending(false);
    }
  };

  const onAvatarPress = async (): Promise<void> => {
    if (!membership || uploadAvatar.isPending) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        t('editMembership.avatarPermissionTitle'),
        t('editMembership.avatarPermissionBody'),
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
      // Build a multipart payload that matches what the FULL backend expects
      // (file under "file"). SCAFFOLD's mock plucks the picked URI back out
      // for parity. The hook does the optimistic UI patch off `previewUri`.
      const form = new FormData();
      const filename = asset.fileName ?? `avatar-${Date.now()}.jpg`;
      const mime = asset.mimeType ?? 'image/jpeg';
      form.append('file', {
        uri: asset.uri,
        name: filename,
        type: mime,
      } as unknown as Blob);
      await uploadAvatar.mutateAsync({
        membershipId: membership.membershipId,
        form,
        previewUri: asset.uri,
      });
    } catch {
      showToast({
        variant: 'danger',
        message: t('editMembership.avatarSaveError'),
      });
    }
  };

  const onCancel = (): void => {
    router.back();
  };

  const onSave = async (): Promise<void> => {
    if (!membership || !canSubmit) return;
    try {
      await patchMembership.mutateAsync({
        membershipId: membership.membershipId,
        input: {
          workspaceUsername: username,
          bio,
          displayName: displayName.trim(),
        },
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

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: spacing.md,
          paddingTop: spacing.xl,
          paddingBottom: spacing.xl,
        }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets
      >
          {/* Cover image - tappable, opens gallery and patches membership */}
          <Pressable
            onPress={() => {
              void onCoverPress();
            }}
            accessibilityRole="button"
            accessibilityLabel={t('editMembership.coverPickFromGallery')}
            disabled={coverPickPending || patchMembership.isPending}
            style={({ pressed }) => [
              styles.coverWrap,
              {
                backgroundColor: colors.bgInput,
                borderColor: colors.border,
                borderRadius: radius.lg,
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            {membership.bannerUrl ? (
              <ExpoImage
                source={{ uri: membership.bannerUrl }}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
                accessibilityIgnoresInvertColors
              />
            ) : (
              <View style={styles.coverPlaceholder}>
                <ImageIcon
                  size={28}
                  color={colors.textMuted}
                  strokeWidth={1.75}
                />
                <ThemedText
                  variant="caption"
                  tone="muted"
                  style={{ marginTop: 6 }}
                >
                  {t('editMembership.coverEmpty')}
                </ThemedText>
              </View>
            )}
            <View
              style={[
                styles.coverBadge,
                { backgroundColor: accent.primary, borderColor: colors.bg },
              ]}
            >
              {coverPickPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <ImagePlus size={14} color="#fff" strokeWidth={2} />
              )}
            </View>
          </Pressable>

          <View style={{ alignItems: 'center', marginTop: spacing.lg, marginBottom: spacing.xl }}>
            <Pressable
              onPress={() => {
                void onAvatarPress();
              }}
              accessibilityRole="button"
              accessibilityLabel={t('editMembership.avatarPickFromGallery')}
              hitSlop={8}
              disabled={uploadAvatar.isPending}
              style={{ position: 'relative' }}
            >
              <Avatar
                size={80}
                name={membership.workspaceUsername}
                uri={membership.workspaceAvatarUrl || undefined}
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
              {t('editMembership.avatarPickFromGallery')}
            </ThemedText>
          </View>

          <View style={{ gap: spacing.md }}>
            <Input
              label={t('editMembership.displayNameLabel')}
              value={displayName}
              onChangeText={setDisplayName}
              autoCapitalize="words"
              autoComplete="name"
              maxLength={60}
              helperText={t('editMembership.displayNameHint')}
            />
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
                  : usernameStatus === 'taken'
                    ? t('editMembership.usernameTaken')
                    : undefined
              }
            />
            {usernameStatus === 'checking' ? (
              <ThemedText variant="caption" tone="muted">
                {t('editMembership.usernameChecking')}
              </ThemedText>
            ) : usernameStatus === 'available' ? (
              <ThemedText variant="caption" tone="success">
                {t('editMembership.usernameAvailable')}
              </ThemedText>
            ) : null}

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
                    borderColor:
                      bio.length > BIO_MAX || bioHasUrl
                        ? accent.danger
                        : colors.border,
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
              <View
                style={{
                  flexDirection: 'row',
                  marginTop: spacing.xs,
                  gap: spacing.sm,
                }}
              >
                {bioHasUrl ? (
                  <ThemedText
                    variant="caption"
                    tone="danger"
                    style={{ flex: 1 }}
                  >
                    {t('editMembership.bioNoUrls')}
                  </ThemedText>
                ) : (
                  <ThemedText
                    variant="caption"
                    tone="muted"
                    style={{ flex: 1 }}
                  >
                    {t('editMembership.bioNoUrlsHint')}
                  </ThemedText>
                )}
                <ThemedText
                  variant="caption"
                  tone="muted"
                  style={{ textAlign: 'right' }}
                >
                  {t('editMembership.bioCounter', {
                    current: bio.length,
                    max: BIO_MAX,
                  })}
                </ThemedText>
              </View>
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
  coverWrap: {
    width: '100%',
    aspectRatio: 16 / 6,
    overflow: 'hidden',
    borderWidth: 1,
    position: 'relative',
  },
  coverPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverBadge: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
