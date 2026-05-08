import { Text, View } from 'react-native';

type Props = {
  icon?: string | null;
  color?: string | null;
  size?: number;
};

export function CategoryIcon({ icon, color, size = 36 }: Props) {
  const bg = color ? color + '33' : '#2a2a2a';
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: bg,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ fontSize: size * 0.45 }}>{icon ?? '•'}</Text>
    </View>
  );
}
