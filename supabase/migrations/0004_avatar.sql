-- Add avatar_url to profiles
alter table profiles add column if not exists avatar_url text;

-- Create avatars storage bucket (public so URLs can be loaded directly in <Image>)
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict do nothing;

-- RLS: users can upload/update/delete their own avatar (path = userId/*)
create policy "avatar upload" on storage.objects for insert
  with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "avatar update" on storage.objects for update
  using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "avatar delete" on storage.objects for delete
  using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

-- Public read for avatar images
create policy "avatar read" on storage.objects for select
  using (bucket_id = 'avatars');
