-- sales_details: line-item sales from Excel import + analytics views

create table if not exists public.sales_details (
  id bigserial primary key,
  branch_name text,
  item_category text,
  sales_amount numeric(12,2),
  net_sales_qty integer,
  unit_price numeric(12,2),
  net_sales_amount numeric(12,2),
  season_name text,
  sale_date date,
  seller_name text,
  discount_pct numeric(6,4),
  supplier_name text,
  sold_qty integer,
  discount_amount numeric(12,2),
  customer_mobile text,
  returns_amount numeric(12,2),
  returns_pct numeric(6,4),
  item_name text,
  invoice_number text not null,
  returned_qty integer,
  color text,
  size text,
  return_duration_days integer,
  created_at timestamptz default now()
);

create index if not exists idx_sales_details_invoice_number on public.sales_details(invoice_number);
create index if not exists idx_sales_details_branch on public.sales_details(branch_name);
create index if not exists idx_sales_details_sale_date on public.sales_details(sale_date);
create index if not exists idx_sales_details_seller on public.sales_details(seller_name);

-- Invoice summary with line-item JSON
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
    'qty', sold_qty,
    'unit_price', unit_price,
    'net_amount', net_sales_amount
  )) as line_items
from public.sales_details
group by invoice_number, branch_name, seller_name;

-- إحصائيات لكل فرع
create or replace view public.branch_stats
with (security_invoker = true)
as
select
  branch_name,
  count(distinct invoice_number) as invoices_count,
  sum(sold_qty) as total_qty_sold,
  sum(net_sales_amount) as total_net_sales,
  sum(returns_amount) as total_returns,
  round(avg(net_sales_amount), 2) as avg_line_value
from public.sales_details
group by branch_name
order by total_net_sales desc;

-- إحصائيات لكل بائع
create or replace view public.seller_stats
with (security_invoker = true)
as
select
  seller_name,
  branch_name,
  count(distinct invoice_number) as invoices_count,
  sum(net_sales_amount) as total_net_sales,
  sum(discount_amount) as total_discount
from public.sales_details
group by seller_name, branch_name
order by total_net_sales desc;

-- إحصائيات لكل مجموعة صنف
create or replace view public.category_stats
with (security_invoker = true)
as
select
  item_category,
  sum(sold_qty) as total_qty_sold,
  sum(net_sales_amount) as total_net_sales,
  sum(returned_qty) as total_returned_qty,
  round(100.0 * sum(returned_qty) / nullif(sum(sold_qty), 0), 2) as return_rate_pct
from public.sales_details
group by item_category
order by total_net_sales desc;

-- إحصائيات لكل موسم
create or replace view public.season_stats
with (security_invoker = true)
as
select
  season_name,
  count(distinct invoice_number) as invoices_count,
  sum(net_sales_amount) as total_net_sales
from public.sales_details
group by season_name
order by total_net_sales desc;

alter table public.sales_details enable row level security;

drop policy if exists "sales_details_select_authenticated" on public.sales_details;
create policy "sales_details_select_authenticated"
  on public.sales_details
  for select
  to authenticated
  using (true);

-- Writes are service-role only (import script); no insert/update/delete policies for authenticated/anon.

grant select on public.sales_details to authenticated;
grant select on public.invoice_summary to authenticated;
grant select on public.branch_stats to authenticated;
grant select on public.seller_stats to authenticated;
grant select on public.category_stats to authenticated;
grant select on public.season_stats to authenticated;
