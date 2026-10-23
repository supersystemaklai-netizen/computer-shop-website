-- Super System: idempotent database setup. Existing product/service rows are preserved.
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
revoke all on public.admin_users from anon, authenticated;

-- Keep SECURITY DEFINER authorization logic in a non-exposed schema, not public.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;
create or replace function private.is_admin() returns boolean
language sql stable security definer set search_path = pg_catalog, public as $$
  select exists (select 1 from public.admin_users where user_id = auth.uid());
$$;
revoke all on function private.is_admin() from public;
grant execute on function private.is_admin() to anon, authenticated;

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
create policy "Public can view active products" on public.products for select using (active = true or private.is_admin());
drop policy if exists "Admins can insert products" on public.products;
create policy "Admins can insert products" on public.products for insert to authenticated with check (private.is_admin());
drop policy if exists "Admins can update products" on public.products;
create policy "Admins can update products" on public.products for update to authenticated using (private.is_admin()) with check (private.is_admin());
drop policy if exists "Admins can delete products" on public.products;
create policy "Admins can delete products" on public.products for delete to authenticated using (private.is_admin());

drop policy if exists "Public can view website settings" on public.site_settings;
create policy "Public can view website settings" on public.site_settings for select using (true);
drop policy if exists "Admins can update website settings" on public.site_settings;
create policy "Admins can update website settings" on public.site_settings for update to authenticated using (private.is_admin()) with check (private.is_admin());

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
create policy "Public can view active services" on public.service_catalog for select using (active = true or private.is_admin());
drop policy if exists "Admins can insert services" on public.service_catalog;
create policy "Admins can insert services" on public.service_catalog for insert to authenticated with check (private.is_admin());
drop policy if exists "Admins can update services" on public.service_catalog;
create policy "Admins can update services" on public.service_catalog for update to authenticated using (private.is_admin()) with check (private.is_admin());
drop policy if exists "Admins can delete services" on public.service_catalog;
create policy "Admins can delete services" on public.service_catalog for delete to authenticated using (private.is_admin());

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  phone text not null,
  fulfilment text not null default 'Akola shop pickup',
  notes text not null default '',
  items jsonb not null default '[]'::jsonb,
  total numeric(12,2) not null default 0,
  status text not null default 'Request received',
  created_at timestamptz not null default now()
);
alter table public.orders enable row level security;
drop policy if exists "Anyone can submit order requests" on public.orders;
create policy "Anyone can submit order requests" on public.orders for insert to anon, authenticated
with check (length(trim(customer_name)) between 1 and 100 and length(trim(phone)) between 10 and 15 and length(notes) <= 2000 and total >= 0);
drop policy if exists "Admins can view orders" on public.orders;
create policy "Admins can view orders" on public.orders for select to authenticated using (private.is_admin());
drop policy if exists "Admins can update orders" on public.orders;
create policy "Admins can update orders" on public.orders for update to authenticated using (private.is_admin()) with check (private.is_admin());

-- Seed these four defaults once only; admin-edited rates are not overwritten by reruns.
insert into public.service_catalog (id,title,description,image,rates,rate_note,active,sort_order) values
('computer-services','Computer Services And Repairs','Professional computer repair, installation & data recovery services with 30-day warranty guarantee. Fast, affordable fixes for hardware failures, virus removal, and system optimization by certified local technicians.','/images/computer-services.webp',
'[{"name":"Data Backup","charges":"₹250"},{"name":"System Slow","charges":"Will Quote After Inspection"},{"name":"Power Problems","charges":"Will Quote After Inspection"},{"name":"General Service","charges":"Will Quote After Inspection"},{"name":"Other Troubleshooting","charges":"Will Quote After Inspection"},{"name":"Networking Issues","charges":"Will Quote After Inspection"},{"name":"Hardware Issues","charges":"Will Quote After Inspection"},{"name":"Software Installation","charges":"Will Quote After Inspection"},{"name":"System Upgradation","charges":"Will Quote After Inspection"},{"name":"Other","charges":"Will Quote After Inspection"}]'::jsonb,
'Price may vary after inspection.',true,1),
('cctv-repair','CCTV Repair Service','We provide comprehensive onsite CCTV repair, installation, and AMC services with a 30-day repair warranty. Our comprehensive service includes a 1-year warranty on replaced parts.','/images/cctv-repair.webp',
'[{"name":"Camera Blur","charges":"₹250"},{"name":"DVR Online Issue","charges":"₹350"},{"name":"No Signal","charges":"₹350"},{"name":"No Recording","charges":"₹350"},{"name":"Night Vision Problem","charges":"₹250"},{"name":"Installation","charges":"Will Quote After Inspection"},{"name":"Some Cameras - No Display","charges":"₹250"},{"name":"Other","charges":"Will Quote After Inspection"}]'::jsonb,
'Price may vary after inspection.',true,2),
('printer-repair','Printer Repair And Installation Service','We offer expert computer printer repair and installation services backed by our 30-day warranty guarantee. Our comprehensive service includes a 1-year warranty on replaced parts.','/images/printer-repair.webp',
'[{"name":"Printer Installation","charges":"Will Quote After Inspection"},{"name":"Blank Paper Print","charges":"Will Quote After Inspection"},{"name":"Pages Not Loading","charges":"Will Quote After Inspection"},{"name":"Printer Not Detect","charges":"Will Quote After Inspection"},{"name":"Scanner Problem","charges":"Will Quote After Inspection"},{"name":"Black/Faint Print","charges":"Will Quote After Inspection"},{"name":"Paper Jam","charges":"Will Quote After Inspection"},{"name":"Printer Servicing","charges":"Will Quote After Inspection"},{"name":"Printer Dead","charges":"Will Quote After Inspection"},{"name":"Other","charges":"Will Quote After Inspection"}]'::jsonb,
'Price may vary after inspection.',true,3),
('cartridge-refill','Printer Cartridge Refill Service','We provide professional onsite refill services for all printer toner types with quick turnaround and guaranteed quality.','/images/cartridge-refill.webp',
'[{"name":"Laser Printer Cartridge Refill - HP","charges":"₹300"},{"name":"Laser Printer Cartridge Refill - Brother","charges":"₹350"},{"name":"Laser Printer Cartridge Refill - Canon","charges":"₹300"},{"name":"Laser Printer Cartridge Refill - Other","charges":"₹300"},{"name":"Inktank Printer Cartridge Refill","charges":"₹150"},{"name":"Dot Matrix Printer Ribbon Change","charges":"₹99"},{"name":"Other Printer Service","charges":"₹250"},{"name":"Printer Cartridge Refill Service - Kyocera","charges":"₹599"}]'::jsonb,
'Price may vary after inspection.',true,4)
on conflict (id) do nothing;

-- Least privilege: browser users can only read public catalog/settings and submit requests.
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
grant select on public.site_settings to anon, authenticated;
grant update on public.site_settings to authenticated;
grant select on public.products to anon, authenticated;
grant insert, update, delete on public.products to authenticated;
grant insert on public.orders to anon, authenticated;
grant select, update on public.orders to authenticated;

drop function if exists public.is_admin();
insert into public.site_settings (id) values (1) on conflict (id) do nothing;

-- Secure any legacy enquiries table without deleting its stored rows.
do $migration$
begin
  if to_regclass('public.enquiries') is not null then
    execute 'alter table public.enquiries enable row level security';
    execute 'revoke all on public.enquiries from anon, authenticated';
  end if;
end $migration$;

-- To grant admin rights, create the user first in Supabase Auth, then run:
-- insert into public.admin_users select id from auth.users where email = 'YOUR-ADMIN-EMAIL@example.com' on conflict (user_id) do nothing;
