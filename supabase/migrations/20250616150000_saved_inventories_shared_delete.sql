-- Allow all authenticated users to delete any saved inventory and its items.

DROP POLICY IF EXISTS "inventory_counts_delete" ON public.inventory_counts;
CREATE POLICY "inventory_counts_delete" ON public.inventory_counts
  FOR DELETE TO authenticated
  USING (true);

DROP POLICY IF EXISTS "inventory_items_delete" ON public.inventory_items;
CREATE POLICY "inventory_items_delete" ON public.inventory_items
  FOR DELETE TO authenticated
  USING (true);
