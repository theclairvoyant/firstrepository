import React, { useEffect, useMemo, useState } from 'react';
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
import { ChevronLeft, Search } from 'lucide-react-native';
import { ScreenContainer } from '@/components/ScreenContainer';
import { ThemedText } from '@/components/ThemedText';
import { Card } from '@/components/Card';
import { Input } from '@/components/Input';
import { Avatar } from '@/components/Avatar';
import { PrimaryButton } from '@/components/PrimaryButton';
import { SecondaryButton } from '@/components/SecondaryButton';
import { GhostButton } from '@/components/GhostButton';
import { WorkspaceTypeBadge } from '@/components/WorkspaceTypeBadge';
import { useTheme } from '@/lib/theme/useTheme';
import {
  useResolveInvite,
  useRedeemInvite,
  useByDomain,
  useRequestInvite,
} from '@/lib/api/queries';
import { useTenantStore } from '@/lib/store/tenantStore';
import { useDeeplinkIntentStore } from '@/lib/deeplinks/intentStore';
import { showToast } from '@/lib/toast';
import { ApiError } from '@/types/api';
import type {
  ResolveInviteResponse,
  DiscoveryByDomainEntry,
} from '@/types/api';

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
                name={resolved.brand.name}
                uri={resolved.brand.logoUrl || undefined}
                accessibilityLabel={resolved.brand.name}
              />
              <View style={{ flex: 1, gap: 2 }}>
                <ThemedText variant="heading" numberOfLines={1}>
                  {resolved.brand.name}
                </ThemedText>
                <ThemedText variant="body" tone="secondary" numberOfLines={1}>
                  {resolved.workspace.name}
                </ThemedText>
                <View style={{ marginTop: spacing.xxs }}>
                  <WorkspaceTypeBadge type={resolved.workspace.type} />
                </View>
              </View>
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

interface DomainEntryRowProps {
  entry: DiscoveryByDomainEntry;
}

function DomainEntryRow({ entry }: DomainEntryRowProps): React.ReactElement {
  const { t } = useTranslation();
  const { spacing } = useTheme();
  const [requested, setRequested] = useState<boolean>(entry.autoJoined);
  const requestInvite = useRequestInvite();

  const handleRequest = async (): Promise<void> => {
    try {
      await requestInvite.mutateAsync({ workspaceId: entry.workspace.id });
      setRequested(true);
      showToast({
        variant: 'success',
        message: t('addTenant.domainCard.requestSent'),
      });
    } catch (err) {
      const msg =
        err instanceof ApiError && err.code === 'EMAIL_DOMAIN_NOT_PROVISIONED'
          ? t('addTenant.errors.domainNotProvisioned')
          : t('addTenant.errors.generic');
      showToast({ variant: 'danger', message: msg });
    }
  };

  const ws = entry.workspace;
  const buttonLabel: string = entry.autoJoined
    ? t('addTenant.domainCard.joined')
    : requested
      ? t('addTenant.domainCard.requestPending')
      : t('addTenant.domainCard.request');

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        paddingVertical: spacing.sm,
      }}
    >
      <Avatar
        size={40}
        name={ws.brand.name}
        uri={ws.brand.logoUrl || undefined}
        accessibilityLabel={ws.brand.name}
      />
      <View style={{ flex: 1, gap: 2 }}>
        <ThemedText variant="heading" numberOfLines={1}>
          {ws.brand.name}
        </ThemedText>
        <ThemedText variant="body" tone="secondary" numberOfLines={1}>
          {ws.name}
        </ThemedText>
        <View style={{ marginTop: spacing.xxs }}>
          <WorkspaceTypeBadge type={ws.type} />
        </View>
      </View>
      <View>
        <SecondaryButton
          label={buttonLabel}
          accessibilityLabel={buttonLabel}
          fullWidth={false}
          disabled={requested || entry.autoJoined}
          loading={requestInvite.isPending}
          onPress={() => {
            void handleRequest();
          }}
        />
      </View>
    </View>
  );
}

function DomainCard(): React.ReactElement {
  const { t } = useTranslation();
  const { spacing, palette } = useTheme();
  const byDomain = useByDomain();
  const [searched, setSearched] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const entries: DiscoveryByDomainEntry[] = useMemo(() => {
    return byDomain.data?.workspaces ?? [];
  }, [byDomain.data]);

  const handleSearch = async (): Promise<void> => {
    setError(null);
    try {
      await byDomain.mutateAsync();
      setSearched(true);
    } catch (err) {
      const msg =
        err instanceof ApiError && err.code === 'EMAIL_DOMAIN_NOT_PROVISIONED'
          ? t('addTenant.errors.domainNotProvisioned')
          : t('addTenant.errors.generic');
      setError(msg);
    }
  };

  return (
    <Card>
      <View style={{ gap: spacing.sm }}>
        <ThemedText variant="heading">
          {t('addTenant.domainCard.title')}
        </ThemedText>
        <ThemedText variant="body" tone="secondary">
          {t('addTenant.domainCard.body')}
        </ThemedText>

        <View style={{ marginTop: spacing.xs }}>
          <PrimaryButton
            label={t('addTenant.domainCard.search')}
            accessibilityLabel={t('addTenant.domainCard.search')}
            loading={byDomain.isPending}
            onPress={() => {
              void handleSearch();
            }}
            leftIcon={
              <Search size={18} color={palette.white} strokeWidth={1.75} />
            }
          />
        </View>

        {error ? (
          <ThemedText variant="caption" tone="danger">
            {error}
          </ThemedText>
        ) : null}

        {searched && entries.length === 0 && !error ? (
          <ThemedText
            variant="body"
            tone="secondary"
            style={{ marginTop: spacing.xs }}
          >
            {t('addTenant.domainCard.noResults')}
          </ThemedText>
        ) : null}

        {entries.length > 0 ? (
          <View style={{ marginTop: spacing.sm }}>
            <ThemedText
              variant="mono"
              tone="muted"
              style={{ marginBottom: spacing.xxs }}
            >
              {t('addTenant.domainCard.resultsTitle')}
            </ThemedText>
            {entries.map((entry) => (
              <DomainEntryRow
                key={entry.workspace.id}
                entry={entry}
              />
            ))}
          </View>
        ) : null}
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
          <DomainCard />
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
