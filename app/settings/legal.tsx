import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import WebView from 'react-native-webview';
import { FileText, X } from 'lucide-react-native';
import { EmptyState } from '@/components/EmptyState';
import { ScreenContainer } from '@/components/ScreenContainer';
import { SecondaryButton } from '@/components/SecondaryButton';
import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/lib/theme/useTheme';

export default function LegalWebViewScreen(): React.ReactElement {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors, spacing } = useTheme();
  const params = useLocalSearchParams<{ url?: string; title?: string }>();
  const url: string = typeof params.url === 'string' ? params.url : '';
  const title: string =
    typeof params.title === 'string' && params.title.length > 0
      ? params.title
      : t('settings.legal.notConfiguredTitle');

  const [loading, setLoading] = useState<boolean>(true);

  const handleClose = useCallback((): void => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/settings');
    }
  }, [router]);

  const hasUrl: boolean = url.length > 0;

  return (
    <ScreenContainer>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.close')}
          onPress={handleClose}
          hitSlop={8}
          style={({ pressed }) => [
            styles.headerButton,
            { opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <X size={22} color={colors.textPrimary} strokeWidth={1.75} />
        </Pressable>
        <View style={styles.headerTitleWrap}>
          <ThemedText
            variant="heading"
            tone="primary"
            numberOfLines={1}
            style={{ textAlign: 'center' }}
          >
            {title}
          </ThemedText>
        </View>
        <View style={styles.headerButton} />
      </View>

      {hasUrl ? (
        <View style={{ flex: 1, position: 'relative' }}>
          <WebView
            source={{ uri: url }}
            originWhitelist={['https://*']}
            onLoadStart={() => setLoading(true)}
            onLoadEnd={() => setLoading(false)}
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction={false}
            domStorageEnabled
            javaScriptEnabled
            decelerationRate="normal"
            style={{ flex: 1, backgroundColor: colors.bg }}
          />
          {loading ? (
            <View
              style={[
                styles.loadingOverlay,
                { backgroundColor: colors.bg },
              ]}
              pointerEvents="none"
              accessibilityRole="progressbar"
              accessibilityLabel={t('settings.legal.loading')}
            >
              <ActivityIndicator color={colors.textMuted} />
            </View>
          ) : null}
        </View>
      ) : (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <EmptyState
            icon={FileText}
            title={t('settings.legal.notConfiguredTitle')}
            description={t('settings.legal.notConfiguredBody')}
            cta={
              <SecondaryButton
                label={t('common.back')}
                accessibilityLabel={t('common.back')}
                onPress={handleClose}
              />
            }
          />
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    minHeight: 48,
  },
  headerButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: {
    flex: 1,
    alignItems: 'center',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
