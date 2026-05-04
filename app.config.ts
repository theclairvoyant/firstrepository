import type { ExpoConfig } from 'expo/config';

// app.config.ts is evaluated at build time and at `expo start`. This is the
// only place where build-time env vars (EXPO_PUBLIC_*) are merged into the
// runtime manifest. Any change to EXPO_PUBLIC_API_BASE_URL requires a fresh
// build (or a fresh `expo start --clear`); restarting the Metro server alone
// will not pick it up.
//
// Profiles (see eas.json) inject the right value per environment:
//   - development: points at the dev backend
//   - preview:     points at the staging backend
//   - production:  points at the production backend
//
// SCAFFOLD mode (EXPO_PUBLIC_MOCK_API=true, the default) does not need
// EXPO_PUBLIC_API_BASE_URL set; the wrappers short-circuit to mocks before
// the axios client is invoked.

const config: ExpoConfig = {
  name: 'Enterprise Creator',
  slug: 'enterprise-creator',
  scheme: 'enterprisecreator',
  version: '0.1.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#ffffff',
  },
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.enterprisecreator.app',
    infoPlist: {
      NSCameraUsageDescription:
        'Enterprise Creator needs camera access to record videos for your workspace.',
      NSMicrophoneUsageDescription:
        'Enterprise Creator needs microphone access to record audio with your videos.',
      NSPhotoLibraryUsageDescription:
        'Enterprise Creator needs photo library access to upload videos from your gallery.',
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    package: 'com.enterprisecreator.app',
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#ffffff',
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
    permissions: [
      'android.permission.CAMERA',
      'android.permission.RECORD_AUDIO',
      'android.permission.READ_MEDIA_VIDEO',
      'android.permission.READ_MEDIA_IMAGES',
      'android.permission.ACCESS_NETWORK_STATE',
    ],
  },
  web: {
    favicon: './assets/favicon.png',
  },
  plugins: [
    'expo-router',
    'expo-localization',
    'expo-secure-store',
    [
      'expo-camera',
      {
        cameraPermission:
          'Enterprise Creator needs camera access to record videos for your workspace.',
        microphonePermission:
          'Enterprise Creator needs microphone access to record audio with your videos.',
        recordAudioAndroid: true,
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission:
          'Enterprise Creator needs photo library access to upload videos from your gallery.',
      },
    ],
    [
      'expo-video',
      {
        supportsBackgroundPlayback: false,
        supportsPictureInPicture: false,
      },
    ],
    'expo-font',
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    // Surface the resolved base URL on the manifest so the API client can
    // verify a non-sentinel value at boot. process.env is also read directly
    // at module load; this duplicate is the fallback path for environments
    // where the inline replacement does not happen (rare).
    apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? null,
    mockApi: process.env.EXPO_PUBLIC_MOCK_API ?? null,
  },
};

export default config;
