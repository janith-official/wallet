import { Pressable, View } from 'react-native';
import { Text } from '@/components/Text';

type Props = {
  label: string;
  value?: string;
  onPress?: () => void;
  showChevron?: boolean;
  labelColor?: string;
};

export function SettingsRow({ label, value, onPress, showChevron = true, labelColor = '#f9fafb' }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        backgroundColor: pressed ? '#242424' : '#1a1a1a',
      })}
    >
      <Text style={{ flex: 1, fontSize: 15, color: labelColor }}>{label}</Text>
      {value ? (
        <Text style={{ fontSize: 14, color: '#9ca3af', marginRight: showChevron ? 6 : 0 }}>{value}</Text>
      ) : null}
      {showChevron && <Text style={{ fontSize: 14, color: '#6b7280' }}>›</Text>}
    </Pressable>
  );
}

export function SettingsSeparator() {
  return <View style={{ height: 1, backgroundColor: '#2a2a2a', marginLeft: 16 }} />;
}
