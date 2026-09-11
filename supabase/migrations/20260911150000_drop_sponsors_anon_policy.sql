-- Public sponsor pages use public.sponsors_public, whose projection excludes PII.
-- Keeping an anon policy on the base table is both unnecessary and misleading.
DROP POLICY IF EXISTS "Anon can view active sponsors public columns" ON public.sponsors;
REVOKE ALL ON TABLE public.sponsors FROM anon;
GRANT SELECT ON TABLE public.sponsors_public TO anon, authenticated;
