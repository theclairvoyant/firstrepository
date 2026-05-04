import React from 'react';
import { Stack } from 'expo-router';

export default function ComposerLayout(): React.ReactElement {
  return (
    <Stack
      initialRouteName="edit"
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="edit" />
      <Stack.Screen name="preview" />
      <Stack.Screen name="record" />
      <Stack.Screen name="tags" options={{ presentation: 'card' }} />
      <Stack.Screen name="cta" options={{ presentation: 'card' }} />
    </Stack>
  );
}
