import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/supabase/client';

/** rates[quote] = units of quote per 1 USD (e.g. rates['LKR'] = 300) */
export type FxRates = Record<string, number>;

export function useFxRates() {
  return useQuery({
    queryKey: ['fx-rates'],
    queryFn: async (): Promise<FxRates> => {
      // Find the most recent date we have data for
      const { data: dateRow } = await supabase
        .from('fx_rates')
        .select('date')
        .eq('base', 'USD')
        .order('date', { ascending: false })
        .limit(1)
        .single();

      if (!dateRow) return { USD: 1 };

      // Fetch all rates for that date
      const { data, error } = await supabase
        .from('fx_rates')
        .select('quote, rate')
        .eq('base', 'USD')
        .eq('date', dateRow.date);

      if (error) throw error;

      const rates: FxRates = { USD: 1 };
      for (const row of data ?? []) {
        rates[row.quote] = Number(row.rate);
      }
      return rates;
    },
    staleTime: 1000 * 60 * 60, // 1 hour — rates change at most once a day
  });
}
