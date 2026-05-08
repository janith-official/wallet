import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/supabase/client';

export type Profile = {
  user_id: string;
  display_name?: string | null;
  base_currency: string;
};

export type Account = {
  id: string;
  name: string;
  type: string;
  currency: string;
  opening_balance: number;
  archived: boolean;
};

export function useProfile(userId: string) {
  return useQuery({
    queryKey: ['profile', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, display_name, base_currency')
        .eq('user_id', userId)
        .single();
      if (error) throw error;
      return data as Profile;
    },
    enabled: !!userId,
  });
}

export function useUpdateProfile(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<Pick<Profile, 'display_name' | 'base_currency'>>) => {
      const { error } = await supabase.from('profiles').update(patch).eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['profile', userId] }),
  });
}

export function useAccounts(userId: string) {
  return useQuery({
    queryKey: ['accounts', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('accounts')
        .select('id, name, type, currency, opening_balance, archived')
        .eq('user_id', userId)
        .is('deleted_at', null)
        .order('name');
      if (error) throw error;
      return (data ?? []) as Account[];
    },
    enabled: !!userId,
  });
}

export function useUpsertAccount(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      payload: Partial<Account> & { name: string; type: string; currency: string; opening_balance: number },
    ) => {
      if (payload.id) {
        const { error } = await supabase
          .from('accounts')
          .update({ name: payload.name, type: payload.type, currency: payload.currency, opening_balance: payload.opening_balance, archived: payload.archived })
          .eq('id', payload.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('accounts').insert({ ...payload, user_id: userId });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['accounts', userId] }),
  });
}
