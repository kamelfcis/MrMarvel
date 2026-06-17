-- inventory_groups: authenticated read, super_admin write

DROP POLICY IF EXISTS "inventory_groups_insert" ON public.inventory_groups;
CREATE POLICY "inventory_groups_insert" ON public.inventory_groups
  FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "inventory_groups_update" ON public.inventory_groups;
CREATE POLICY "inventory_groups_update" ON public.inventory_groups
  FOR UPDATE TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "inventory_groups_delete" ON public.inventory_groups;
CREATE POLICY "inventory_groups_delete" ON public.inventory_groups
  FOR DELETE TO authenticated
  USING (public.is_super_admin());
