-- Add to_account_id for transfers (source = account_id, destination = to_account_id)
alter table transactions add column if not exists to_account_id uuid references accounts(id) on delete restrict;

-- Index for efficient balance lookups on destination account
create index if not exists transactions_to_account_idx on transactions (to_account_id) where to_account_id is not null;
