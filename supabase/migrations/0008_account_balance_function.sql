-- RPC function to compute running balances for all of a user's accounts
create or replace function get_account_balances(p_user_id uuid)
returns table(account_id uuid, balance numeric(18, 2))
language sql stable security definer
as $$
  select
    a.id as account_id,
    a.opening_balance
      + coalesce(sum(case when t.type = 'income' and t.account_id = a.id then t.amount else 0 end), 0)
      - coalesce(sum(case when t.type = 'expense' and t.account_id = a.id then t.amount else 0 end), 0)
      - coalesce(sum(case when t.type = 'transfer' and t.account_id = a.id then t.amount else 0 end), 0)
      + coalesce(sum(case when t.type = 'transfer' and t.to_account_id = a.id then t.amount else 0 end), 0)
    as balance
  from accounts a
  left join transactions t on (t.account_id = a.id or t.to_account_id = a.id)
    and t.user_id = p_user_id
    and t.deleted_at is null
  where a.user_id = p_user_id
    and a.deleted_at is null
  group by a.id;
$$;
