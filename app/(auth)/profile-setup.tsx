import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
  findNodeHandle,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useForm, Controller } from 'react-hook-form';
import type { FieldErrors, Resolver } from 'react-hook-form';
import { z } from 'zod';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ImagePlus } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { ScreenContainer } from '@/components/ScreenContainer';
import { ThemedText } from '@/components/ThemedText';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Input } from '@/components/Input';
import { Avatar } from '@/components/Avatar';
import { useTheme } from '@/lib/theme/useTheme';
import { useCreateProfile, useUsernameAvailable } from '@/lib/api/queries';
import { showToast } from '@/lib/toast';
import { MOCK_ASSETS } from '@/lib/api/mocks/assets';

// Phone is optional: empty string OR 7-20 digits (with optional + and spaces).
// Verification is a future server feature - the field is collected today and
// stored alongside the creator profile.
const phoneSchema = z
  .string()
  .max(24)
  .refine((v) => v.length === 0 || /^[+]?[\d\s().-]{7,24}$/.test(v), {
    message: 'invalid phone',
  });

const profileSchema = z.object({
  firstName: z.string().min(1).max(40),
  lastName: z.string().min(1).max(40),
  globalUsername: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-z0-9._-]+$/),
  phone: phoneSchema,
});

type ProfileFormValues = z.infer<typeof profileSchema>;

type ProfileField = 'firstName' | 'lastName' | 'globalUsername' | 'phone';

const profileResolver: Resolver<ProfileFormValues> = async (values) => {
  const parsed = profileSchema.safeParse(values);
  if (parsed.success) {
    return { values: parsed.data, errors: {} };
  }
  const fieldErrors: FieldErrors<ProfileFormValues> = {};
  for (const issue of parsed.error.issues) {
    const path = issue.path[0];
    if (
      (path === 'firstName' ||
        path === 'lastName' ||
        path === 'globalUsername' ||
        path === 'phone') &&
      !fieldErrors[path as ProfileField]
    ) {
      fieldErrors[path as ProfileField] = {
        type: issue.code,
        message: issue.message,
      };
    }
  }
  return { values: {}, errors: fieldErrors };
};

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState<T>(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

export default function ProfileSetupScreen(): React.ReactElement {
  const router = useRouter();
  const { t } = useTranslation();
  const { spacing, colors, accent } = useTheme();
  const insets = useSafeAreaInsets();
  const createProfile = useCreateProfile();
  const scrollRef = useRef<ScrollView | null>(null);
  // Random silhouette is the default so the slot is never blank, but users
  // can tap to replace it with a gallery photo.
  const defaultAvatar = useMemo<string>(() => {
    const list = MOCK_ASSETS.presetAvatars;
    return list[Math.floor(Math.random() * list.length)];
  }, []);
  const [avatarUrl, setAvatarUrl] = useState<string>(defaultAvatar);
  const [pickingAvatar, setPickingAvatar] = useState<boolean>(false);

  const handleAvatarPress = async (): Promise<void> => {
    if (pickingAvatar) return;
    setPickingAvatar(true);
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          t('auth.profile.avatarPermissionTitle'),
          t('auth.profile.avatarPermissionBody'),
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
      if (asset?.uri) setAvatarUrl(asset.uri);
    } finally {
      setPickingAvatar(false);
    }
  };

  const { control, handleSubmit, watch, formState } = useForm<ProfileFormValues>({
    defaultValues: { firstName: '', lastName: '', globalUsername: '', phone: '' },
    mode: 'onChange',
    resolver: profileResolver,
  });

  const firstName = watch('firstName');
  const lastName = watch('lastName');
  const username = watch('globalUsername');

  const usernameValid = useMemo<boolean>(() => {
    return /^[a-z0-9._-]+$/.test(username) &&
      username.length >= 3 &&
      username.length <= 30;
  }, [username]);

  const debouncedUsername = useDebouncedValue<string>(
    usernameValid ? username : '',
    350,
  );
  const usernameQuery = useUsernameAvailable(debouncedUsername);

  const fullName = `${firstName} ${lastName}`.trim();

  const usernameStatus: 'idle' | 'checking' | 'available' | 'taken' = (() => {
    if (!usernameValid) return 'idle';
    if (debouncedUsername !== username) return 'checking';
    if (usernameQuery.isFetching || usernameQuery.isPending) return 'checking';
    if (usernameQuery.data?.available) return 'available';
    if (usernameQuery.data && !usernameQuery.data.available) return 'taken';
    return 'idle';
  })();

  const canSubmit =
    formState.isValid && usernameStatus === 'available' && !createProfile.isPending;

  const onSubmit = handleSubmit(async (values) => {
    try {
      const trimmedPhone = values.phone.trim();
      await createProfile.mutateAsync({
        firstName: values.firstName,
        lastName: values.lastName,
        globalUsername: values.globalUsername,
        phone: trimmedPhone.length > 0 ? trimmedPhone : undefined,
        avatarUrl,
      });
      router.replace('/');
    } catch {
      showToast({ variant: 'danger', message: t('common.error') });
    }
  });

  // Scroll to the focused field so it sits above the keyboard. KAV with
  // padding behavior on iOS handles the initial lift but a long form like
  // this benefits from explicit scrollTo for the lower fields (phone).
  const handleFocus = (e: { target: unknown }): void => {
    const node = findNodeHandle(e.target as never);
    if (node == null) return;
    setTimeout(() => {
      const scroll = scrollRef.current as
        | (ScrollView & {
            scrollResponderScrollNativeHandleToKeyboard?: (
              handle: number,
              additionalOffset: number,
              preventNegativeScrollOffset: boolean,
            ) => void;
          })
        | null;
      scroll?.scrollResponderScrollNativeHandleToKeyboard?.(node, 140, true);
    }, 60);
  };

  return (
    <ScreenContainer padded>
      {/* No KeyboardAvoidingView. iOS uses automaticallyAdjustKeyboardInsets
          which auto-scrolls the ScrollView to keep the focused input above the
          keyboard. Android's windowSoftInputMode=adjustResize (default) shrinks
          the app frame so the ScrollView naturally remains scrollable. KAV +
          auto-insets stack to fight each other and break the lift. */}
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingBottom: spacing.xxxl + spacing.xl,
        }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets
        showsVerticalScrollIndicator={false}
      >
          <ThemedText
            variant="title"
            style={{ marginBottom: spacing.xs, marginTop: spacing.lg }}
          >
            {t('auth.profile.title')}
          </ThemedText>
          <ThemedText
            variant="body"
            tone="secondary"
            style={{ marginBottom: spacing.xl }}
          >
            {t('auth.profile.body')}
          </ThemedText>

          <View style={{ alignItems: 'center', marginBottom: spacing.xl }}>
            <Pressable
              onPress={() => {
                void handleAvatarPress();
              }}
              accessibilityRole="button"
              accessibilityLabel={t('auth.profile.avatarPickFromGallery')}
              hitSlop={8}
              disabled={pickingAvatar || createProfile.isPending}
              style={{ position: 'relative' }}
            >
              <Avatar
                size={80}
                uri={avatarUrl}
                name={fullName || ' '}
                accessibilityLabel={fullName || 'avatar'}
                style={{ width: 96, height: 96, borderRadius: 48 }}
              />
              <View
                style={{
                  position: 'absolute',
                  right: -2,
                  bottom: -2,
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  borderWidth: 2,
                  borderColor: colors.bg,
                  backgroundColor: accent.primary,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {pickingAvatar ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <ImagePlus size={16} color="#fff" strokeWidth={2} />
                )}
              </View>
            </Pressable>
          </View>

          <View style={{ gap: spacing.md }}>
            <Controller
              control={control}
              name="firstName"
              render={({ field }) => (
                <Input
                  label={t('auth.profile.firstName')}
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  onFocus={handleFocus}
                  autoCapitalize="words"
                  autoComplete="given-name"
                  maxLength={40}
                  returnKeyType="next"
                />
              )}
            />
            <Controller
              control={control}
              name="lastName"
              render={({ field }) => (
                <Input
                  label={t('auth.profile.lastName')}
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  onFocus={handleFocus}
                  autoCapitalize="words"
                  autoComplete="family-name"
                  maxLength={40}
                  returnKeyType="next"
                />
              )}
            />
            <Controller
              control={control}
              name="globalUsername"
              render={({ field, fieldState }) => (
                <Input
                  label={t('auth.profile.username')}
                  value={field.value}
                  onChangeText={(v) => field.onChange(v.toLowerCase())}
                  onBlur={field.onBlur}
                  onFocus={handleFocus}
                  autoCapitalize="none"
                  autoComplete="username"
                  autoCorrect={false}
                  maxLength={30}
                  returnKeyType="next"
                  helperText={
                    !fieldState.error && usernameStatus === 'idle'
                      ? t('auth.profile.usernameHint')
                      : undefined
                  }
                  error={
                    fieldState.error
                      ? t('auth.profile.usernameInvalid')
                      : usernameStatus === 'taken'
                        ? t('auth.profile.usernameTaken')
                        : undefined
                  }
                />
              )}
            />
            {usernameStatus === 'checking' ? (
              <ThemedText variant="caption" tone="muted">
                {t('auth.profile.usernameChecking')}
              </ThemedText>
            ) : usernameStatus === 'available' ? (
              <ThemedText variant="caption" tone="success">
                {t('auth.profile.usernameAvailable')}
              </ThemedText>
            ) : null}
            <Controller
              control={control}
              name="phone"
              render={({ field, fieldState }) => (
                <Input
                  label={t('auth.profile.phone')}
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  onFocus={handleFocus}
                  autoCapitalize="none"
                  autoComplete="tel"
                  keyboardType="phone-pad"
                  maxLength={24}
                  placeholder={t('auth.profile.phonePlaceholder')}
                  returnKeyType="done"
                  helperText={
                    !fieldState.error
                      ? t('auth.profile.phoneOptional')
                      : undefined
                  }
                  error={fieldState.error ? t('auth.profile.phoneInvalid') : undefined}
                />
              )}
            />
          </View>
        </ScrollView>

      <View
        style={{
          paddingBottom: insets.bottom + spacing.md,
          paddingTop: spacing.md,
        }}
      >
        <PrimaryButton
          label={t('auth.profile.finish')}
          accessibilityLabel={t('auth.profile.finish')}
          disabled={!canSubmit}
          loading={createProfile.isPending}
          onPress={() => {
            void onSubmit();
          }}
        />
      </View>
    </ScreenContainer>
  );
}
