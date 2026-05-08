// deno-lint-ignore-file
// Daily cron: fetch FX rates and upsert into fx_rates.
// Schedule with `supabase functions deploy fx-refresh` then add a cron in Supabase dashboard
// (Database → Cron) hitting POST /functions/v1/fx-refresh once per day.
//
// Free FX source: https://open.er-api.com/v6/latest/USD (no key required).

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const BASE = 'USD';

serve(async () => {
  const res = await fetch(`https://open.er-api.com/v6/latest/${BASE}`);
  if (!res.ok) return new Response('fx api error', { status: 502 });
  const json = await res.json();
  if (json.result !== 'success') return new Response('fx api unsuccessful', { status: 502 });

  const today = new Date().toISOString().slice(0, 10);
  const rows = Object.entries(json.rates as Record<string, number>).map(([quote, rate]) => ({
    date: today,
    base: BASE,
    quote,
    rate,
  }));

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
  const { error } = await admin.from('fx_rates').upsert(rows, { onConflict: 'date,base,quote' });
  if (error) return new Response(error.message, { status: 500 });

  return new Response(JSON.stringify({ inserted: rows.length, date: today }), {
    headers: { 'content-type': 'application/json' },
  });
});
