-- 039_products_vendus_integration.sql
-- Campos para integração com Vendus e controlo de canal online

alter table public.products
  add column if not exists vendus_product_id text,
  add column if not exists vendus_sku text,
  add column if not exists vendus_sync_status text default 'never_synced',
  add column if not exists vendus_last_synced_at timestamptz,
  add column if not exists is_visible_online boolean default false,
  add column if not exists online_name text,
  add column if not exists online_description text,
  add column if not exists online_image_url text,
  add column if not exists online_sort_order integer;

create index if not exists idx_products_vendus_product_id
  on public.products (vendus_product_id);

