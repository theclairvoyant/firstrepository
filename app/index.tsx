import React from 'react';
import { View } from 'react-native';
import { Link } from 'expo-router';
import { ScreenContainer } from '@/components/ScreenContainer';
import { ThemedText } from '@/components/ThemedText';
import { GhostButton } from '@/components/GhostButton';
import { useTheme } from '@/lib/theme/useTheme';

export default function Index(): React.ReactElement {
  const { spacing } = useTheme();
  return (
    <ScreenContainer padded>
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing.md,
        }}
      >
        <ThemedText variant="display">Enterprise Creator</ThemedText>
        <ThemedText variant="body" tone="secondary">
          Scaffold build. Pick a flow below.
        </ThemedText>
        {__DEV__ ? (
          <Link href="/_design-preview" asChild>
            <GhostButton
              label="Open design preview"
              accessibilityLabel="open design preview"
            />
          </Link>
        ) : null}
      </View>
    </ScreenContainer>
  );
}
