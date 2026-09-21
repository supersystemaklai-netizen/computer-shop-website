-- Run this complete file once in Supabase SQL Editor.
-- It keeps the products already stored by your old website.
create extension if not exists pgcrypto;

create table if not exists public.products (
  id text primary key,
  name text not null,
  category text default 'Accessories',
  price numeric(12,2) not null default 0,
  offer_price numeric(12,2),
  best_offer boolean default false,
  description text default '',
  image text default '',
  stock integer default 0,
  created_at timestamptz default now()
);
alter table public.products add column if not exists active boolean not null default true;
alter table public.products add column if not exists sort_order integer not null default 0;
alter table public.products add column if not exists updated_at timestamptz not null default now();

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.admin_users enable row level security;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admin_users where user_id = auth.uid());
$$;

create table if not exists public.site_settings (
  id integer primary key default 1 check (id = 1),
  site_name text not null default 'Super System',
  tagline text not null default 'Computer & CCTV products, repair and installation—direct WhatsApp support in Akola.',
  whatsapp_number text not null default '919766774855' check (whatsapp_number ~ '^[0-9]{8,15}$'),
  address text not null default 'Patrakar Colony Shop No. 13, LRT College Road, Behind New Bus Stand, Akola 444001, Maharashtra',
  working_hours text not null default 'Mon–Sat, 10:00 AM–10:00 PM',
  ticker jsonb not null default '["Same-day computer and CCTV service in Akola","Direct WhatsApp product ordering"]'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.site_settings enable row level security;
alter table public.products enable row level security;

drop policy if exists "Public can view active products" on public.products;
create policy "Public can view active products" on public.products for select using (active = true or public.is_admin());
drop policy if exists "Admins can insert products" on public.products;
create policy "Admins can insert products" on public.products for insert to authenticated with check (public.is_admin());
drop policy if exists "Admins can update products" on public.products;
create policy "Admins can update products" on public.products for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "Admins can delete products" on public.products;
create policy "Admins can delete products" on public.products for delete to authenticated using (public.is_admin());

drop policy if exists "Public can view website settings" on public.site_settings;
create policy "Public can view website settings" on public.site_settings for select using (true);
drop policy if exists "Admins can update website settings" on public.site_settings;
create policy "Admins can update website settings" on public.site_settings for update to authenticated using (public.is_admin()) with check (public.is_admin());

insert into public.site_settings (id) values (1) on conflict (id) do nothing;

-- AFTER creating your admin user in Authentication, replace the email and run:
-- insert into public.admin_users
-- select id from auth.users where email = 'YOUR-ADMIN-EMAIL@example.com'
-- on conflict (user_id) do nothing;
