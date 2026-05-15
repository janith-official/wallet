import { View } from 'react-native';
import { useTheme } from '@/features/theme/ThemeContext';

type Props = {
  ratio: number; // 0 to 1+
  height?: number;
};

export function ProgressBar({ ratio, height = 8 }: Props) {
  const C = useTheme();
  const clamped = Math.min(ratio, 1);
  const color = ratio >= 1 ? C.expense : ratio >= 0.8 ? C.amber : C.income;
  return (
    <View style={{ borderRadius: height / 2, shadowColor: color, shadowOpacity: 0.3, shadowRadius: height, elevation: 2 }}>
      <View
        style={{
          height,
          borderRadius: height / 2,
          backgroundColor: C.border,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            height,
            borderRadius: height / 2,
            backgroundColor: color,
            width: `${clamped * 100}%`,
          }}
        />
      </View>
    </View>
  );
}
