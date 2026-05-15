import { Text, View } from 'react-native';
import { useTheme } from '@/features/theme/ThemeContext';

type Props = {
  icon?: string | null;
  color?: string | null;
  size?: number;
};

export function CategoryIcon({ icon, color, size = 36 }: Props) {
  const C = useTheme();
  const bg = color ? color + '33' : C.border;
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
