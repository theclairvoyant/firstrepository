import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { MOCK_API } from '@/lib/api/config';

const PREF_KEY = 'enterprise-creator.notifications.enabled';

export type RegisterResult =
  | { granted: true; tokenId: string | null }
  | { granted: false; reason: 'denied' | 'unavailable' | 'scaffold' };

export async function getNotificationPreference(): Promise<boolean> {
  const raw = await AsyncStorage.getItem(PREF_KEY).catch(() => null);
  return raw === '1';
}

export async function setNotificationPreference(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(PREF_KEY, enabled ? '1' : '0').catch(() => undefined);
}

export async function registerForPushNotifications(): Promise<RegisterResult> {
  if (MOCK_API) {
    await setNotificationPreference(true);
    return { granted: false, reason: 'scaffold' };
  }
  // FULL mode wiring lives below; intentionally not imported in SCAFFOLD so
  // expo-notifications stays out of the cold-start path.
  // const Notifications = await import('expo-notifications');
  // const { status } = await Notifications.requestPermissionsAsync();
  // if (status !== 'granted') return { granted: false, reason: 'denied' };
  // const { data: token } = await Notifications.getExpoPushTokenAsync({
  //   projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID,
  // });
  // const { id } = await registerPushToken({
  //   token,
  //   platform: Platform.OS,
  //   appVersion: ...,
  // });
  // return { granted: true, tokenId: id };
  void Platform.OS;
  return { granted: false, reason: 'unavailable' };
}

export async function unregisterPushNotifications(_tokenId: string | null): Promise<void> {
  await setNotificationPreference(false);
  // FULL mode: await deletePushToken(tokenId).
}
