import React, { useEffect, useRef, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as Linking from 'expo-linking';
import { useTheme } from '@/lib/theme/useTheme';
import { useAuthStore } from '@/lib/store/authStore';
import { useTenantStore } from '@/lib/store/tenantStore';
import { useDeeplinkIntentStore } from '@/lib/deeplinks/intentStore';
import { parseDeeplinkUrl } from '@/lib/deeplinks/parser';
import { useMe } from '@/lib/api/queries';
import { showToast } from '@/lib/toast';
import type { WorkspaceMembership } from '@/types/api';

export default function BootScreen(): React.ReactElement {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useTheme();

  const authHydrate = useAuthStore((s) => s.hydrate);
  const tenantHydrate = useTenantStore((s) => s.hydrate);
  const authIsHydrated = useAuthStore((s) => s.isHydrated);
  const tenantIsHydrated = useTenantStore((s) => s.isHydrated);
  const jwt = useAuthStore((s) => s.jwt);
  const setCreator = useAuthStore((s) => s.setCreator);
  const setActiveWorkspace = useTenantStore((s) => s.setActive);

  const [coldLinkChecked, setColdLinkChecked] = useState<boolean>(false);
  const navigatedRef = useRef<boolean>(false);

  const meQuery = useMe({
    enabled: authIsHydrated && tenantIsHydrated && !!jwt,
  });

  // Step 1: hydrate stores in parallel.
  useEffect(() => {
    void Promise.all([authHydrate(), tenantHydrate()]);
  }, [authHydrate, tenantHydrate]);

  // Step 2: capture cold-start deep link, store as pending intent.
  useEffect(() => {
    let active = true;
    Linking.getInitialURL()
      .then((url) => {
        if (!active) return;
        if (url) {
          const intent = parseDeeplinkUrl(url);
          if (intent) {
            useDeeplinkIntentStore.getState().setPending(intent);
          }
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setColdLinkChecked(true);
      });
    return () => {
      active = false;
    };
  }, []);

  // Step 3: branch routing once stores are hydrated and cold-link captured.
  useEffect(() => {
    if (navigatedRef.current) return;
    if (!authIsHydrated || !tenantIsHydrated || !coldLinkChecked) return;

    // Branch A: no jwt -> welcome.
    if (!jwt) {
      navigatedRef.current = true;
      router.replace('/(auth)/welcome');
      return;
    }

    // Wait for /me to settle.
    if (meQuery.isLoading || meQuery.isFetching) return;

    // /me failed for a non-401 reason (network, 5xx, parse). 401 is handled
    // by the axios interceptor via setUnauthorizedHandler. For any other
    // error, route the user back to welcome so they can retry instead of
    // staring at a forever-spinner. The auth store still holds the JWT so
    // the next attempt is one tap away.
    if (meQuery.isError) {
      navigatedRef.current = true;
      router.replace('/(auth)/welcome');
      showToast({
        variant: 'danger',
        message: t('boot.loadError'),
      });
      return;
    }
    if (!meQuery.data) {
      return;
    }

    const data = meQuery.data;
    setCreator(data.creator);

    const memberships: WorkspaceMembership[] = data.memberships ?? [];

    // Branch B: no creator profile -> profile-setup.
    if (!data.creator) {
      navigatedRef.current = true;
      router.replace('/(auth)/profile-setup');
      return;
    }

    // Branch C: handle pending deeplink intent (only consume if relevant).
    const pendingIntent = useDeeplinkIntentStore.getState().pending;
    if (pendingIntent) {
      if (
        pendingIntent.kind === 'workspace' ||
        pendingIntent.kind === 'workspaceUser'
      ) {
        useDeeplinkIntentStore.getState().consume();
        const targetId: string = pendingIntent.workspaceId;
        const isMember = memberships.some(
          (m) => m.workspace.id === targetId && m.status === 'active',
        );
        if (isMember) {
          void setActiveWorkspace(targetId);
          navigatedRef.current = true;
          router.replace('/(tabs)/profile');
          return;
        }
        navigatedRef.current = true;
        router.replace('/add-tenant');
        return;
      }
      if (pendingIntent.kind === 'post') {
        useDeeplinkIntentStore.getState().consume();
        navigatedRef.current = true;
        router.replace({
          pathname: '/video/[postId]',
          params: { postId: pendingIntent.postId },
        });
        return;
      }
      if (pendingIntent.kind === 'invite') {
        // Leave intent in the store; add-tenant's invite card will consume it.
        navigatedRef.current = true;
        router.replace('/add-tenant');
        return;
      }
    }

    // Branch D: resolve active workspace by priority:
    //   1. user-set defaultWorkspaceId (Settings > Default workspace)
    //   2. lastActiveWorkspaceId (most recent session)
    //   3. first active membership
    const tenantState = useTenantStore.getState();
    const defaultId: string | null = tenantState.defaultWorkspaceId;
    const lastActiveId: string | null = tenantState.lastActiveWorkspaceId;
    const activeList = memberships.filter((m) => m.status === 'active');

    if (defaultId) {
      const def = activeList.find((m) => m.workspace.id === defaultId);
      if (def) {
        void setActiveWorkspace(def.workspace.id);
        navigatedRef.current = true;
        router.replace('/(tabs)/profile');
        return;
      }
    }

    if (lastActiveId) {
      const last = activeList.find((m) => m.workspace.id === lastActiveId);
      if (last) {
        void setActiveWorkspace(last.workspace.id);
        navigatedRef.current = true;
        router.replace('/(tabs)/profile');
        return;
      }
    }

    if (activeList.length > 0) {
      void setActiveWorkspace(activeList[0].workspace.id);
      navigatedRef.current = true;
      router.replace('/(tabs)/profile');
      return;
    }

    // Branch E: no active memberships -> tabs profile (empty state).
    void setActiveWorkspace(null);
    navigatedRef.current = true;
    router.replace('/(tabs)/profile');
  }, [
    authIsHydrated,
    tenantIsHydrated,
    coldLinkChecked,
    jwt,
    meQuery.isLoading,
    meQuery.isFetching,
    meQuery.isError,
    meQuery.data,
    router,
    setCreator,
    setActiveWorkspace,
    t,
  ]);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.bg,
        alignItems: 'center',
        justifyContent: 'center',
      }}
      accessibilityRole="progressbar"
      accessibilityLabel={t('boot.loading')}
    >
      <ActivityIndicator color={colors.textMuted} />
    </View>
  );
}
