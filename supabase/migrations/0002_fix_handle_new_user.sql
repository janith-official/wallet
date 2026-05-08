-- Fix: signup was failing with "Database error saving new user" because the
-- handle_new_user trigger is fired by the supabase_auth_admin role and the
-- function's search_path wasn't pinned, so `profiles` couldn't be resolved.
-- Recreate the function with a fully-qualified insert + empty search_path,
-- and grant the auth admin role permission to execute it.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id) values (new.id);
  return new;
end;
$$;

grant execute on function public.handle_new_user() to supabase_auth_admin;

-- Trigger already exists from 0001_init.sql; no need to recreate.
