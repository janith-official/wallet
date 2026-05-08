import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/supabase/client';

export type Category = {
  id: string;
  name: string;
  kind: 'income' | 'expense';
  icon?: string | null;
  color?: string | null;
};

export function useCategories(userId: string) {
  return useQuery({
    queryKey: ['categories', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, kind, icon, color')
        .eq('user_id', userId)
        .is('deleted_at', null)
        .order('name');
      if (error) throw error;
      return (data ?? []) as Category[];
    },
    enabled: !!userId,
  });
}

export function useUpsertCategory(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      payload: Partial<Category> & { name: string; kind: 'income' | 'expense' },
    ) => {
      if (payload.id) {
        const { error } = await supabase
          .from('categories')
          .update({ name: payload.name, kind: payload.kind, icon: payload.icon ?? null, color: payload.color ?? null })
          .eq('id', payload.id)
          .eq('user_id', userId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('categories')
          .insert({ name: payload.name, kind: payload.kind, icon: payload.icon ?? null, color: payload.color ?? null, user_id: userId });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories', userId] }),
  });
}

export function useDeleteCategory(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (categoryId: string) => {
      const { error } = await supabase
        .from('categories')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', categoryId)
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories', userId] }),
  });
}
