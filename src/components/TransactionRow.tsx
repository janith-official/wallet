import { Pressable, View } from 'react-native';
import { Text } from '@/components/Text';
import { format } from 'date-fns';
import { CategoryIcon } from './CategoryIcon';
import { AmountText } from './AmountText';

export type TransactionRowData = {
  id: string;
  amount: number;
  currency: string;
  type: 'income' | 'expense' | 'transfer';
  occurred_at: string;
  note?: string | null;
  category?: { name: string; icon?: string | null; color?: string | null } | null;
  account?: { name: string } | null;
};

type Props = {
  item: TransactionRowData;
  onPress: (id: string) => void;
  showDate?: boolean;
};

export function TransactionRow({ item, onPress, showDate = false }: Props) {
  return (
    <Pressable
      onPress={() => onPress(item.id)}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: pressed ? '#242424' : '#1a1a1a',
        borderBottomWidth: 1,
        borderBottomColor: '#2a2a2a',
        gap: 12,
      })}
    >
      <CategoryIcon icon={item.category?.icon} color={item.category?.color} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, fontWeight: '600', color: '#f9fafb' }} numberOfLines={1}>
          {item.category?.name ?? 'Uncategorised'}
        </Text>
        {item.account && (
          <Text style={{ fontSize: 12, color: '#9ca3af' }} numberOfLines={1}>
            {item.account.name}
            {showDate ? `  ·  ${format(new Date(item.occurred_at), 'MMM d')}` : ''}
          </Text>
        )}
        {item.note ? (
          <Text style={{ fontSize: 12, color: '#9ca3af', fontStyle: 'italic' }} numberOfLines={1}>
            {item.note}
          </Text>
        ) : null}
      </View>
      <AmountText amount={item.amount} currency={item.currency} type={item.type} />
    </Pressable>
  );
}
