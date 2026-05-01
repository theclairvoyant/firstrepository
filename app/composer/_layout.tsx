import React from 'react';
import { Stack } from 'expo-router';

export default function ComposerLayout(): React.ReactElement {
  return (
    <Stack
      initialRouteName="edit"
      screenOptions={{ headerShown: false }}
    />
  );
}
