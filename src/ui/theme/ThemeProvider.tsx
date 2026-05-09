/**
 * Theme provider.
 *
 * Phase 1 ships exactly one theme (dark tactical). The provider exists so
 * a future light/contrast theme drops in with zero component changes.
 */

import React, {createContext, useContext, useMemo, type ReactNode} from 'react';

import {theme as defaultTheme, type Theme} from './tokens';

const ThemeContext = createContext<Theme>(defaultTheme);

interface ThemeProviderProps {
  readonly children: ReactNode;
  readonly theme?: Theme;
}

export function ThemeProvider({
  children,
  theme,
}: ThemeProviderProps): React.JSX.Element {
  const value = useMemo(() => theme ?? defaultTheme, [theme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}
