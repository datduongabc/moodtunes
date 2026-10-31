import { MD3DarkTheme, configureFonts, type MD3Theme } from 'react-native-paper';
import { color, font } from './tokens';

export const paperTheme: MD3Theme = {
  ...MD3DarkTheme,
  roundness: 3,
  fonts: configureFonts({ config: { fontFamily: font.regular } }),
  colors: {
    ...MD3DarkTheme.colors,
    primary: color.primary,
    onPrimary: color.onPrimary,
    primaryContainer: color.primaryContainer,
    onPrimaryContainer: color.onPrimaryContainer,
    background: color.background,
    surface: color.surface,
    surfaceVariant: color.containerHigh,
    onSurface: color.onSurface,
    onSurfaceVariant: color.onSurfaceVariant,
    outline: color.outline,
    outlineVariant: color.outlineVariant,
    error: color.error,
    errorContainer: color.errorContainer,
    onErrorContainer: color.onErrorContainer,
    elevation: {
      level0: 'transparent',
      level1: color.surface,
      level2: color.container,
      level3: color.containerHigh,
      level4: color.containerHigh,
      level5: color.containerHighest,
    },
  },
};
