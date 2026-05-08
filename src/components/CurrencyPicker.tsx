import { Pressable, View } from 'react-native';
import { Text } from '@/components/Text';

export const CURRENCIES = ['USD', 'LKR', 'SGD'] as const;
export type SupportedCurrency = (typeof CURRENCIES)[number];

const LABELS: Record<SupportedCurrency, string> = {
  USD: '$ USD',
  LKR: '₨ LKR',
  SGD: 'S$ SGD',
};

type Props = {
  value: string;
  onChange: (currency: SupportedCurrency) => void;
};

export function CurrencyPicker({ value, onChange }: Props) {
  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: '#2a2a2a',
        borderRadius: 8,
        padding: 4,
        gap: 4,
      }}
    >
      {CURRENCIES.map((c) => {
        const active = value === c;
        return (
          <Pressable
            key={c}
            onPress={() => onChange(c)}
            style={{
              flex: 1,
              paddingVertical: 8,
              borderRadius: 6,
              alignItems: 'center',
              backgroundColor: active ? '#dc262620' : 'transparent',
              shadowColor: active ? '#dc2626' : 'transparent',
              shadowOpacity: 0.06,
              shadowRadius: 4,
              elevation: active ? 1 : 0,
            }}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: '600',
                color: active ? '#dc2626' : '#9ca3af',
              }}
            >
              {LABELS[c]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
