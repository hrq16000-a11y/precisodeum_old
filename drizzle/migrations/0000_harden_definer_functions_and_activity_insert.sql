REVOKE EXECUTE ON FUNCTION public.admin_explain_query(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.audit_user_ref_health() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.audit_user_ref_full_detailed() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_review_sponsor_change_request(uuid, text, text) FROM PUBLIC, anon;
DROP POLICY IF EXISTS "authenticated inserts activities" ON public.public_activities;
CREATE POLICY "admins insert activities" ON public.public_activities FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));