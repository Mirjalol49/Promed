-- 1. Create the Storage Bucket if it doesn't exist
insert into storage.buckets (id, name, public)
values ('promed-images', 'promed-images', true)
on conflict (id) do nothing;

-- 2. Drop existing policies to ensure clean state
drop policy if exists "Authenticated users can upload images" on storage.objects;
drop policy if exists "Public can view images" on storage.objects;
drop policy if exists "Users can update own images" on storage.objects;
drop policy if exists "Users can delete own images" on storage.objects;

-- 3. Re-create Policies with FULL permissions for authenticated users
-- Allow INSERT (Upload)
create policy "Authenticated users can upload images"
  on storage.objects for insert
  with check ( bucket_id = 'promed-images' and auth.role() = 'authenticated' );

-- Allow SELECT (Public View)
create policy "Public can view images"
  on storage.objects for select
  using ( bucket_id = 'promed-images' );

-- Allow UPDATE (Overwrite own images) - CRITICAL for profile picture updates
create policy "Users can update own images"
  on storage.objects for update
  using ( bucket_id = 'promed-images' and auth.role() = 'authenticated' );

-- Allow DELETE (Cleanup)
create policy "Users can delete own images"
  on storage.objects for delete
  using ( bucket_id = 'promed-images' and auth.role() = 'authenticated' );

-- 4. Fix existing profiles with NULL images
-- Set a default UI Avatar for anyone missing a profile picture
update public.profiles
set profile_image = 'https://ui-avatars.com/api/?name=' || coalesce(replace(username, ' ', '+'), 'User') || '&background=0D8ABC&color=fff&size=128'
where profile_image is null;

-- 5. Update the User Creation Trigger to set a default image for FUTURE users
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role, account_id, is_disabled, username, profile_image)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    'doctor',
    'account_' || extract(epoch from now())::text,
    false,
    split_part(new.email, '@', 1),
    -- Set Default Image
    'https://ui-avatars.com/api/?name=' || split_part(new.email, '@', 1) || '&background=0D8ABC&color=fff&size=128'
  );
  return new;
end;
$$ language plpgsql security definer;
