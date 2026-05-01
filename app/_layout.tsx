import { Stack } from 'expo-router';
import { I18nManager } from 'react-native';

I18nManager.allowRTL(false);
I18nManager.forceRTL(false);

export default function RootLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
