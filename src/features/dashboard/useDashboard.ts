import { useQuery } from '@tanstack/react-query';
import { startOfMonth, endOfMonth } from 'date-fns';
import { supabase } from '@/supabase/client';

export type Account = {
  id: string;
  name: string;
  type: string;
  currency: string;
  opening_balance: number;
};

export type Transaction = {
  id: string;
  amount: number;
  currency: string;
  amount_in_base: number;
  type: 'income' | 'expense' | 'transfer';
  occurred_at: string;
  note?: string | null;
  category?: { name: string; icon?: string | null; color?: string | null } | null;
  account?: { name: string } | null;
};

export function useDashboard(userId: string, month: Date) {
  const from = startOfMonth(month).toISOString();
  const to = endOfMonth(month).toISOString();

  const transactions = useQuery({
    queryKey: ['transactions', userId, from, to],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('id, amount, currency, amount_in_base, type, occurred_at, note, category:categories(name, icon, color), account:accounts(name)')
        .eq('user_id', userId)
        .is('deleted_at', null)
        .gte('occurred_at', from)
        .lte('occurred_at', to)
        .order('occurred_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Transaction[];
    },
    enabled: !!userId,
  });

  const accounts = useQuery({
    queryKey: ['accounts', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('accounts')
        .select('id, name, type, currency, opening_balance')
        .eq('user_id', userId)
        .is('deleted_at', null)
        .eq('archived', false)
        .order('name');
      if (error) throw error;
      return (data ?? []) as Account[];
    },
    enabled: !!userId,
  });

  const txList = transactions.data ?? [];

  const income = txList.filter((t) => t.type === 'income').reduce((s, t) => s + (Number(t.amount_in_base) || 0), 0);
  const expenses = txList.filter((t) => t.type === 'expense').reduce((s, t) => s + (Number(t.amount_in_base) || 0), 0);
  const net = income - expenses;

  // Aggregate expenses by category (top 7)
  const catMap = new Map<string, { name: string; color?: string | null; total: number }>();
  for (const t of txList.filter((t) => t.type === 'expense')) {
    const key = t.category?.name ?? 'Other';
    const existing = catMap.get(key);
    if (existing) {
      existing.total += Number(t.amount_in_base) || 0;
    } else {
      catMap.set(key, { name: key, color: t.category?.color, total: Number(t.amount_in_base) || 0 });
    }
  }
  const categoryTotals = Array.from(catMap.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, 7);

  const recentTransactions = txList.slice(0, 5);

  return {
    transactions,
    accounts,
    income,
    expenses,
    net,
    categoryTotals,
    recentTransactions,
  };
}
