-- Add icon and color columns to accounts for custom appearance
alter table accounts add column if not exists icon text;
alter table accounts add column if not exists color text;
