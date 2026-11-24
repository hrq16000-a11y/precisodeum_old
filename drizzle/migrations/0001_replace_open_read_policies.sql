CREATE OR REPLACE FUNCTION public.user_level_in_use(_level_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE level_id = _level_id)
$$;
REVOKE EXECUTE ON FUNCTION public.user_level_in_use(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_level_in_use(uuid) TO anon, authenticated;

DROP POLICY IF EXISTS "User levels viewable by everyone" ON public.user_levels;
CREATE POLICY "Levels in use or admin readable" ON public.user_levels FOR SELECT
USING (public.user_level_in_use(id) OR public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Assignments viewable by everyone" ON public.ad_slot_assignments;
CREATE POLICY "Active assignments or admin readable" ON public.ad_slot_assignments FOR SELECT
USING (active = true OR public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Chat settings viewable by everyone" ON public.chat_settings;
CREATE POLICY "Chat settings readable by signed-in users" ON public.chat_settings FOR SELECT TO authenticated
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "anyone reads activities" ON public.public_activities;
CREATE POLICY "recent or seed activities readable" ON public.public_activities FOR SELECT
USING (is_seed = true OR created_at > now() - interval '30 days' OR public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Impressions viewable by everyone" ON public.provider_impressions;
CREATE POLICY "Impressions of approved providers readable" ON public.provider_impressions FOR SELECT
USING (EXISTS (SELECT 1 FROM public.providers p WHERE p.id = provider_impressions.provider_id AND p.status = 'approved'));

ALTER FUNCTION public.audit_user_ref_full_detailed() SECURITY INVOKER;
REVOKE EXECUTE ON FUNCTION public.audit_user_ref_full_detailed() FROM PUBLIC, anon;