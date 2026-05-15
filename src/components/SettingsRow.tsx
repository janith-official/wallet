import { Pressable, View } from 'react-native';
import { Text } from '@/components/Text';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/features/theme/ThemeContext';

type Props = {
  label: string;
  value?: string;
  onPress?: () => void;
  showChevron?: boolean;
  labelColor?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
};

export function SettingsRow({
  label,
  value,
  onPress,
  showChevron = true,
  labelColor,
  icon,
  iconColor,
}: Props) {
  const C = useTheme();
  const resolvedLabelColor = labelColor ?? C.text;
  const resolvedIconColor = iconColor ?? C.sub;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        backgroundColor: pressed ? C.border : 'transparent',
        gap: 12,
      })}
    >
      {icon && <Ionicons name={icon} size={18} color={resolvedIconColor} />}
      <Text style={{ flex: 1, fontSize: 14, fontWeight: '500', color: resolvedLabelColor }}>{label}</Text>
      {value ? (
        <Text style={{ fontSize: 13, color: C.sub, marginRight: showChevron ? 4 : 0 }}>{value}</Text>
      ) : null}
      {showChevron && <Ionicons name="chevron-forward" size={16} color={C.muted} />}
    </Pressable>
  );
}

export function SettingsSeparator() {
  const C = useTheme();
  return <View style={{ height: 1, backgroundColor: C.border, marginLeft: 46 }} />;
}
