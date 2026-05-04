import React, { useState } from 'react';
import { View, Pressable, ScrollView, ActivityIndicator, Platform, StyleSheet, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { ImagePlus } from 'lucide-react-native';
import { Avatar } from './Avatar';
import { ThemedText } from './ThemedText';
import { useTheme } from '@/lib/theme/useTheme';

export interface AvatarPickerProps {
  // Currently displayed avatar (may be a preset URL, a local picked URI, or
  // an uploaded URL). Passing undefined renders the empty initials avatar.
  value: string | undefined;
  // Optional initials fallback name when no avatar is picked.
  name?: string;
  // Called when the user picks any new image (preset tap or gallery pick).
  // The url is either a preset URL or a local file:// URI from the picker.
  onChange: (url: string) => void;
  // Preset avatar URLs to render in the horizontal palette.
  presets: readonly string[];
  // Optional permission-denied alert override. Defaults to native Alert.
  onPermissionDenied?: () => void;
  // Disabled state (e.g. while parent is submitting).
  disabled?: boolean;
  // Helper text shown under the main avatar.
  caption?: string;
  // Accessibility label for the gallery pressable.
  pickAccessibilityLabel?: string;
  // Accessibility label for each preset.
  presetAccessibilityLabel?: string;
}

const MAIN_AVATAR_SIZE = 96;
const PRESET_AVATAR_SIZE = 56;
const RING_WIDTH = 2;

export function AvatarPicker({
  value,
  name,
  onChange,
  presets,
  onPermissionDenied,
  disabled = false,
  caption,
  pickAccessibilityLabel,
  presetAccessibilityLabel,
}: AvatarPickerProps): React.ReactElement {
  const { colors, accent, spacing } = useTheme();
  const [isPicking, setIsPicking] = useState<boolean>(false);

  const requestPermission = async (): Promise<boolean> => {
    const result = await ImagePicker.requestMediaLibraryPermissionsAsync();
    return result.granted;
  };

  const handlePickFromGallery = async (): Promise<void> => {
    if (disabled || isPicking) return;
    setIsPicking(true);
    try {
      const granted = await requestPermission();
      if (!granted) {
        if (onPermissionDenied) {
          onPermissionDenied();
        } else {
          Alert.alert(
            'Photo access needed',
            Platform.OS === 'ios'
              ? 'Open Settings and allow photo access to pick an avatar.'
              : 'Allow photos permission to pick an avatar.',
          );
        }
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
        selectionLimit: 1,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (asset?.uri) onChange(asset.uri);
    } finally {
      setIsPicking(false);
    }
  };

  const ringColorFor = (url: string): string =>
    value === url ? accent.primary : 'transparent';

  return (
    <View style={{ alignItems: 'center', gap: spacing.md }}>
      <Pressable
        onPress={() => {
          void handlePickFromGallery();
        }}
        accessibilityRole="button"
        accessibilityLabel={pickAccessibilityLabel ?? 'Pick avatar from gallery'}
        disabled={disabled || isPicking}
        style={({ pressed }) => [
          styles.mainPressable,
          {
            width: MAIN_AVATAR_SIZE + RING_WIDTH * 2,
            height: MAIN_AVATAR_SIZE + RING_WIDTH * 2,
            borderRadius: (MAIN_AVATAR_SIZE + RING_WIDTH * 2) / 2,
            opacity: pressed ? 0.85 : 1,
          },
        ]}
        hitSlop={8}
      >
        <Avatar
          size={80}
          name={name}
          uri={value}
          accessibilityLabel={name ?? 'avatar'}
          style={{
            width: MAIN_AVATAR_SIZE,
            height: MAIN_AVATAR_SIZE,
            borderRadius: MAIN_AVATAR_SIZE / 2,
          }}
        />
        <View
          style={[
            styles.cameraBadge,
            {
              backgroundColor: accent.primary,
              borderColor: colors.bg,
            },
          ]}
        >
          {isPicking ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <ImagePlus size={16} color="#fff" strokeWidth={2} />
          )}
        </View>
      </Pressable>

      {caption ? (
        <ThemedText variant="caption" tone="muted">
          {caption}
        </ThemedText>
      ) : null}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          gap: spacing.sm,
          paddingHorizontal: spacing.xs,
        }}
        style={{ alignSelf: 'stretch' }}
      >
        {presets.map((url) => {
          const selected = url === value;
          return (
            <Pressable
              key={url}
              onPress={() => onChange(url)}
              accessibilityRole="button"
              accessibilityLabel={presetAccessibilityLabel ?? 'Use preset avatar'}
              accessibilityState={{ selected }}
              disabled={disabled}
              style={({ pressed }) => [
                {
                  borderRadius: (PRESET_AVATAR_SIZE + RING_WIDTH * 2) / 2,
                  padding: RING_WIDTH,
                  borderWidth: RING_WIDTH,
                  borderColor: ringColorFor(url),
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
              hitSlop={4}
            >
              <Avatar
                size={56}
                uri={url}
                accessibilityLabel="preset avatar"
              />
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainPressable: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  cameraBadge: {
    position: 'absolute',
    right: 0,
    bottom: 4,
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
