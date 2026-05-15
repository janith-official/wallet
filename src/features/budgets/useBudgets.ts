import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, addMonths, addWeeks, format } from 'date-fns';
import { supabase } from '@/supabase/client';

export type Budget = {
  id: string;
  category_id: string;
  period: 'weekly' | 'monthly';
  amount: number;
  currency: string;
  start_date: string;
  name?: string | null;
  category?: { name: string; icon?: string | null; color?: string | null } | null;
};

export type BudgetWithSpend = Budget & {
  spent: number;
  resetDate: string;
};

export function useBudgets(userId: string, period: 'weekly' | 'monthly', referenceDate: Date) {
  const periodFrom = period === 'monthly' ? startOfMonth(referenceDate) : startOfWeek(referenceDate, { weekStartsOn: 1 });
  const periodTo = period === 'monthly' ? endOfMonth(referenceDate) : endOfWeek(referenceDate, { weekStartsOn: 1 });

  const budgets = useQuery({
    queryKey: ['budgets', userId, period],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('budgets')
        .select('id, category_id, period, amount, currency, start_date, name, category:categories(name, icon, color)')
        .eq('user_id', userId)
        .eq('period', period)
        .is('deleted_at', null);
      if (error) throw error;
      return (data ?? []) as Budget[];
    },
    enabled: !!userId,
  });

  const transactions = useQuery({
    queryKey: ['budget-transactions', userId, periodFrom.toISOString(), periodTo.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('category_id, amount_in_base, type')
        .eq('user_id', userId)
        .eq('type', 'expense')
        .is('deleted_at', null)
        .gte('occurred_at', periodFrom.toISOString())
        .lte('occurred_at', periodTo.toISOString());
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!userId,
  });

  const spendMap = new Map<string, number>();
  for (const t of transactions.data ?? []) {
    spendMap.set(t.category_id, (spendMap.get(t.category_id) ?? 0) + (Number(t.amount_in_base) || 0));
  }

  const budgetsWithSpend: BudgetWithSpend[] = (budgets.data ?? []).map((b) => {
    const resetDate =
      period === 'monthly'
        ? format(addMonths(new Date(b.start_date), 1), 'MMM d')
        : format(addWeeks(new Date(b.start_date), 1), 'MMM d');
    return {
      ...b,
      amount: Number(b.amount) || 0,
      spent: spendMap.get(b.category_id) ?? 0,
      resetDate,
    };
  });

  const totalBudgeted = budgetsWithSpend.reduce((s, b) => s + (b.amount || 0), 0);
  const totalSpent = budgetsWithSpend.reduce((s, b) => s + (b.spent || 0), 0);

  return {
    budgetsWithSpend,
    totalBudgeted,
    totalSpent,
    isLoading: budgets.isLoading || transactions.isLoading,
    periodFrom,
    periodTo,
  };
}

export function useAddBudget(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      category_id: string | null;
      period: 'weekly' | 'monthly';
      amount: number;
      currency: string;
      start_date: string;
      name?: string | null;
    }) => {
      const { error } = await supabase.from('budgets').insert({ ...payload, user_id: userId });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['budgets', userId] });
    },
  });
}

export function useUpdateBudget(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { id: string; amount: number; currency: string; name?: string | null; category_id?: string | null }) => {
      const { error } = await supabase
        .from('budgets')
        .update({ amount: payload.amount, currency: payload.currency, name: payload.name ?? null, category_id: payload.category_id ?? null })
        .eq('id', payload.id)
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['budgets', userId] });
    },
  });
}

export function useDeleteBudget(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (budgetId: string) => {
      const { error } = await supabase
        .from('budgets')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', budgetId)
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['budgets', userId] });
    },
  });
}
