-- Allow super_admin to append sales_details rows from the admin UI

drop policy if exists "sales_details_insert_super_admin" on public.sales_details;
create policy "sales_details_insert_super_admin"
  on public.sales_details
  for insert
  to authenticated
  with check (public.is_super_admin());

grant insert on public.sales_details to authenticated;
