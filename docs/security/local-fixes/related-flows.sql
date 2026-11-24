-- LOCAL-ONLY candidate: future behavior, no settled-row updates, grants, policies, or settings.
CREATE OR REPLACE FUNCTION public.admin_review_sponsor_change_request(_id uuid, _decision text, _comment text DEFAULT NULL::text)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_row public.sponsor_change_requests;
  c jsonb;
  v_contact_user uuid;
BEGIN
  IF v_uid IS NULL OR NOT public.has_role(v_uid,'admin') THEN
    RAISE EXCEPTION 'admin required' USING ERRCODE='42501';
  END IF;
  IF _decision IS NULL OR _decision NOT IN ('approved','rejected') THEN
    RAISE EXCEPTION 'invalid decision' USING ERRCODE='22023';
  END IF;
  SELECT * INTO v_row FROM public.sponsor_change_requests WHERE id=_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not found'; END IF;
  IF v_row.status <> 'pending' THEN
    RAISE EXCEPTION 'only pending requests can be reviewed' USING ERRCODE='22023';
  END IF;

  IF _decision = 'approved' THEN
    c := COALESCE(v_row.changes, '{}'::jsonb);
    IF jsonb_typeof(c) <> 'object' OR c = '{}'::jsonb THEN
      RAISE EXCEPTION 'no changes provided' USING ERRCODE='22023';
    END IF;
    IF c ? 'renewal_requested' THEN
      RAISE EXCEPTION 'renewal requires the billing workflow; request remains pending' USING ERRCODE='22023';
    END IF;
    IF EXISTS (SELECT 1 FROM jsonb_each(c) AS e(key,value)
      WHERE e.key <> ALL(ARRAY['image_url','logo_url','link_url','external_link','phone','whatsapp','short_description','full_description','linked_city','linked_category'])
        OR jsonb_typeof(e.value) <> 'string') THEN
      RAISE EXCEPTION 'unsupported sponsor change; request remains pending' USING ERRCODE='22023';
    END IF;
    UPDATE public.sponsors SET
      image_url         = CASE WHEN c ? 'image_url'         THEN c->>'image_url'         ELSE image_url END,
      logo_url          = CASE WHEN c ? 'logo_url'          THEN c->>'logo_url'          ELSE logo_url END,
      link_url          = CASE WHEN c ? 'link_url'          THEN c->>'link_url'          ELSE link_url END,
      external_link     = CASE WHEN c ? 'external_link'     THEN c->>'external_link'     ELSE external_link END,
      phone             = CASE WHEN c ? 'phone'             THEN c->>'phone'             ELSE phone END,
      whatsapp          = CASE WHEN c ? 'whatsapp'          THEN c->>'whatsapp'          ELSE whatsapp END,
      short_description = CASE WHEN c ? 'short_description' THEN c->>'short_description' ELSE short_description END,
      full_description  = CASE WHEN c ? 'full_description'  THEN c->>'full_description'  ELSE full_description END,
      linked_city       = CASE WHEN c ? 'linked_city'       THEN c->>'linked_city'       ELSE linked_city END,
      linked_category   = CASE WHEN c ? 'linked_category'   THEN c->>'linked_category'   ELSE linked_category END
    WHERE id = v_row.sponsor_id
      AND c ?| ARRAY['image_url','logo_url','link_url','external_link','phone','whatsapp','short_description','full_description','linked_city','linked_category'];
    IF NOT FOUND THEN RAISE EXCEPTION 'sponsor not found' USING ERRCODE='22023'; END IF;
  END IF;

  UPDATE public.sponsor_change_requests
  SET status = _decision, admin_comment = _comment, reviewed_by = v_uid, reviewed_at = now()
  WHERE id = _id;

  INSERT INTO public.audit_log(action, resource_type, resource_id, user_id, details)
  VALUES ('sponsor_change_request_' || _decision, 'sponsor_change_request', _id, v_uid,
    jsonb_build_object('sponsor_id', v_row.sponsor_id, 'comment', _comment, 'changes', v_row.changes, 'snapshot', v_row.current_snapshot));

  FOR v_contact_user IN SELECT user_id FROM public.sponsor_contacts WHERE sponsor_id = v_row.sponsor_id LOOP
    INSERT INTO public.notifications(user_id, type, title, message, link)
    VALUES (v_contact_user, 'sponsor_change_request',
      CASE WHEN _decision='approved' THEN 'Alteração aprovada' ELSE 'Alteração rejeitada' END,
      COALESCE(_comment, CASE WHEN _decision='approved' THEN 'Suas alterações foram aplicadas.' ELSE 'Suas alterações foram rejeitadas.' END),
      '/sponsor-panel/editar');
  END LOOP;
END;
$function$;

CREATE OR REPLACE FUNCTION public.resolve_identity_suggestion(_suggestion_id uuid, _action text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_row public.profile_change_suggestions%ROWTYPE;
  v_f text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  IF _action IS NULL OR _action NOT IN ('apply','dismiss') THEN RAISE EXCEPTION 'invalid action'; END IF;

  SELECT * INTO v_row FROM public.profile_change_suggestions
  WHERE id = _suggestion_id AND user_id = v_uid FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('status','not_found'); END IF;
  IF v_row.status <> 'pending' THEN
    RETURN jsonb_build_object('status','already_resolved', 'previous', v_row.status);
  END IF;

  IF _action = 'dismiss' THEN
    UPDATE public.profile_change_suggestions SET status = 'dismissed', resolved_at = now() WHERE id = _suggestion_id;
    INSERT INTO public.audit_log(user_id, action, resource_type, resource_id, details)
    VALUES(v_uid, 'identity_suggestion_dismissed', 'profile', v_uid,
      jsonb_build_object('suggestion_id', v_row.id, 'field', v_row.field, 'source', v_row.source));
    RETURN jsonb_build_object('status','dismissed');
  END IF;

  v_f := lower(v_row.field);
  IF v_f = 'document' THEN v_f := 'tax_id'; END IF;
  IF v_f = 'display_name' THEN v_f := 'full_name'; END IF;
  IF v_f IS NULL OR v_f NOT IN ('full_name','tax_id','whatsapp','phone') THEN
    RAISE EXCEPTION 'field % not allowed for self-apply', v_f;
  END IF;

  PERFORM 1 FROM public.profiles WHERE id = v_uid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'profile not found'; END IF;

  UPDATE public.profiles SET
    full_name = CASE WHEN v_f = 'full_name' THEN v_row.suggested_value ELSE full_name END,
    tax_id    = CASE WHEN v_f = 'tax_id'    THEN v_row.suggested_value ELSE tax_id END,
    whatsapp  = CASE WHEN v_f = 'whatsapp'  THEN v_row.suggested_value ELSE whatsapp END,
    phone     = CASE WHEN v_f = 'phone'     THEN v_row.suggested_value ELSE phone END,
    updated_at = now()
  WHERE id = v_uid;

  UPDATE public.profile_change_suggestions SET status = 'applied', resolved_at = now() WHERE id = _suggestion_id;

  INSERT INTO public.audit_log (user_id, action, resource_type, resource_id, details)
    VALUES (v_uid, 'identity_suggestion_applied', 'profile', v_uid,
      jsonb_build_object('field', v_f, 'suggestion_id', v_row.id));

  RETURN jsonb_build_object('status','applied', 'field', v_f, 'new_value', v_row.suggested_value);
END;
$function$;


CREATE OR REPLACE FUNCTION public.audit_user_ref_full_detailed()
 RETURNS TABLE(table_name text, data_type text, total_rows bigint, filled bigint, missing bigint, coverage_pct numeric, has_index boolean, sample_missing_ids text[], is_sponsor_table boolean)
 LANGUAGE plpgsql
 SECURITY INVOKER
 STABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  rec record;
  q text;
  res record;
  samples text[];
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  FOR rec IN
    SELECT c.table_name AS tname, c.data_type AS dtype
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON t.table_schema=c.table_schema AND t.table_name=c.table_name
    WHERE c.table_schema='public' AND c.column_name='user_ref' AND t.table_type='BASE TABLE'
    ORDER BY c.table_name
  LOOP
    q := format(
      'SELECT COUNT(*)::bigint AS total, COUNT(user_ref)::bigint AS filled FROM public.%I',
      rec.tname
    );
    EXECUTE q INTO res;

    -- Exemplos de IDs com user_ref nulo (até 3, se houver coluna id)
    samples := ARRAY[]::text[];
    IF EXISTS(
      SELECT 1 FROM information_schema.columns AS col
      WHERE col.table_schema='public' AND col.table_name=rec.tname AND col.column_name='id'
    ) THEN
      EXECUTE format(
          'SELECT COALESCE(array_agg(id::text),''{}''::text[]) FROM (SELECT id FROM public.%I WHERE user_ref IS NULL LIMIT 3) s',
          rec.tname
        ) INTO samples;
    END IF;

    table_name := rec.tname;
    data_type := rec.dtype;
    total_rows := res.total;
    filled := res.filled;
    missing := res.total - res.filled;
    coverage_pct := CASE WHEN res.total>0 THEN ROUND((res.filled::numeric/res.total)*100, 2) ELSE NULL END;
    has_index := EXISTS (
      SELECT 1 FROM pg_class t2
      JOIN pg_index ix ON t2.oid=ix.indrelid
      JOIN pg_attribute a ON a.attrelid=t2.oid AND a.attnum=ANY(ix.indkey)
      JOIN pg_namespace n ON n.oid=t2.relnamespace
      WHERE n.nspname='public' AND t2.relname=rec.tname AND a.attname='user_ref'
    );
    sample_missing_ids := samples;
    is_sponsor_table := rec.tname IN ('sponsor_leads','sponsor_assets','sponsors');
    RETURN NEXT;
  END LOOP;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sponsor_cancel_change_request(_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_row public.sponsor_change_requests;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'auth required' USING ERRCODE='28000'; END IF;

  SELECT * INTO v_row FROM public.sponsor_change_requests WHERE id = _id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not found'; END IF;

  IF v_row.requested_by IS DISTINCT FROM v_uid AND NOT public.has_role(v_uid,'admin') THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE='42501';
  END IF;

  IF v_row.status <> 'pending' THEN
    RAISE EXCEPTION 'only pending requests can be cancelled' USING ERRCODE='22023';
  END IF;

  UPDATE public.sponsor_change_requests
  SET status='cancelled', reviewed_by=v_uid, reviewed_at=now()
  WHERE id=_id;

  INSERT INTO public.audit_log(action, resource_type, resource_id, user_id, details)
  VALUES ('sponsor_change_request_cancelled', 'sponsor_change_request', _id, v_uid,
          jsonb_build_object('sponsor_id', v_row.sponsor_id, 'storage_paths', v_row.storage_paths));
END;
$function$;

CREATE OR REPLACE FUNCTION public.sponsor_submit_change_request(_sponsor_id uuid, _changes jsonb, _storage_paths text[] DEFAULT '{}'::text[])
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_allowed text[] := ARRAY[
    'image_url','logo_url','link_url','external_link',
    'phone','whatsapp','short_description','full_description',
    'linked_city','linked_category','renewal_requested'
  ];
  v_key text;
  v_snapshot jsonb;
  v_recent_count int;
  v_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'auth required' USING ERRCODE = '28000';
  END IF;

  -- Ownership check
  IF NOT EXISTS (
    SELECT 1 FROM public.sponsor_contacts
    WHERE sponsor_id = _sponsor_id AND user_id = v_uid
  ) AND NOT public.has_role(v_uid, 'admin') THEN
    RAISE EXCEPTION 'not authorized for this sponsor' USING ERRCODE = '42501';
  END IF;

  IF _changes IS NULL OR jsonb_typeof(_changes) <> 'object' OR _changes = '{}'::jsonb THEN
    RAISE EXCEPTION 'no changes provided' USING ERRCODE = '22023';
  END IF;

  -- Whitelist enforcement
  FOR v_key IN SELECT jsonb_object_keys(_changes) LOOP
    IF NOT (v_key = ANY(v_allowed)) THEN
      RAISE EXCEPTION 'field % is not editable via self-service', v_key USING ERRCODE = '42501';
    END IF;
  END LOOP;

  IF jsonb_typeof(_changes) <> 'object' OR _changes = '{}'::jsonb THEN
    RAISE EXCEPTION 'no changes provided' USING ERRCODE = '22023';
  END IF;

  -- Rate limit: max 5 requests in 24h
  SELECT count(*) INTO v_recent_count
  FROM public.sponsor_change_requests
  WHERE sponsor_id = _sponsor_id
    AND created_at > now() - interval '24 hours';
  IF v_recent_count >= 5 THEN
    RAISE EXCEPTION 'rate limit: max 5 change requests per 24h' USING ERRCODE = '53400';
  END IF;

  -- Single pending lock (also enforced by unique index — friendlier error)
  IF EXISTS (
    SELECT 1 FROM public.sponsor_change_requests
    WHERE sponsor_id = _sponsor_id AND status = 'pending'
  ) THEN
    RAISE EXCEPTION 'there is already a pending change request' USING ERRCODE = '23505';
  END IF;

  -- Snapshot current values for the keys being changed
  SELECT jsonb_build_object(
    'image_url', image_url,
    'logo_url', logo_url,
    'link_url', link_url,
    'external_link', external_link,
    'phone', phone,
    'whatsapp', whatsapp,
    'short_description', short_description,
    'full_description', full_description,
    'linked_city', linked_city,
    'linked_category', linked_category
  ) INTO v_snapshot
  FROM public.sponsors WHERE id = _sponsor_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'sponsor not found' USING ERRCODE = '22023'; END IF;

  INSERT INTO public.sponsor_change_requests(sponsor_id, requested_by, changes, current_snapshot, storage_paths)
  VALUES (_sponsor_id, v_uid, _changes, COALESCE(v_snapshot, '{}'::jsonb), COALESCE(_storage_paths, '{}'::text[]))
  RETURNING id INTO v_id;

  -- Audit
  INSERT INTO public.audit_log(action, resource_type, resource_id, user_id, details)
  VALUES ('sponsor_change_request_submitted', 'sponsor_change_request', v_id, v_uid,
          jsonb_build_object('sponsor_id', _sponsor_id, 'fields', (SELECT array_agg(k) FROM jsonb_object_keys(_changes) k)));

  -- Notify admins
  INSERT INTO public.notifications(user_id, type, title, message, link)
  SELECT ur.user_id, 'sponsor_change_request', 'Nova solicitação de patrocinador',
         'Há uma alteração aguardando revisão.', '/admin/sponsor-change-requests'
  FROM public.user_roles ur
  WHERE ur.role = 'admin'
  ON CONFLICT DO NOTHING;

  RETURN v_id;
END;
$function$;
