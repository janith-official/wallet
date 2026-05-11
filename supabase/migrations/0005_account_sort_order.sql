-- Add sort_order column to accounts for custom ordering
alter table accounts add column if not exists sort_order integer not null default 0;
