-- Promotions (manager offers) + discount_flags (cashier over-discount audit)
-- Also refresh invoice_summary.line_items with discount_pct / discount_amount

-- ---------------------------------------------------------------------------
-- promotions
-- ---------------------------------------------------------------------------
create table if not exists public.promotions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  promo_type text not null check (promo_type in ('max_percent', 'buy_x_get_y')),
  branch_name text,
  item_name text,
  item_category text,
  max_discount_pct numeric(6,2),
  buy_qty integer,
  get_qty integer,
  valid_from date not null,
  valid_to date not null,
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint promotions_item_match_chk check (
    item_name is not null or item_category is not null
  ),
  constraint promotions_max_percent_chk check (
    promo_type <> 'max_percent'
    or (max_discount_pct is not null and max_discount_pct >= 0 and max_discount_pct <= 100)
  ),
  constraint promotions_buy_x_get_y_chk check (
    promo_type <> 'buy_x_get_y'
    or (buy_qty is not null and buy_qty > 0 and get_qty is not null and get_qty > 0)
  ),
  constraint promotions_date_range_chk check (valid_to >= valid_from)
);

create index if not exists idx_promotions_active_dates
  on public.promotions (is_active, valid_from, valid_to);
create index if not exists idx_promotions_branch
  on public.promotions (branch_name);
create index if not exists idx_promotions_item_name
  on public.promotions (item_name);
create index if not exists idx_promotions_item_category
  on public.promotions (item_category);

-- ---------------------------------------------------------------------------
-- discount_flags
-- ---------------------------------------------------------------------------
create table if not exists public.discount_flags (
  id uuid primary key default gen_random_uuid(),
  sales_detail_id bigint references public.sales_details(id) on delete cascade,
  invoice_number text not null,
  seller_name text,
  branch_name text,
  sale_date date,
  item_name text,
  applied_discount_pct numeric(8,4),
  allowed_discount_pct numeric(8,4),
  flag_reason text not null check (
    flag_reason in (
      'over_max_discount',
      'buy_x_get_y_mismatch',
      'no_matching_promo_but_high_discount'
    )
  ),
  promotion_id uuid references public.promotions(id) on delete set null,
  reviewed boolean not null default false,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_discount_flags_invoice
  on public.discount_flags (invoice_number);
create index if not exists idx_discount_flags_sale_date
  on public.discount_flags (sale_date);
create index if not exists idx_discount_flags_branch
  on public.discount_flags (branch_name);
create index if not exists idx_discount_flags_seller
  on public.discount_flags (seller_name);
create index if not exists idx_discount_flags_reviewed
  on public.discount_flags (reviewed);
create index if not exists idx_discount_flags_sales_detail
  on public.discount_flags (sales_detail_id);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.promotions enable row level security;
alter table public.discount_flags enable row level security;

drop policy if exists "promotions_select_authenticated" on public.promotions;
create policy "promotions_select_authenticated"
  on public.promotions
  for select
  to authenticated
  using (true);

drop policy if exists "promotions_insert_super_admin" on public.promotions;
create policy "promotions_insert_super_admin"
  on public.promotions
  for insert
  to authenticated
  with check (public.is_super_admin());

drop policy if exists "promotions_update_super_admin" on public.promotions;
create policy "promotions_update_super_admin"
  on public.promotions
  for update
  to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

drop policy if exists "promotions_delete_super_admin" on public.promotions;
create policy "promotions_delete_super_admin"
  on public.promotions
  for delete
  to authenticated
  using (public.is_super_admin());

drop policy if exists "discount_flags_select_authenticated" on public.discount_flags;
create policy "discount_flags_select_authenticated"
  on public.discount_flags
  for select
  to authenticated
  using (true);

drop policy if exists "discount_flags_insert_super_admin" on public.discount_flags;
create policy "discount_flags_insert_super_admin"
  on public.discount_flags
  for insert
  to authenticated
  with check (public.is_super_admin());

drop policy if exists "discount_flags_update_super_admin" on public.discount_flags;
create policy "discount_flags_update_super_admin"
  on public.discount_flags
  for update
  to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

drop policy if exists "discount_flags_delete_super_admin" on public.discount_flags;
create policy "discount_flags_delete_super_admin"
  on public.discount_flags
  for delete
  to authenticated
  using (public.is_super_admin());

grant select, insert, update, delete on public.promotions to authenticated;
grant select, insert, update, delete on public.discount_flags to authenticated;

-- ---------------------------------------------------------------------------
-- invoice_summary: include discount fields in line_items JSON
-- ---------------------------------------------------------------------------
create or replace view public.invoice_summary
with (security_invoker = true)
as
select
  invoice_number,
  branch_name,
  seller_name,
  min(sale_date) as invoice_date,
  count(*) as line_items_count,
  sum(sold_qty) as total_qty,
  sum(net_sales_amount) as total_net_sales,
  sum(discount_amount) as total_discount,
  sum(returns_amount) as total_returns,
  jsonb_agg(jsonb_build_object(
    'item_name', item_name,
    'item_category', item_category,
    'color', color,
    'size', size,
    'supplier_name', supplier_name,
    'season_name', season_name,
    'qty', sold_qty,
    'unit_price', unit_price,
    'net_amount', net_sales_amount,
    'discount_pct', discount_pct,
    'discount_amount', discount_amount
  )) as line_items,
  max(nullif(trim(customer_mobile), '')) as customer_mobile
from public.sales_details
group by invoice_number, branch_name, seller_name;

grant select on public.invoice_summary to authenticated;
