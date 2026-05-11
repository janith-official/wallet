import { Pressable, View } from 'react-native';
import { Text } from '@/components/Text';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { CategoryIcon } from './CategoryIcon';
import { AmountText } from './AmountText';

const C = {
  card: '#141416',
  border: '#1e1e24',
  text: '#f0f0f5',
  sub: '#b0b0be',
  muted: '#5c5c70',
  blue: '#60a5fa',
};

export type TransactionRowData = {
  id: string;
  amount: number;
  currency: string;
  type: 'income' | 'expense' | 'transfer';
  occurred_at: string;
  note?: string | null;
  category?: { name: string; icon?: string | null; color?: string | null } | null;
  account?: { name: string } | null;
  to_account?: { name: string } | null;
};

type Props = {
  item: TransactionRowData;
  onPress: (id: string) => void;
  showDate?: boolean;
};

export function TransactionRow({ item, onPress, showDate = false }: Props) {
  const isTransfer = item.type === 'transfer';

  return (
    <Pressable
      onPress={() => onPress(item.id)}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: pressed ? C.border : C.card,
        borderBottomWidth: 1,
        borderBottomColor: C.border,
        gap: 12,
      })}
    >
      {isTransfer ? (
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: C.blue + '18',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="swap-horizontal" size={18} color={C.blue} />
        </View>
      ) : (
        <CategoryIcon icon={item.category?.icon} color={item.category?.color} />
      )}
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, fontWeight: '600', color: C.text }} numberOfLines={1}>
          {isTransfer ? 'Transfer' : (item.category?.name ?? 'Uncategorised')}
        </Text>
        <Text style={{ fontSize: 12, color: C.muted }} numberOfLines={1}>
          {isTransfer && item.account && item.to_account
            ? `${item.account.name} → ${item.to_account.name}`
            : item.account?.name ?? ''}
          {showDate ? `  ·  ${format(new Date(item.occurred_at), 'MMM d')}` : ''}
        </Text>
        {item.note ? (
          <Text style={{ fontSize: 12, color: C.muted, fontStyle: 'italic' }} numberOfLines={1}>
            {item.note}
          </Text>
        ) : null}
      </View>
      <AmountText amount={item.amount} currency={item.currency} type={item.type} />
    </Pressable>
  );
}
