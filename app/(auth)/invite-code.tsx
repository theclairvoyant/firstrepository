import React, { useEffect, useState } from 'react';
import { View, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenContainer } from '@/components/ScreenContainer';
import { ThemedText } from '@/components/ThemedText';
import { PrimaryButton } from '@/components/PrimaryButton';
import { GhostButton } from '@/components/GhostButton';
import { Input } from '@/components/Input';
import { Card } from '@/components/Card';
import { Avatar } from '@/components/Avatar';
import { WorkspaceTypeBadge } from '@/components/WorkspaceTypeBadge';
import { useTheme } from '@/lib/theme/useTheme';
import { useResolveInvite } from '@/lib/api/queries';
import { useDeeplinkIntentStore } from '@/lib/deeplinks/intentStore';
import { ApiError } from '@/types/api';
import type { ResolveInviteResponse } from '@/types/api';

const CODE_LENGTH = 8;
const VALID_CHARS = /[^A-Z2-9]/g;

function sanitize(input: string): string {
  return input.toUpperCase().replace(VALID_CHARS, '').slice(0, CODE_LENGTH);
}

export default function InviteCodeScreen(): React.ReactElement {
  const router = useRouter();
  const { t } = useTranslation();
  const { spacing, type } = useTheme();
  const insets = useSafeAreaInsets();

  const [code, setCode] = useState<string>('');
  const [resolved, setResolved] = useState<ResolveInviteResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resetCount, setResetCount] = useState<number>(0);

  const resolveInvite = useResolveInvite();

  useEffect(() => {
    const intent = useDeeplinkIntentStore.getState().consume();
    if (intent && intent.kind === 'invite') {
      setCode(sanitize(intent.code));
    }
  }, []);

  const handleSubmit = async (): Promise<void> => {
    if (code.length !== CODE_LENGTH) return;
    setError(null);
    try {
      const res = await resolveInvite.mutateAsync({ code });
      setResolved(res);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 'INVITE_EXPIRED') {
          setError(t('auth.inviteCode.errorExpired'));
        } else if (err.code === 'INVITE_ALREADY_USED') {
          setError(t('auth.inviteCode.errorUsed'));
        } else {
          setError(t('auth.inviteCode.errorGeneric'));
        }
      } else {
        setError(t('auth.inviteCode.errorGeneric'));
      }
    }
  };

  const handleWrongCode = (): void => {
    setResolved(null);
    setCode('');
    setError(null);
    setResetCount((c) => c + 1);
  };

  const handleContinue = (): void => {
    router.push('/(auth)/email');
  };

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
            {t('auth.inviteCode.title')}
          </ThemedText>
          <ThemedText
            variant="body"
            tone="secondary"
            style={{ marginBottom: spacing.xl }}
          >
            {t('auth.inviteCode.body')}
          </ThemedText>

          {resolved ? (
            <Card>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.md,
                }}
              >
                <Avatar
                  size={56}
                  name={resolved.brand.name}
                  uri={resolved.brand.logoUrl || undefined}
                  accessibilityLabel={resolved.brand.name}
                />
                <View style={{ flex: 1 }}>
                  <ThemedText variant="heading">
                    {resolved.brand.name}
                  </ThemedText>
                  <ThemedText
                    variant="body"
                    tone="secondary"
                    style={{ marginBottom: spacing.xs }}
                  >
                    {resolved.workspace.name}
                  </ThemedText>
                  <WorkspaceTypeBadge type={resolved.workspace.type} />
                </View>
              </View>
            </Card>
          ) : (
            <Input
              key={`invite-code-${resetCount}`}
              label={t('auth.inviteCode.label')}
              value={code}
              onChangeText={(v) => {
                setError(null);
                setCode(sanitize(v));
              }}
              autoCapitalize="characters"
              autoCorrect={false}
              autoComplete="off"
              maxLength={CODE_LENGTH}
              autoFocus
              placeholder={t('auth.inviteCode.placeholder')}
              error={error ?? undefined}
              inputStyle={{
                fontFamily: type.monoLarge.font,
                fontSize: 18,
                letterSpacing: 4,
              }}
            />
          )}
        </View>

        <View
          style={{
            paddingBottom: insets.bottom + spacing.md,
            paddingTop: spacing.md,
            gap: spacing.sm,
          }}
        >
          {resolved ? (
            <>
              <PrimaryButton
                label={t('common.continue')}
                accessibilityLabel={t('common.continue')}
                onPress={handleContinue}
              />
              <GhostButton
                label={t('auth.inviteCode.wrongCode')}
                accessibilityLabel={t('auth.inviteCode.wrongCode')}
                fullWidth
                onPress={handleWrongCode}
              />
            </>
          ) : (
            <PrimaryButton
              label={t('common.continue')}
              accessibilityLabel={t('common.continue')}
              disabled={code.length !== CODE_LENGTH}
              loading={resolveInvite.isPending}
              onPress={() => {
                void handleSubmit();
              }}
            />
          )}
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
