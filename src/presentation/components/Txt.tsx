import { Text, type TextProps } from 'react-native';
import { color, type as typeScale } from '../theme/tokens';

type Variant = keyof typeof typeScale;

export function Txt({
  variant = 'bodyMedium',
  muted,
  style,
  ...rest
}: TextProps & { variant?: Variant; muted?: boolean }) {
  return (
    <Text
      maxFontSizeMultiplier={1.3}
      style={[typeScale[variant], { color: muted ? color.onSurfaceVariant : color.onSurface }, style]}
      {...rest}
    />
  );
}
