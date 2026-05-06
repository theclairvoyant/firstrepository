import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// Persisted user-facing toggles for the Settings screen.
//
// `notificationsEnabled` here is a UI mirror of the value persisted by
// lib/notifications/register.ts (AsyncStorage key
// 'enterprise-creator.notifications.enabled'). The notifications row reads
// `getNotificationPreference()` on mount to seed the toggle correctly across
// app launches, and on toggle it writes through both
// `setNotificationsEnabled` here and the existing
// `registerForPushNotifications` / `unregisterPushNotifications` helpers so
// the SCAFFOLD register flow stays the source of truth.

interface SettingsState {
  warnBeforeCellular: boolean;
  notificationsEnabled: boolean;
  // Per-type push notification toggles. Master switch is
  // notificationsEnabled; these are sub-categories the user controls
  // separately so they can opt in to one and not the other. Backend
  // should respect both: master OFF means send nothing, master ON +
  // a specific type OFF means skip that type.
  notifyPostLive: boolean;
  notifyEngagement: boolean;
  setWarnBeforeCellular: (value: boolean) => void;
  setNotificationsEnabled: (value: boolean) => void;
  setNotifyPostLive: (value: boolean) => void;
  setNotifyEngagement: (value: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      warnBeforeCellular: true,
      notificationsEnabled: false,
      notifyPostLive: true,
      notifyEngagement: true,
      setWarnBeforeCellular: (value: boolean) =>
        set({ warnBeforeCellular: value }),
      setNotificationsEnabled: (value: boolean) =>
        set({ notificationsEnabled: value }),
      setNotifyPostLive: (value: boolean) => set({ notifyPostLive: value }),
      setNotifyEngagement: (value: boolean) =>
        set({ notifyEngagement: value }),
    }),
    {
      name: 'enterprise-creator.settings',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        warnBeforeCellular: state.warnBeforeCellular,
        notificationsEnabled: state.notificationsEnabled,
        notifyPostLive: state.notifyPostLive,
        notifyEngagement: state.notifyEngagement,
      }),
      // Bump on any breaking change to the settings shape. v1 didn't have
      // the per-type notification toggles; v2 added them. v1 -> v2: keep
      // existing prefs and default new toggles to true (matches FE default).
      version: 2,
      migrate: (persistedState, version) => {
        if (version === 2) {
          return persistedState as Pick<
            SettingsState,
            | 'warnBeforeCellular'
            | 'notificationsEnabled'
            | 'notifyPostLive'
            | 'notifyEngagement'
          >;
        }
        if (version === 1) {
          const v1 = persistedState as Pick<
            SettingsState,
            'warnBeforeCellular' | 'notificationsEnabled'
          >;
          return {
            warnBeforeCellular: v1.warnBeforeCellular,
            notificationsEnabled: v1.notificationsEnabled,
            notifyPostLive: true,
            notifyEngagement: true,
          };
        }
        return {
          warnBeforeCellular: true,
          notificationsEnabled: false,
          notifyPostLive: true,
          notifyEngagement: true,
        };
      },
    },
  ),
);
