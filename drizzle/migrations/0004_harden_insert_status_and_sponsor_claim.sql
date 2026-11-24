CREATE OR REPLACE FUNCTION public.force_provider_insert_defaults()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    NEW.status := 'pending';
    NEW.is_verified := false;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_aa_force_provider_insert_defaults ON public.providers;
CREATE TRIGGER trg_aa_force_provider_insert_defaults
  BEFORE INSERT ON public.providers
  FOR EACH ROW EXECUTE FUNCTION public.force_provider_insert_defaults();

CREATE OR REPLACE FUNCTION public.force_agency_insert_defaults()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    NEW.status := 'pending';
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_aa_force_agency_insert_defaults ON public.agencies;
CREATE TRIGGER trg_aa_force_agency_insert_defaults
  BEFORE INSERT ON public.agencies
  FOR EACH ROW EXECUTE FUNCTION public.force_agency_insert_defaults();

REVOKE EXECUTE ON FUNCTION public.force_provider_insert_defaults() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.force_agency_insert_defaults() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.claim_sponsor_lead(_lead_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_email text;
  v_created timestamptz;
  v_confirmed timestamptz;
  v_google boolean;
  v_lead public.sponsor_leads%ROWTYPE;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Faça login para vincular este cadastro.';
  END IF;

  SELECT u.email, u.created_at, u.email_confirmed_at,
         EXISTS (SELECT 1 FROM auth.identities i WHERE i.user_id = u.id AND i.provider = 'google')
    INTO v_email, v_created, v_confirmed, v_google
    FROM auth.users u WHERE u.id = v_user;

  -- E-mail precisa estar comprovado: Google ou confirmação real (não automática).
  IF NOT coalesce(v_google, false)
     AND (v_confirmed IS NULL OR v_confirmed < v_created + interval '10 seconds') THEN
    RAISE EXCEPTION 'Confirme seu e-mail pelo link enviado ou entre com Google para vincular este cadastro.';
  END IF;

  SELECT * INTO v_lead FROM public.sponsor_leads WHERE id = _lead_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cadastro não encontrado.';
  END IF;

  IF v_lead.user_id IS NOT NULL AND v_lead.user_id <> v_user THEN
    RAISE EXCEPTION 'Este cadastro já está vinculado a outra conta.';
  END IF;

  IF lower(coalesce(v_lead.email,'')) <> lower(coalesce(v_email,'')) THEN
    RAISE EXCEPTION 'O e-mail desta conta não confere com o e-mail do cadastro.';
  END IF;

  UPDATE public.sponsor_leads
     SET user_id = v_user, updated_at = now()
   WHERE id = _lead_id;

  RETURN jsonb_build_object('success', true, 'lead_id', _lead_id);
END;
$function$;