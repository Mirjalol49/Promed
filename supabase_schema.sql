create table profiles (
  id uuid references auth.users on delete cascade not null primary key,
  username text unique,
  phone text,
  full_name text,
  role text check (role in ('doctor', 'clinic_admin', 'superadmin')),
  account_id text,
  profile_image text,
  is_disabled boolean default false,
  updated_at timestamp with time zone,
  
  constraint phone_length check (char_length(phone) >= 3)
);
-- ... (triggers)

-- MIGRATION: Run this if table already exists
-- alter table profiles add column if not exists username text unique;
-- alter table profiles alter column phone drop not null;

-- Triggers to handle updated_at
create extension if not exists moddatetime schema extensions;

create trigger handle_updated_at before update on profiles
  for each row execute procedure moddatetime (updated_at);

-- Create a table for patients
create table patients (
  id uuid default gen_random_uuid() primary key,
  account_id text not null, -- Links patient to a specific clinic account/tenant
  full_name text not null,
  age integer,
  gender text,
  phone text,
  email text,
  operation_date timestamp with time zone,
  profile_image text,
  before_image text,
  after_images jsonb default '[]'::jsonb,
  injections jsonb default '[]'::jsonb,
  status text default 'Active',
  grafts integer,
  technique text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create trigger handle_updated_at before update on patients
  for each row execute procedure moddatetime (updated_at);

-- Set up Row Level Security (RLS)
alter table profiles enable row level security;
alter table patients enable row level security;

-- Policies for Profiles
-- 1. Public can read profiles (needed for login checks sometimes, or restrict to authenticated)
create policy "Public profiles are viewable by everyone"
  on profiles for select
  using ( true );

-- 2. Users can update own profile
create policy "Users can update own profile"
  on profiles for update
  using ( auth.uid() = id );

-- Policies for Patients
-- 1. Users can read patients belonging to their account_id
-- We need a helper to get current user's account_id, but for simplicity in this demo we might rely on the client sending the account_id query 
-- OR use a join. For robust multi-tenancy:
create policy "Users can view patients of their account"
  on patients for select
  using (
    account_id in (
      select account_id from profiles where id = auth.uid()
    )
  );

-- 2. Users can insert patients into their account
create policy "Users can insert patients for their account"
  on patients for insert
  with check (
    account_id in (
      select account_id from profiles where id = auth.uid()
    )
  );

-- 3. Users can update patients of their account
create policy "Users can update patients of their account"
  on patients for update
  using (
    account_id in (
      select account_id from profiles where id = auth.uid()
    )
  );

-- 4. Users can delete patients of their account
create policy "Users can delete patients of their account"
  on patients for delete
  using (
    account_id in (
      select account_id from profiles where id = auth.uid()
    )
  );

-- Storage (Bucket setup needs to be done via UI usually, but policies can be SQL)
-- Create a storage bucket 'promed-images'
insert into storage.buckets (id, name, public)
values ('promed-images', 'promed-images', true)
on conflict (id) do nothing;

-- Allow authenticated uploads
create policy "Authenticated users can upload images"
  on storage.objects for insert
  with check ( bucket_id = 'promed-images' and auth.role() = 'authenticated' );

-- Allow public view
create policy "Public can view images"
  on storage.objects for select
  using ( bucket_id = 'promed-images' );


-- --- MULTI-TENANCY SECURITY ---

-- Function to automatically assign the correct account_id (Organization ID) from the creator's profile
create or replace function public.handle_new_patient_account_id()
returns trigger as $$
begin
  -- Look up the account_id of the user creating the record
  select account_id into new.account_id
  from public.profiles
  where id = auth.uid();
  
  -- If for some reason profile is missing (shouldn't happen), raise error
  if new.account_id is null then
    raise exception 'User profile not found or missing account_id';
  end if;
  
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to enforce account_id on insert
-- 1. Drop existing trigger to ensure idempotency
drop trigger if exists set_patient_account_id on patients;

-- 2. Create the trigger
create trigger set_patient_account_id
  before insert on patients
  for each row execute procedure public.handle_new_patient_account_id();


-- --- AUTOMATIC PROFILE CREATION (Simple Auth) ---

-- Function to handle new user signup (triggered by Supabase Auth)
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role, account_id, is_disabled, username)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    'doctor', -- Default role
    'account_' || extract(epoch from now())::text, -- Generate unique Account ID based on timestamp
    false,
    split_part(new.email, '@', 1) -- Use part of email as default username
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger on auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

