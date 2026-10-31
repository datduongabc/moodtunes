/** Design tokens from the Figma design system (A01 section 7.2). */
export const color = {
  background: '#0F0F14',
  surface: '#16161D',
  container: '#1E1E27',
  containerHigh: '#282833',
  containerHighest: '#33333F',
  onSurface: '#ECE8F2',
  onSurfaceVariant: '#B4AFC0',
  disabled: '#6E6A7A',
  inverse: '#16161D',
  outline: '#4A4657',
  outlineVariant: '#34313D',
  primary: '#CBB8FF',
  onPrimary: '#2A1866',
  primaryContainer: '#46358F',
  onPrimaryContainer: '#E8DDFF',
  error: '#FFB4AB',
  errorContainer: '#93000A',
  onErrorContainer: '#FFDAD6',
  success: '#7DDC9A',
  warning: '#FFD27A',
  offline: '#3A3A46',
} as const;

/** Spacing scale: 4, 8, 12, 16, 24, 32, 48 (A01 table 7.3). */
export const space = { text: 4, tight: 8, grid: 12, group: 16, margin: 16, area: 24, top: 32, empty: 48 } as const;
export const radius = { small: 8, medium: 12, large: 16, xl: 28, full: 999 } as const;

export const font = {
  regular: 'BeVietnamPro_400Regular',
  medium: 'BeVietnamPro_500Medium',
  semibold: 'BeVietnamPro_600SemiBold',
  bold: 'BeVietnamPro_700Bold',
};

type T = { fontFamily: string; fontSize: number; lineHeight: number };
const t = (fontFamily: string, fontSize: number, lineHeight: number): T => ({ fontFamily, fontSize, lineHeight });

export const type = {
  displaySmall: t(font.bold, 36, 44),
  headlineMedium: t(font.bold, 28, 36),
  headlineSmall: t(font.semibold, 24, 32),
  titleLarge: t(font.semibold, 22, 28),
  titleMedium: t(font.semibold, 16, 24),
  titleSmall: t(font.semibold, 14, 20),
  bodyLarge: t(font.regular, 16, 24),
  bodyMedium: t(font.regular, 14, 20),
  bodySmall: t(font.regular, 12, 16),
  labelLarge: t(font.medium, 14, 20),
  labelMedium: t(font.medium, 12, 16),
  labelSmall: t(font.medium, 11, 16),
};

/** Minimum touch target (NFR-ACC-01). */
export const TOUCH = 48;

/** Mood tint on dark surfaces: 24% of the accent over the container colour. */
export const tint = (hex: string, alpha = 0.24) => {
  const a = Math.round(alpha * 255)
    .toString(16)
    .padStart(2, '0');
  return `${hex}${a}`;
};

/** Bottom padding for lists so the mini-player never covers the last row. */
export const MINI_PLAYER_SPACE = 88;
