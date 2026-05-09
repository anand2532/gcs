/**
 * Dark tactical theme tokens. Single source of truth for colour, type, and
 * spacing. UI components MUST consume these tokens, never raw values.
 */

export const palette = {
  // Canvas
  bg900: '#05080C',
  bg800: '#0A0F16',
  bg700: '#10171F',
  bg600: '#172029',

  // Surface (glass)
  surface: 'rgba(18, 26, 36, 0.72)',
  surfaceHigh: 'rgba(28, 38, 50, 0.82)',
  surfaceLine: 'rgba(120, 200, 255, 0.10)',

  // Foreground
  fg100: '#F5FAFF',
  fg200: '#D8E4F0',
  fg300: '#9DB1C7',
  fg400: '#5C7184',
  fg500: '#3A4856',

  // Accents
  accentCyan: '#5BE0FF',
  accentCyanDim: 'rgba(91, 224, 255, 0.16)',
  accentAmber: '#FFB347',
  accentAmberDim: 'rgba(255, 179, 71, 0.16)',
  accentGreen: '#5BFFA1',
  accentGreenDim: 'rgba(91, 255, 161, 0.16)',

  // Status
  warn: '#FFB347',
  danger: '#FF5E66',
  dangerDim: 'rgba(255, 94, 102, 0.18)',
  ok: '#5BFFA1',
  info: '#5BE0FF',

  // Map
  trail: '#5BE0FF',
  trailGlow: 'rgba(91, 224, 255, 0.35)',
} as const;

export type PaletteKey = keyof typeof palette;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
  pill: 999,
} as const;

export const typography = {
  // Font families intentionally use the system stack so we don't need a
  // bundled font in Phase 1; can be swapped to a custom tactical font later.
  fontFamily: {
    sans: undefined as undefined | string,
    mono: undefined as undefined | string,
  },
  size: {
    xs: 10,
    sm: 12,
    md: 14,
    lg: 18,
    xl: 24,
    display: 32,
  },
  weight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
  letterSpacing: {
    tight: -0.25,
    normal: 0,
    wide: 1,
    tactical: 1.4,
  },
} as const;

export const animation = {
  /** Standard short interaction (ms). */
  fast: 140,
  /** Medium UI transition (ms). */
  base: 220,
  /** Slow, cinematic (ms). */
  slow: 380,
} as const;

export const theme = {
  palette,
  spacing,
  radius,
  typography,
  animation,
} as const;

export type Theme = typeof theme;
