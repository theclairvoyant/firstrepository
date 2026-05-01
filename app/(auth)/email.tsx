import React from 'react';
import { View, KeyboardAvoidingView, Platform } from 'react-native';
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
import { useTheme } from '@/lib/theme/useTheme';
import { useEmailStart } from '@/lib/api/queries';
import { showToast } from '@/lib/toast';

const emailSchema = z.object({
  email: z.string().email().min(3),
});

type EmailFormValues = z.infer<typeof emailSchema>;

const zodResolver: Resolver<EmailFormValues> = async (values) => {
  const parsed = emailSchema.safeParse(values);
  if (parsed.success) {
    return { values: parsed.data, errors: {} };
  }
  const fieldErrors: FieldErrors<EmailFormValues> = {};
  for (const issue of parsed.error.issues) {
    const path = issue.path[0];
    if (path === 'email' && !fieldErrors.email) {
      fieldErrors.email = { type: issue.code, message: issue.message };
    }
  }
  return { values: {}, errors: fieldErrors };
};

export default function EmailScreen(): React.ReactElement {
  const router = useRouter();
  const { t } = useTranslation();
  const { spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const emailStart = useEmailStart();

  const { control, handleSubmit, formState } = useForm<EmailFormValues>({
    defaultValues: { email: '' },
    mode: 'onChange',
    resolver: zodResolver,
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await emailStart.mutateAsync({ email: values.email });
      router.push({
        pathname: '/(auth)/otp',
        params: { email: values.email },
      });
    } catch {
      showToast({ variant: 'danger', message: t('auth.email.error') });
    }
  });

  return (
    <ScreenContainer padded>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <View style={{ flex: 1 }}>
          <ThemedText
            variant="title"
            style={{ marginBottom: spacing.xs, marginTop: spacing.lg }}
          >
            {t('auth.email.title')}
          </ThemedText>
          <ThemedText
            variant="body"
            tone="secondary"
            style={{ marginBottom: spacing.xl }}
          >
            {t('auth.email.body')}
          </ThemedText>
          <Controller
            control={control}
            name="email"
            render={({ field, fieldState }) => (
              <Input
                label={t('auth.email.label')}
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                autoCorrect={false}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={() => {
                  void onSubmit();
                }}
                error={fieldState.error ? t('auth.email.invalid') : undefined}
              />
            )}
          />
        </View>
        <View
          style={{
            paddingBottom: insets.bottom + spacing.md,
            paddingTop: spacing.md,
          }}
        >
          <PrimaryButton
            label={t('common.continue')}
            accessibilityLabel={t('common.continue')}
            disabled={!formState.isValid}
            loading={emailStart.isPending}
            onPress={() => {
              void onSubmit();
            }}
          />
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
