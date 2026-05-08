import { View } from 'react-native';

type Props = {
  ratio: number; // 0 to 1+
  height?: number;
};

function barColor(ratio: number): string {
  if (ratio >= 1) return '#dc2626';
  if (ratio >= 0.8) return '#f59e0b';
  return '#16a34a';
}

export function ProgressBar({ ratio, height = 8 }: Props) {
  const clamped = Math.min(ratio, 1);
  const color = barColor(ratio);
  return (
    <View style={{ borderRadius: height / 2, shadowColor: color, shadowOpacity: 0.3, shadowRadius: height, elevation: 2 }}>
      <View
        style={{
          height,
          borderRadius: height / 2,
          backgroundColor: '#2a2a2a',
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
