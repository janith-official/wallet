-- Wallet — initial schema
-- Run with: supabase db push (after `supabase link`) or paste in SQL editor.

create extension if not exists "uuid-ossp";

-- Enums
create type tx_kind as enum ('income', 'expense', 'transfer');
create type cat_kind as enum ('income', 'expense');
create type budget_period as enum ('weekly', 'monthly');
create type cadence as enum ('daily', 'weekly', 'monthly', 'yearly');

-- profiles
create table profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  base_currency text not null default 'USD',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- accounts
create table accounts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null default 'cash',
  currency text not null,
  opening_balance numeric(18, 2) not null default 0,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- categories
create table categories (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  kind cat_kind not null,
  icon text,
  color text,
  parent_id uuid references categories(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- recurring_rules
create table recurring_rules (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  template jsonb not null,
  cadence cadence not null,
  interval int not null default 1 check (interval >= 1),
  next_run date not null,
  end_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- transactions
create table transactions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null references accounts(id) on delete restrict,
  category_id uuid references categories(id) on delete set null,
  amount numeric(18, 2) not null,
  currency text not null,
  amount_in_base numeric(18, 2) not null,
  type tx_kind not null,
  occurred_at timestamptz not null,
  note text,
  recurring_rule_id uuid references recurring_rules(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index transactions_user_occurred_idx on transactions (user_id, occurred_at desc);
create index transactions_user_category_idx on transactions (user_id, category_id);

-- budgets
create table budgets (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid references categories(id) on delete cascade,
  period budget_period not null default 'monthly',
  amount numeric(18, 2) not null check (amount >= 0),
  currency text not null,
  start_date date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- fx_rates (shared, no user_id)
create table fx_rates (
  date date not null,
  base text not null,
  quote text not null,
  rate numeric(20, 10) not null,
  fetched_at timestamptz not null default now(),
  primary key (date, base, quote)
);

-- updated_at trigger
create or replace function set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

do $$ declare t text;
begin
  for t in select unnest(array['profiles','accounts','categories','transactions','budgets','recurring_rules']) loop
    execute format('create trigger %I_set_updated_at before update on %I for each row execute function set_updated_at();', t, t);
  end loop;
end $$;

-- Auto-create profile on signup
create or replace function handle_new_user() returns trigger language plpgsql security definer as $$
begin
  insert into profiles (user_id) values (new.id);
  return new;
end $$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function handle_new_user();

-- RLS
alter table profiles enable row level security;
alter table accounts enable row level security;
alter table categories enable row level security;
alter table transactions enable row level security;
alter table budgets enable row level security;
alter table recurring_rules enable row level security;
alter table fx_rates enable row level security;

create policy "own profile" on profiles for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own accounts" on accounts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own categories" on categories for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own transactions" on transactions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own budgets" on budgets for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own recurring" on recurring_rules for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "fx readable" on fx_rates for select using (auth.uid() is not null);
