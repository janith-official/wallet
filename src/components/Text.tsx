import { Text as RNText, StyleSheet } from 'react-native';
import type { TextProps } from 'react-native';

const FAMILY: Record<string, string> = {
  '300': 'SpaceGrotesk_300Light',
  '400': 'SpaceGrotesk_400Regular',
  normal: 'SpaceGrotesk_400Regular',
  '500': 'SpaceGrotesk_500Medium',
  '600': 'SpaceGrotesk_600SemiBold',
  '700': 'SpaceGrotesk_700Bold',
  bold: 'SpaceGrotesk_700Bold',
  '800': 'SpaceGrotesk_700Bold',
  '900': 'SpaceGrotesk_700Bold',
};

export function Text({ style, ...props }: TextProps) {
  const flat = StyleSheet.flatten(style) ?? {};
  const weight = String(flat.fontWeight ?? '400');
  return (
    <RNText
      style={[{ fontFamily: FAMILY[weight] ?? 'SpaceGrotesk_400Regular' }, style]}
      {...props}
    />
  );
}
