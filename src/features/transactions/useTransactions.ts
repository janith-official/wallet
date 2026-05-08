import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { startOfMonth, endOfMonth } from 'date-fns';
import { supabase } from '@/supabase/client';
import type { TransactionRowData } from '@/components/TransactionRow';

const PAGE_SIZE = 30;

export function useTransactions(userId: string, month: Date, typeFilter: string) {
  const from = startOfMonth(month).toISOString();
  const to = endOfMonth(month).toISOString();

  return useInfiniteQuery({
    queryKey: ['transactions-list', userId, from, to, typeFilter],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      let q = supabase
        .from('transactions')
        .select('id, amount, currency, amount_in_base, type, occurred_at, note, category:categories(name, icon, color), account:accounts(name)')
        .eq('user_id', userId)
        .is('deleted_at', null)
        .gte('occurred_at', from)
        .lte('occurred_at', to)
        .order('occurred_at', { ascending: false })
        .range(pageParam, pageParam + PAGE_SIZE - 1);

      if (typeFilter !== 'all') {
        q = q.eq('type', typeFilter);
      }

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as TransactionRowData[];
    },
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < PAGE_SIZE) return undefined;
      return allPages.flat().length;
    },
    enabled: !!userId,
  });
}

export function useAddTransaction(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      account_id: string;
      category_id?: string;
      amount: number;
      currency: string;
      amount_in_base: number;
      type: 'income' | 'expense' | 'transfer';
      occurred_at: string;
      note?: string;
    }) => {
      const { error } = await supabase.from('transactions').insert({ ...payload, user_id: userId });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions-list', userId] });
      qc.invalidateQueries({ queryKey: ['transactions', userId] });
      qc.invalidateQueries({ queryKey: ['budget-transactions', userId] });
    },
  });
}
