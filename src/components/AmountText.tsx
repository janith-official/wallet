import { Text } from '@/components/Text';
import { formatMoney } from '@/lib/currency';

type Props = {
  amount: number;
  currency: string;
  type?: 'income' | 'expense' | 'transfer';
  fontSize?: number;
  fontWeight?: '400' | '500' | '600' | '700';
};

export function AmountText({ amount, currency, type, fontSize = 14, fontWeight = '600' }: Props) {
  const color = type === 'income' ? '#22c55e' : type === 'expense' ? '#ef4444' : '#f9fafb';
  const prefix = type === 'income' ? '+' : type === 'expense' ? '−' : '';
  return (
    <Text style={{ color, fontSize, fontWeight }}>
      {prefix}
      {formatMoney(amount, currency)}
    </Text>
  );
}
