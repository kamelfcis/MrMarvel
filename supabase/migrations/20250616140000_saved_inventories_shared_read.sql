-- Allow all authenticated users to view all saved inventories and their items.
-- Delete/update remain restricted to record owner or super_admin (unchanged).

DROP POLICY IF EXISTS "inventory_counts_select" ON public.inventory_counts;
CREATE POLICY "inventory_counts_select" ON public.inventory_counts
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "inventory_items_select" ON public.inventory_items;
CREATE POLICY "inventory_items_select" ON public.inventory_items
  FOR SELECT TO authenticated
  USING (true);

-- Allow reading profile names for inventory creator embed (profiles:created_by_id)
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT TO authenticated
  USING (true);
