import { createContext, useContext } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/AuthProvider';
import { supabase } from '@/supabase/client';
import type { SupportedCurrency } from '@/components/CurrencyPicker';

type ProfileCtx = {
  baseCurrency: SupportedCurrency;
};

const ProfileContext = createContext<ProfileCtx>({ baseCurrency: 'USD' });

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const userId = session?.user.id ?? '';

  const { data: profile } = useQuery({
    // Same queryKey as useProfile() — Settings' updateProfile mutation invalidates this too
    queryKey: ['profile', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('base_currency')
        .eq('user_id', userId)
        .single();
      if (error) throw error;
      return data as { base_currency: string };
    },
    enabled: !!userId,
  });

  const baseCurrency = (profile?.base_currency ?? 'USD') as SupportedCurrency;

  return (
    <ProfileContext.Provider value={{ baseCurrency }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useBaseCurrency(): SupportedCurrency {
  return useContext(ProfileContext).baseCurrency;
}
