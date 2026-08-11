-- Allow super_admin to delete sales_details rows from the admin UI

drop policy if exists "sales_details_delete_super_admin" on public.sales_details;
create policy "sales_details_delete_super_admin"
  on public.sales_details
  for delete
  to authenticated
  using (public.is_super_admin());

grant delete on public.sales_details to authenticated;
