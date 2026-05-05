// Root error boundary. Catches uncaught render errors anywhere in the tree
// so a single bad component doesn't blank the entire app to white.
//
// Lives at the very top of the layout (above providers and the navigator)
// so it can render a recovery screen even if theme/i18n/router are the
// thing that broke. Recovery is "tap to reload" - state is reset by clearing
// the error and re-rendering children. If the same error fires again, the
// boundary catches it again.
//
// Once Sentry is wired (lib/monitoring/sentry.ts), the FULL block below
// should call Sentry.captureException(error, { contexts: { errorInfo } }).

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    // Last-ditch logging. Once Sentry is installed, replace with:
    //   captureException(error, { contexts: { react: { componentStack: info.componentStack } } });
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  handleReload = (): void => {
    this.setState({ error: null });
  };

  render(): React.ReactNode {
    if (this.state.error) {
      // Inlined styles + raw RN primitives on purpose - we cannot trust
      // theme / i18n / router to be functional here. Hard-coded English
      // copy is the right tradeoff for a recovery screen the user should
      // almost never see.
      return (
        <View style={styles.root}>
          <View style={styles.card}>
            <Text style={styles.title}>Something went wrong</Text>
            <Text style={styles.body}>
              The app hit an unexpected error. Tap below to try again.
              If this keeps happening, force-quit and reopen.
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Try again"
              onPress={this.handleReload}
              style={({ pressed }) => [
                styles.button,
                { opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Text style={styles.buttonLabel}>Try again</Text>
            </Pressable>
          </View>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0b0b0e',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    gap: 12,
    alignItems: 'center',
  },
  title: {
    color: '#fafafa',
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
  body: {
    color: '#a1a1aa',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  button: {
    marginTop: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#6366f1',
    minWidth: 160,
    alignItems: 'center',
  },
  buttonLabel: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
});
