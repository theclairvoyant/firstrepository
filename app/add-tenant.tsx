import React, { useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Mail } from 'lucide-react-native';
import { ScreenContainer } from '@/components/ScreenContainer';
import { ThemedText } from '@/components/ThemedText';
import { Card } from '@/components/Card';
import { Input } from '@/components/Input';
import { Avatar } from '@/components/Avatar';
import { PrimaryButton } from '@/components/PrimaryButton';
import { GhostButton } from '@/components/GhostButton';
import { WorkspaceTypeBadge } from '@/components/WorkspaceTypeBadge';
import { useTheme } from '@/lib/theme/useTheme';
import {
  useResolveInvite,
  useRedeemInvite,
} from '@/lib/api/queries';
import { useTenantStore } from '@/lib/store/tenantStore';
import { useDeeplinkIntentStore } from '@/lib/deeplinks/intentStore';
import { showToast } from '@/lib/toast';
import { ApiError } from '@/types/api';
import type { ResolveInviteResponse } from '@/types/api';

const CODE_LENGTH = 8;
const VALID_CHARS = /[^A-Z2-9]/g;

function sanitizeCode(input: string): string {
  return input.toUpperCase().replace(VALID_CHARS, '').slice(0, CODE_LENGTH);
}

interface InviteCardProps {
  onAdded: (workspaceId: string) => void;
}

function InviteCard({ onAdded }: InviteCardProps): React.ReactElement {
  const { t } = useTranslation();
  const { spacing, type } = useTheme();
  const [code, setCode] = useState<string>('');
  const [resolved, setResolved] = useState<ResolveInviteResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const resolveInvite = useResolveInvite();
  const redeemInvite = useRedeemInvite();

  // If a deeplink intent of kind 'invite' is pending, prefill the code.
  useEffect(() => {
    const intent = useDeeplinkIntentStore.getState().pending;
    if (intent && intent.kind === 'invite') {
      setCode(sanitizeCode(intent.code));
      useDeeplinkIntentStore.getState().consume();
    }
  }, []);

  const mapInviteError = (err: unknown): string => {
    if (err instanceof ApiError) {
      if (err.code === 'INVITE_EXPIRED') return t('addTenant.errors.inviteExpired');
      if (err.code === 'INVITE_ALREADY_USED') return t('addTenant.errors.inviteUsed');
      if (err.code === 'WORKSPACE_FULL') return t('addTenant.errors.workspaceFull');
    }
    return t('addTenant.errors.inviteGeneric');
  };

  const handleLookup = async (): Promise<void> => {
    if (code.length !== CODE_LENGTH) return;
    setError(null);
    try {
      const res = await resolveInvite.mutateAsync({ code });
      setResolved(res);
    } catch (err) {
      setError(mapInviteError(err));
    }
  };

  const handleRedeem = async (): Promise<void> => {
    if (!resolved) return;
    setError(null);
    try {
      const res = await redeemInvite.mutateAsync({ code });
      onAdded(res.membership.workspace.id);
    } catch (err) {
      setError(mapInviteError(err));
    }
  };

  const handleWrong = (): void => {
    setResolved(null);
    setCode('');
    setError(null);
  };

  return (
    <Card>
      <View style={{ gap: spacing.sm }}>
        <ThemedText variant="heading">
          {t('addTenant.inviteCard.title')}
        </ThemedText>
        <ThemedText variant="body" tone="secondary">
          {t('addTenant.inviteCard.body')}
        </ThemedText>

        {resolved ? (
          <View style={{ gap: spacing.md, marginTop: spacing.xs }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.md,
              }}
            >
              <Avatar
                size={56}
                name={resolved.workspace.name}
                uri={resolved.brand.logoUrl || undefined}
                accessibilityLabel={resolved.workspace.name}
              />
              <View style={{ flex: 1, gap: spacing.xxs }}>
                <ThemedText variant="heading" numberOfLines={1}>
                  {resolved.workspace.name}
                </ThemedText>
                <ThemedText variant="mono" tone="muted" numberOfLines={1}>
                  {`@${resolved.workspace.handle}`}
                </ThemedText>
              </View>
              <WorkspaceTypeBadge
                type={resolved.workspace.type}
                style={{ alignSelf: 'center' }}
              />
            </View>
            <PrimaryButton
              label={t('addTenant.inviteCard.redeem')}
              accessibilityLabel={t('addTenant.inviteCard.redeem')}
              onPress={() => {
                void handleRedeem();
              }}
              loading={redeemInvite.isPending}
            />
            <GhostButton
              label={t('addTenant.inviteCard.wrongCode')}
              accessibilityLabel={t('addTenant.inviteCard.wrongCode')}
              fullWidth
              onPress={handleWrong}
            />
            {error ? (
              <ThemedText variant="caption" tone="danger">
                {error}
              </ThemedText>
            ) : null}
          </View>
        ) : (
          <View style={{ gap: spacing.sm, marginTop: spacing.xs }}>
            <Input
              label={t('addTenant.inviteCard.label')}
              value={code}
              onChangeText={(v) => {
                setError(null);
                setCode(sanitizeCode(v));
              }}
              autoCapitalize="characters"
              autoCorrect={false}
              autoComplete="off"
              maxLength={CODE_LENGTH}
              placeholder={t('addTenant.inviteCard.placeholder')}
              error={error ?? undefined}
              inputStyle={{
                fontFamily: type.monoLarge.font,
                fontSize: 18,
                letterSpacing: 4,
              }}
            />
            <PrimaryButton
              label={t('addTenant.inviteCard.lookup')}
              accessibilityLabel={t('addTenant.inviteCard.lookup')}
              disabled={code.length !== CODE_LENGTH}
              loading={resolveInvite.isPending}
              onPress={() => {
                void handleLookup();
              }}
            />
          </View>
        )}
      </View>
    </Card>
  );
}

function EmailCard(): React.ReactElement {
  const router = useRouter();
  const { t } = useTranslation();
  const { spacing, accent, palette } = useTheme();

  return (
    <Card>
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
          <Mail size={20} color={accent.primary} strokeWidth={1.75} />
        </View>
        <ThemedText variant="heading">
          {t('addTenant.domainCard.title')}
        </ThemedText>
        <ThemedText variant="body" tone="secondary">
          {t('addTenant.domainCard.body')}
        </ThemedText>

        <View style={{ marginTop: spacing.xs }}>
          <PrimaryButton
            label={t('addTenant.domainCard.cta')}
            accessibilityLabel={t('addTenant.domainCard.cta')}
            onPress={() => router.push('/search-by-email')}
            leftIcon={
              <Mail size={18} color={palette.white} strokeWidth={1.75} />
            }
          />
        </View>
      </View>
    </Card>
  );
}

export default function AddTenantScreen(): React.ReactElement {
  const router = useRouter();
  const { t } = useTranslation();
  const { spacing, colors } = useTheme();
  const insets = useSafeAreaInsets();
  const setActive = useTenantStore((s) => s.setActive);

  const handleBack = (): void => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  const handleAdded = async (workspaceId: string): Promise<void> => {
    await setActive(workspaceId);
    showToast({
      variant: 'success',
      message: t('addTenant.inviteCard.added'),
    });
    if (router.canGoBack()) router.back();
    router.replace('/(tabs)/profile');
  };

  return (
    <ScreenContainer>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: spacing.xs,
          paddingTop: spacing.xs,
          paddingBottom: spacing.sm,
        }}
      >
        <Pressable
          onPress={handleBack}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          hitSlop={12}
          style={{
            width: 44,
            height: 44,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ChevronLeft size={24} color={colors.textPrimary} strokeWidth={1.75} />
        </Pressable>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: spacing.md,
            paddingBottom: insets.bottom + spacing.xl,
            gap: spacing.md,
          }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          automaticallyAdjustKeyboardInsets
        >
          <ThemedText variant="title">{t('addTenant.title')}</ThemedText>
          <ThemedText
            variant="body"
            tone="secondary"
            style={{ marginBottom: spacing.xs }}
          >
            {t('addTenant.subtitle')}
          </ThemedText>

          <InviteCard onAdded={(id) => { void handleAdded(id); }} />
          <EmailCard />
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
