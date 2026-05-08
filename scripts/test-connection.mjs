// Quick Supabase connection sanity check.
// Run: node scripts/test-connection.mjs
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(
  readFileSync(new URL('../.env', import.meta.url), 'utf8')
    .split('\n')
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const url = env.EXPO_PUBLIC_SUPABASE_URL;
const key = env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) {
  console.error('Missing env vars in .env');
  process.exit(1);
}

const supa = createClient(url, key, { auth: { persistSession: false } });

const checks = [];
function check(name, ok, detail) {
  checks.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
}

// 1. Schema loaded — fx_rates is readable to any authenticated user, but anon will get RLS-deny which is also a positive signal that the table exists.
{
  const { error } = await supa.from('fx_rates').select('date').limit(1);
  // Either 0 rows back or RLS-blocked. Both prove the table exists.
  if (!error || /row-level security|permission/i.test(error.message)) {
    check('fx_rates table exists', true, error ? `RLS blocked anon (expected): ${error.code ?? ''}` : 'readable, 0 rows');
  } else if (/relation .* does not exist/i.test(error.message)) {
    check('fx_rates table exists', false, 'table missing — did you run 0001_init.sql?');
  } else {
    check('fx_rates table exists', false, error.message);
  }
}

// 2. RLS protects transactions from anon.
{
  const { data, error } = await supa.from('transactions').select('id').limit(1);
  if (error && /row-level security|permission|JWT/i.test(error.message)) {
    check('RLS blocks anon read of transactions', true, 'denied as expected');
  } else if (!error && Array.isArray(data) && data.length === 0) {
    check('RLS blocks anon read of transactions', true, 'empty result (RLS hides rows)');
  } else if (error && /relation .* does not exist/i.test(error.message)) {
    check('transactions table exists', false, 'table missing');
  } else {
    check('RLS blocks anon read of transactions', false, error?.message ?? 'returned rows!');
  }
}

// 3. Auth endpoint reachable — bogus credentials should return a clean
//    "Invalid login credentials" error, not a network/config error.
{
  const { error } = await supa.auth.signInWithPassword({
    email: 'definitely-not-a-real-user-12345@gmail.com',
    password: 'wrong-password-on-purpose',
  });
  if (error && /invalid login credentials|email not confirmed/i.test(error.message)) {
    check('auth endpoint reachable', true, 'rejected bad creds as expected');
  } else if (error) {
    check('auth endpoint reachable', false, error.message);
  } else {
    check('auth endpoint reachable', false, 'unexpectedly succeeded');
  }
}

const fails = checks.filter((c) => !c.ok);
console.log(`\n${checks.length - fails.length}/${checks.length} checks passed.`);
process.exit(fails.length ? 1 : 0);
