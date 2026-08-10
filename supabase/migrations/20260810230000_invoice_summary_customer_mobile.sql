-- Add customer_mobile to invoice_summary aggregation (appended column; CREATE OR REPLACE cannot reorder)

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
  )) as line_items,
  max(nullif(trim(customer_mobile), '')) as customer_mobile
from public.sales_details
group by invoice_number, branch_name, seller_name;
