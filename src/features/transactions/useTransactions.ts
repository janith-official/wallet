import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { startOfMonth, endOfMonth } from 'date-fns';
import { supabase } from '@/supabase/client';
import type { TransactionRowData } from '@/components/TransactionRow';

const PAGE_SIZE = 30;

export type TransactionDetail = {
  id: string;
  amount: number;
  currency: string;
  amount_in_base: number;
  type: 'income' | 'expense' | 'transfer';
  occurred_at: string;
  note?: string | null;
  account_id: string;
  category_id?: string | null;
  to_account_id?: string | null;
  category?: { name: string; icon?: string | null; color?: string | null } | null;
  account?: { name: string } | null;
  to_account?: { name: string } | null;
};

export function useTransaction(id: string, userId: string) {
  return useQuery({
    queryKey: ['transaction', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select(
          'id, amount, currency, amount_in_base, type, occurred_at, note, account_id, category_id, to_account_id, category:categories(name, icon, color), account:accounts!transactions_account_id_fkey(name), to_account:accounts!transactions_to_account_id_fkey(name)',
        )
        .eq('id', id)
        .eq('user_id', userId)
        .is('deleted_at', null)
        .single();
      if (error) throw error;
      return data as unknown as TransactionDetail;
    },
    enabled: !!id && !!userId,
  });
}

export function useTransactions(
  userId: string,
  month: Date,
  typeFilter: string,
  accountFilter: string | null = null,
) {
  const from = startOfMonth(month).toISOString();
  const to = endOfMonth(month).toISOString();

  return useInfiniteQuery({
    queryKey: ['transactions-list', userId, from, to, typeFilter, accountFilter],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      let q = supabase
        .from('transactions')
        .select(
          'id, amount, currency, amount_in_base, type, occurred_at, note, to_account_id, category:categories(name, icon, color), account:accounts!transactions_account_id_fkey(name), to_account:accounts!transactions_to_account_id_fkey(name)',
        )
        .eq('user_id', userId)
        .is('deleted_at', null)
        .gte('occurred_at', from)
        .lte('occurred_at', to)
        .order('occurred_at', { ascending: false })
        .range(pageParam, pageParam + PAGE_SIZE - 1);

      if (typeFilter !== 'all') {
        q = q.eq('type', typeFilter);
      }
      if (accountFilter) {
        q = q.eq('account_id', accountFilter);
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
      to_account_id?: string;
    }) => {
      const { error } = await supabase.from('transactions').insert({ ...payload, user_id: userId });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions-list', userId] });
      qc.invalidateQueries({ queryKey: ['transactions', userId] });
      qc.invalidateQueries({ queryKey: ['budget-transactions', userId] });
      qc.invalidateQueries({ queryKey: ['account-balances', userId] });
    },
  });
}

export function useUpdateTransaction(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...payload
    }: {
      id: string;
      account_id: string;
      category_id?: string | null;
      amount: number;
      currency: string;
      amount_in_base: number;
      type: 'income' | 'expense' | 'transfer';
      occurred_at: string;
      note?: string | null;
      to_account_id?: string | null;
    }) => {
      const { error } = await supabase
        .from('transactions')
        .update(payload)
        .eq('id', id)
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ['transaction', id] });
      qc.invalidateQueries({ queryKey: ['transactions-list', userId] });
      qc.invalidateQueries({ queryKey: ['transactions', userId] });
      qc.invalidateQueries({ queryKey: ['budget-transactions', userId] });
      qc.invalidateQueries({ queryKey: ['account-balances', userId] });
    },
  });
}

export function useDeleteTransaction(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('transactions')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions-list', userId] });
      qc.invalidateQueries({ queryKey: ['transactions', userId] });
      qc.invalidateQueries({ queryKey: ['budget-transactions', userId] });
      qc.invalidateQueries({ queryKey: ['account-balances', userId] });
    },
  });
}
