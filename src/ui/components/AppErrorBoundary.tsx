import React, {Component, type ErrorInfo, type ReactNode} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';

import {palette} from '../../core/constants/theme';
import {log} from '../../core/logger/Logger';

interface AppErrorBoundaryProps {
  readonly children: ReactNode;
}

interface AppErrorBoundaryState {
  readonly error: Error | null;
}

/**
 * Catches render errors in subtree so a single bad overlay cannot white-screen
 * the entire GCS shell.
 */
export class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  override state: AppErrorBoundaryState = {error: null};

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return {error};
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    log.app.error('react.boundary', {
      message: error.message,
      stack: error.stack,
      componentStack: info.componentStack,
    });
  }

  private readonly handleRetry = (): void => {
    this.setState({error: null});
  };

  override render(): ReactNode {
    if (this.state.error) {
      return (
        <View style={styles.container} accessibilityRole="alert">
          <Text style={styles.title}>Display error</Text>
          <Text style={styles.body}>
            The map UI hit an unexpected render fault. You can try again or
            restart the app if the problem persists.
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Try again"
            onPress={this.handleRetry}
            style={styles.button}>
            <Text style={styles.buttonLabel}>Try again</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.bg900,
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    color: palette.fg100,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  body: {
    color: palette.fg300,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 24,
  },
  button: {
    alignSelf: 'flex-start',
    backgroundColor: palette.accentCyanDim,
    borderColor: palette.accentCyan,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  buttonLabel: {
    color: palette.accentCyan,
    fontSize: 15,
    fontWeight: '600',
  },
});
