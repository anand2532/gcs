import React, {type ReactNode, useEffect} from 'react';

import {useSessionStore} from './sessionStore';

/**
 * Loads secure session metadata once at startup (Keychain + MMKV mirror).
 */
export function SessionHydrator({
  children,
}: {
  readonly children: ReactNode;
}): React.JSX.Element {
  const hydrate = useSessionStore(s => s.hydrate);

  useEffect(() => {
    hydrate().catch(() => {});
  }, [hydrate]);

  return <>{children}</>;
}
