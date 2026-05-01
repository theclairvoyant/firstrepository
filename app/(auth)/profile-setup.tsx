import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useForm, Controller } from 'react-hook-form';
import type { FieldErrors, Resolver } from 'react-hook-form';
import { z } from 'zod';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenContainer } from '@/components/ScreenContainer';
import { ThemedText } from '@/components/ThemedText';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Input } from '@/components/Input';
import { Avatar } from '@/components/Avatar';
import { useTheme } from '@/lib/theme/useTheme';
import { useCreateProfile, useUsernameAvailable } from '@/lib/api/queries';
import { showToast } from '@/lib/toast';

const profileSchema = z.object({
  firstName: z.string().min(1).max(40),
  lastName: z.string().min(1).max(40),
  globalUsername: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-z0-9._-]+$/),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

type ProfileField = 'firstName' | 'lastName' | 'globalUsername';

const profileResolver: Resolver<ProfileFormValues> = async (values) => {
  const parsed = profileSchema.safeParse(values);
  if (parsed.success) {
    return { values: parsed.data, errors: {} };
  }
  const fieldErrors: FieldErrors<ProfileFormValues> = {};
  for (const issue of parsed.error.issues) {
    const path = issue.path[0];
    if (
      (path === 'firstName' || path === 'lastName' || path === 'globalUsername') &&
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
  const { spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const createProfile = useCreateProfile();

  const { control, handleSubmit, watch, formState } = useForm<ProfileFormValues>({
    defaultValues: { firstName: '', lastName: '', globalUsername: '' },
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
      await createProfile.mutateAsync({
        firstName: values.firstName,
        lastName: values.lastName,
        globalUsername: values.globalUsername,
      });
      router.replace('/');
    } catch {
      showToast({ variant: 'danger', message: t('common.error') });
    }
  });

  const handleAvatarPress = (): void => {
    showToast({ variant: 'info', message: t('auth.profile.avatarSoon') });
  };

  return (
    <ScreenContainer padded>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: spacing.xl }}
          keyboardShouldPersistTaps="handled"
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

          <View
            style={{ alignItems: 'center', marginBottom: spacing.xl }}
          >
            <Pressable
              onPress={handleAvatarPress}
              accessibilityRole="button"
              accessibilityLabel={t('auth.profile.avatarChange')}
              hitSlop={8}
            >
              <Avatar size={80} name={fullName || ' '} />
            </Pressable>
            <ThemedText
              variant="caption"
              tone="muted"
              style={{ marginTop: spacing.xs }}
            >
              {t('auth.profile.avatarChange')}
            </ThemedText>
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
                  autoCapitalize="words"
                  autoComplete="given-name"
                  maxLength={40}
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
                  autoCapitalize="words"
                  autoComplete="family-name"
                  maxLength={40}
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
                  autoCapitalize="none"
                  autoComplete="username"
                  autoCorrect={false}
                  maxLength={30}
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
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
