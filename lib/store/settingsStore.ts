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
  setWarnBeforeCellular: (value: boolean) => void;
  setNotificationsEnabled: (value: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      warnBeforeCellular: true,
      notificationsEnabled: false,
      setWarnBeforeCellular: (value: boolean) =>
        set({ warnBeforeCellular: value }),
      setNotificationsEnabled: (value: boolean) =>
        set({ notificationsEnabled: value }),
    }),
    {
      name: 'enterprise-creator.settings',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        warnBeforeCellular: state.warnBeforeCellular,
        notificationsEnabled: state.notificationsEnabled,
      }),
      // Bump on any breaking change to the settings shape.
      version: 1,
      migrate: (persistedState, version) => {
        if (version === 1) {
          return persistedState as Pick<
            SettingsState,
            'warnBeforeCellular' | 'notificationsEnabled'
          >;
        }
        return { warnBeforeCellular: true, notificationsEnabled: false };
      },
    },
  ),
);
