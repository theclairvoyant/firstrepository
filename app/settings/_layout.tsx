import React from 'react';
import { Stack } from 'expo-router';

// We render in-screen headers (ChevronLeft + centered title) inside each
// settings sub-screen so theming and i18n stay under our control without
// fighting Expo Router's native header. This keeps light/dark parity simple.
export default function SettingsLayout(): React.ReactElement {
  return (
    <Stack
      initialRouteName="index"
      screenOptions={{ headerShown: false }}
    />
  );
}
