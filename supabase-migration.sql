-- Super System migration: safe to run more than once.
-- Existing products/settings/admins are retained. New service catalog and theme fields are added.

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
  topbar_text text not null default 'Akola shop pickup • Computer & CCTV solutions • Repair booking',
  theme_primary text not null default '#176b4b',
  theme_accent text not null default '#d5f36a',
  theme_background text not null default '#f7f8f3',
  theme_text text not null default '#192a24',
  theme_mode text not null default 'light' check (theme_mode in ('light','dark')),
  updated_at timestamptz not null default now()
);
alter table public.site_settings add column if not exists topbar_text text not null default 'Akola shop pickup • Computer & CCTV solutions • Repair booking';
alter table public.site_settings add column if not exists theme_primary text not null default '#176b4b';
alter table public.site_settings add column if not exists theme_accent text not null default '#d5f36a';
alter table public.site_settings add column if not exists theme_background text not null default '#f7f8f3';
alter table public.site_settings add column if not exists theme_text text not null default '#192a24';
alter table public.site_settings add column if not exists theme_mode text not null default 'light';
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

create table if not exists public.service_catalog (
  id text primary key,
  title text not null,
  description text not null default '',
  image text not null default '',
  rates jsonb not null default '[]'::jsonb,
  rate_note text not null default 'Price may vary after inspection.',
  active boolean not null default true,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.service_catalog enable row level security;
drop policy if exists "Public can view active services" on public.service_catalog;
create policy "Public can view active services" on public.service_catalog for select using (active = true or public.is_admin());
drop policy if exists "Admins can insert services" on public.service_catalog;
create policy "Admins can insert services" on public.service_catalog for insert to authenticated with check (public.is_admin());
drop policy if exists "Admins can update services" on public.service_catalog;
create policy "Admins can update services" on public.service_catalog for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "Admins can delete services" on public.service_catalog;
create policy "Admins can delete services" on public.service_catalog for delete to authenticated using (public.is_admin());

-- Explicit Data API privileges, required for projects where new tables are not auto-exposed.
-- Apply least-privilege table grants for both anonymous and signed-in browser clients.
revoke all on public.admin_users from anon, authenticated;
revoke insert, update, delete, truncate, references, trigger on public.service_catalog from anon;
revoke truncate, references, trigger on public.service_catalog from authenticated;
revoke insert, update, delete, truncate, references, trigger on public.site_settings from anon;
revoke insert, delete, truncate, references, trigger on public.site_settings from authenticated;
revoke insert, update, delete, truncate, references, trigger on public.products from anon;
revoke truncate, references, trigger on public.products from authenticated;
revoke select, update, delete, truncate, references, trigger on public.orders from anon;
revoke delete, truncate, references, trigger on public.orders from authenticated;
grant select on public.service_catalog to anon, authenticated;
grant insert, update, delete on public.service_catalog to authenticated;
grant select, update on public.site_settings to authenticated;
grant select on public.site_settings to anon;
grant select on public.products to anon, authenticated;
grant insert, update, delete on public.products to authenticated;
grant insert on public.orders to anon, authenticated;
grant select, update on public.orders to authenticated;

-- Secure any legacy enquiries table that the older storefront may have created.
-- This deployment now collects order/service requests through public.orders.
do $
begin
  if to_regclass('public.enquiries') is not null then
    execute 'alter table public.enquiries enable row level security';
    execute 'revoke all on public.enquiries from anon, authenticated';
  end if;
end $;

-- To grant admin rights, create the user first in Supabase Auth, then run:
-- insert into public.admin_users select id from auth.users where email = 'YOUR-ADMIN-EMAIL@example.com' on conflict (user_id) do nothing;
