-- Add optional display name to budgets
alter table budgets add column if not exists name text;
