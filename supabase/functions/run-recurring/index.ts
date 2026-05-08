// deno-lint-ignore-file
// Daily cron: materialize recurring transactions whose next_run <= today.
// Adds a new transaction per due rule and advances next_run by cadence * interval.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

type Cadence = 'daily' | 'weekly' | 'monthly' | 'yearly';

function advance(date: string, cadence: Cadence, interval: number): string {
  const d = new Date(date + 'T00:00:00Z');
  switch (cadence) {
    case 'daily':
      d.setUTCDate(d.getUTCDate() + interval);
      break;
    case 'weekly':
      d.setUTCDate(d.getUTCDate() + 7 * interval);
      break;
    case 'monthly':
      d.setUTCMonth(d.getUTCMonth() + interval);
      break;
    case 'yearly':
      d.setUTCFullYear(d.getUTCFullYear() + interval);
      break;
  }
  return d.toISOString().slice(0, 10);
}

serve(async () => {
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
  const today = new Date().toISOString().slice(0, 10);

  const { data: rules, error } = await admin
    .from('recurring_rules')
    .select('*')
    .lte('next_run', today)
    .is('deleted_at', null);

  if (error) return new Response(error.message, { status: 500 });

  let created = 0;
  for (const r of rules ?? []) {
    if (r.end_date && r.end_date < today) continue;
    const tpl = r.template as Record<string, unknown>;
    const { error: insErr } = await admin.from('transactions').insert({
      user_id: r.user_id,
      account_id: tpl.account_id,
      category_id: tpl.category_id ?? null,
      amount: tpl.amount,
      currency: tpl.currency,
      amount_in_base: tpl.amount_in_base ?? tpl.amount,
      type: tpl.type,
      occurred_at: new Date(r.next_run + 'T12:00:00Z').toISOString(),
      note: tpl.note ?? null,
      recurring_rule_id: r.id,
    });
    if (insErr) continue;

    const nextRun = advance(r.next_run, r.cadence as Cadence, r.interval);
    await admin.from('recurring_rules').update({ next_run: nextRun }).eq('id', r.id);
    created++;
  }

  return new Response(JSON.stringify({ created, date: today }), {
    headers: { 'content-type': 'application/json' },
  });
});
