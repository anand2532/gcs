/**
 * Trailing-throttle helper. Drops calls that arrive within `intervalMs` of
 * the last delivered call; the most recent dropped call is delivered when
 * the interval elapses. Used to cap HUD redraw rate independent of the
 * telemetry tick rate.
 */
export function trailingThrottle<TArgs extends readonly unknown[]>(
  fn: (...args: TArgs) => void,
  intervalMs: number,
): {
  call(...args: TArgs): void;
  flush(): void;
  cancel(): void;
} {
  let lastInvoke = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pending: TArgs | null = null;

  const invoke = (args: TArgs): void => {
    lastInvoke = Date.now();
    pending = null;
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    fn(...args);
  };

  return {
    call(...args: TArgs): void {
      const now = Date.now();
      const elapsed = now - lastInvoke;
      if (elapsed >= intervalMs) {
        invoke(args);
        return;
      }
      pending = args;
      if (!timer) {
        timer = setTimeout(() => {
          if (pending) {
            invoke(pending);
          } else {
            timer = null;
          }
        }, intervalMs - elapsed);
      }
    },
    flush(): void {
      if (pending) {
        invoke(pending);
      }
    },
    cancel(): void {
      pending = null;
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    },
  };
}
