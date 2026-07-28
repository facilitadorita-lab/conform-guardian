-- Storage RLS policies for private buckets (writes stay via service_role edge functions)

-- company-verification-evidence: path format {empresa_id}/...
DROP POLICY IF EXISTS "cve_select_member" ON storage.objects;
CREATE POLICY "cve_select_member" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'company-verification-evidence'
    AND public.has_company_membership((storage.foldername(name))[1]::uuid)
  );

DROP POLICY IF EXISTS "cve_insert_admin" ON storage.objects;
CREATE POLICY "cve_insert_admin" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'company-verification-evidence'
    AND public.can_admin_company((storage.foldername(name))[1]::uuid)
  );

DROP POLICY IF EXISTS "cve_update_admin" ON storage.objects;
CREATE POLICY "cve_update_admin" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'company-verification-evidence'
    AND public.can_admin_company((storage.foldername(name))[1]::uuid)
  )
  WITH CHECK (
    bucket_id = 'company-verification-evidence'
    AND public.can_admin_company((storage.foldername(name))[1]::uuid)
  );

DROP POLICY IF EXISTS "cve_delete_admin" ON storage.objects;
CREATE POLICY "cve_delete_admin" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'company-verification-evidence'
    AND public.can_admin_company((storage.foldername(name))[1]::uuid)
  );

-- lgpd-exports: path format {empresa_id}/{export_id}/file.json — access only via edge function signed URLs
-- Deny direct client operations; service_role bypasses RLS
DROP POLICY IF EXISTS "lgpd_select_admin" ON storage.objects;
CREATE POLICY "lgpd_select_admin" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'lgpd-exports'
    AND public.can_admin_company((storage.foldername(name))[1]::uuid)
  );

DROP POLICY IF EXISTS "lgpd_no_insert" ON storage.objects;
CREATE POLICY "lgpd_no_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'lgpd-exports' AND false);

DROP POLICY IF EXISTS "lgpd_no_update" ON storage.objects;
CREATE POLICY "lgpd_no_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'lgpd-exports' AND false)
  WITH CHECK (bucket_id = 'lgpd-exports' AND false);

DROP POLICY IF EXISTS "lgpd_no_delete" ON storage.objects;
CREATE POLICY "lgpd_no_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'lgpd-exports' AND false);
