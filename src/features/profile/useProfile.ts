import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { File as ExpoFile } from 'expo-file-system';
import { supabase } from '@/supabase/client';

export type Profile = {
  user_id: string;
  display_name?: string | null;
  base_currency: string;
  avatar_url?: string | null;
};

export type Account = {
  id: string;
  name: string;
  type: string;
  currency: string;
  opening_balance: number;
  archived: boolean;
  sort_order: number;
  icon?: string | null;
  color?: string | null;
};

export function useProfile(userId: string) {
  return useQuery({
    queryKey: ['profile', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, display_name, base_currency, avatar_url')
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
    mutationFn: async (patch: Partial<Pick<Profile, 'display_name' | 'base_currency' | 'avatar_url'>>) => {
      const { error } = await supabase.from('profiles').update(patch).eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['profile', userId] }),
  });
}

export function useUploadAvatar(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (uri: string) => {
      const file = new ExpoFile(uri);
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);

      const MAX_AVATAR_BYTES = 5 * 1024 * 1024; // 5 MB
      if (bytes.byteLength > MAX_AVATAR_BYTES) {
        throw new Error('Image is too large. Please choose a photo under 5 MB.');
      }

      const filePath = `${userId}/avatar.jpg`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, bytes, { contentType: 'image/jpeg', upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('user_id', userId);
      if (updateError) throw updateError;

      return publicUrl;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['profile', userId] }),
  });
}

export function useChangeEmail() {
  return useMutation({
    mutationFn: async (newEmail: string) => {
      const { error } = await supabase.auth.updateUser({ email: newEmail });
      if (error) throw error;
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: async (newPassword: string) => {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
    },
  });
}

export function useAccounts(userId: string) {
  return useQuery({
    queryKey: ['accounts', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('accounts')
        .select('id, name, type, currency, opening_balance, archived, sort_order, icon, color')
        .eq('user_id', userId)
        .is('deleted_at', null)
        .order('sort_order')
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
      const row = {
        name: payload.name,
        type: payload.type,
        currency: payload.currency,
        opening_balance: payload.opening_balance,
        archived: payload.archived,
        icon: payload.icon ?? null,
        color: payload.color ?? null,
        sort_order: payload.sort_order ?? 0,
      };
      if (payload.id) {
        const { error } = await supabase
          .from('accounts')
          .update(row)
          .eq('id', payload.id)
          .eq('user_id', userId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('accounts').insert({ ...row, user_id: userId });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['accounts', userId] }),
  });
}

export function useDeleteAccount(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (accountId: string) => {
      const { error } = await supabase
        .from('accounts')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', accountId)
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounts', userId] });
      qc.invalidateQueries({ queryKey: ['account-balances', userId] });
    },
  });
}

export function useReorderAccounts(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (orderedIds: string[]) => {
      const updates = orderedIds.map((id, index) =>
        supabase.from('accounts').update({ sort_order: index }).eq('id', id).eq('user_id', userId),
      );
      const results = await Promise.all(updates);
      const err = results.find((r) => r.error)?.error;
      if (err) throw err;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['accounts', userId] }),
  });
}

export function useAccountBalances(userId: string) {
  return useQuery({
    queryKey: ['account-balances', userId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_account_balances', { p_user_id: userId });
      if (error) throw error;
      const map = new Map<string, number>();
      for (const row of data ?? []) {
        map.set(row.account_id as string, Number(row.balance));
      }
      return map;
    },
    enabled: !!userId,
  });
}
