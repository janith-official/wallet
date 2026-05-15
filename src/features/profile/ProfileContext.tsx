import { createContext, useContext } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/AuthProvider';
import { supabase } from '@/supabase/client';
import type { SupportedCurrency } from '@/components/CurrencyPicker';

type ProfileCtx = {
  baseCurrency: SupportedCurrency;
};

const ProfileContext = createContext<ProfileCtx>({ baseCurrency: 'LKR' });

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const userId = session?.user.id ?? '';

  const { data: profile } = useQuery({
    // Same queryKey as useProfile() — must select ALL fields so the shared cache has complete data
    queryKey: ['profile', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, display_name, base_currency, avatar_url')
        .eq('user_id', userId)
        .single();
      if (error) throw error;
      return data as { user_id: string; display_name?: string | null; base_currency: string; avatar_url?: string | null };
    },
    enabled: !!userId,
  });

  const baseCurrency = profile?.base_currency ?? 'LKR';

  return (
    <ProfileContext.Provider value={{ baseCurrency }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useBaseCurrency(): SupportedCurrency {
  return useContext(ProfileContext).baseCurrency;
}
