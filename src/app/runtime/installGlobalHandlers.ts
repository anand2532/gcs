/**
 * Chains onto React Native's JS global handler so ExceptionsManager / redbox
 * still runs after we record structured logs for fatal and non-fatal errors.
 *
 * Unhandled promise rejections are already routed through RN's promise
 * rejection tracking (`promiseRejectionTrackingOptions`) to LogBox in dev;
 * we do not duplicate that path here.
 */

import {log} from '../../core/logger/Logger';

export function installGlobalHandlers(): void {
  try {
    // RN exposes ErrorUtils from vendor core; typing varies by RN version.
    const ErrorUtils = require('react-native/Libraries/vendor/core/ErrorUtils') as {
      getGlobalHandler(): ((e: unknown, isFatal?: boolean) => void) | undefined;
      setGlobalHandler(handler: (e: unknown, isFatal?: boolean) => void): void;
    };
    const prev = ErrorUtils.getGlobalHandler();
    ErrorUtils.setGlobalHandler((error: unknown, isFatal?: boolean) => {
      const err = error instanceof Error ? error : new Error(String(error));
      log.app.error('global.unhandled', {
        message: err.message,
        stack: err.stack,
        isFatal: isFatal ?? false,
      });
      prev?.(error, isFatal);
    });
  } catch {
    // Jest / bare-metal environments without RN internals — skip quietly.
  }
}
