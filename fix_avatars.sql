-- 1. Create the 'avatars' bucket (Public)
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- 2. Drop old policies to be safe (if any existed for avatars)
drop policy if exists "Avatar Public View" on storage.objects;
drop policy if exists "Avatar Upload" on storage.objects;
drop policy if exists "Avatar Update" on storage.objects;
drop policy if exists "Avatar Delete" on storage.objects;

-- 3. Create RLS Policies for 'avatars'
-- View: Public
create policy "Avatar Public View"
  on storage.objects for select
  using ( bucket_id = 'avatars' );

-- Upload: Authenticated Users
create policy "Avatar Upload"
  on storage.objects for insert
  with check ( bucket_id = 'avatars' and auth.role() = 'authenticated' );

-- Update: Users can update their own files (or any file in bucket if we trust auth, 
-- but ideally we restrict path)
create policy "Avatar Update"
  on storage.objects for update
  using ( bucket_id = 'avatars' and auth.role() = 'authenticated' );

-- Delete: Authenticated Users
create policy "Avatar Delete"
  on storage.objects for delete
  using ( bucket_id = 'avatars' and auth.role() = 'authenticated' );

-- 4. Update Schema: Add avatar_url to profiles
alter table public.profiles 
add column if not exists avatar_url text;

-- 5. Backfill (optional, to keep existing images)
update public.profiles
set avatar_url = profile_image
where avatar_url is null and profile_image is not null;
