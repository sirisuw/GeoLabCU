-- Tighten access to internal maintenance records and role assignments

-- 1. equipment_maintenance: replace public read with staff-only read
DROP POLICY IF EXISTS "maint_public_read" ON public.equipment_maintenance;
CREATE POLICY "maint_staff_read" ON public.equipment_maintenance
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'lab_officer'::app_role)
    OR has_role(auth.uid(), 'ta'::app_role)
  );

-- 2. user_roles: add explicit admin-only write policies so role assignment is restricted
DROP POLICY IF EXISTS "user_roles_admin_insert" ON public.user_roles;
CREATE POLICY "user_roles_admin_insert" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "user_roles_admin_update" ON public.user_roles;
CREATE POLICY "user_roles_admin_update" ON public.user_roles
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "user_roles_admin_delete" ON public.user_roles;
CREATE POLICY "user_roles_admin_delete" ON public.user_roles
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
