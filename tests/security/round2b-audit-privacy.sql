-- Targeted new privacy criterion only; disposable LOCAL PostgreSQL, no full-flow certification.
BEGIN;
SET test.uid='11111111-1111-1111-1111-111111111111';
SET test.role='user';
INSERT INTO profiles(id,full_name,tax_id,whatsapp,phone)
VALUES(auth.uid(),'synthetic old name','synthetic old document','synthetic old whatsapp','synthetic old phone');
DO $$
DECLARE
  f text;
  sid uuid;
  event public.audit_log%ROWTYPE;
  result jsonb;
BEGIN
  FOREACH f IN ARRAY ARRAY['full_name','tax_id','whatsapp','phone','display_name','document'] LOOP
    sid := gen_random_uuid();
    INSERT INTO profile_change_suggestions(id,user_id,field,suggested_value,source,status)
    VALUES(sid,auth.uid(),f,'synthetic sensitive new value','synthetic sensitive source','pending');
    result := resolve_identity_suggestion(sid,'apply');
    SELECT * INTO event FROM audit_log WHERE details->>'suggestion_id'=sid::text;
    IF NOT FOUND OR result->>'status' IS DISTINCT FROM 'applied'
      OR event.user_id IS DISTINCT FROM auth.uid()
      OR event.resource_id IS DISTINCT FROM auth.uid()
      OR event.resource_type IS DISTINCT FROM 'profile'
      OR event.action IS DISTINCT FROM 'identity_suggestion_applied'
      OR event.created_at IS NULL THEN
      RAISE EXCEPTION 'Audit provenance missing for %',f;
    END IF;
    IF event.details IS DISTINCT FROM jsonb_build_object(
      'field',CASE f WHEN 'display_name' THEN 'full_name' WHEN 'document' THEN 'tax_id' ELSE f END,
      'suggestion_id',sid)
      OR event.details::text LIKE '%synthetic sensitive%'
      OR event.details::text LIKE '%synthetic old%' THEN
      RAISE EXCEPTION 'Audit contains sensitive values for %',f;
    END IF;
  END LOOP;
  RAISE NOTICE 'PASS: six identity field/alias cases retain author, target, action, date and field without sensitive values';
END $$;
DO $$
DECLARE
  sid uuid := gen_random_uuid();
  event public.audit_log%ROWTYPE;
  result jsonb;
BEGIN
  INSERT INTO profile_change_suggestions(id,user_id,field,suggested_value,source,status)
  VALUES(sid,auth.uid(),'tax_id','synthetic sensitive document','synthetic sensitive source','pending');
  result := resolve_identity_suggestion(sid,'dismiss');
  SELECT * INTO event FROM audit_log WHERE details->>'suggestion_id'=sid::text;
  IF NOT FOUND OR result->>'status' IS DISTINCT FROM 'dismissed'
    OR event.user_id IS DISTINCT FROM auth.uid()
    OR event.resource_id IS DISTINCT FROM auth.uid()
    OR event.resource_type IS DISTINCT FROM 'profile'
    OR event.action IS DISTINCT FROM 'identity_suggestion_dismissed'
    OR event.created_at IS NULL
    OR event.details IS DISTINCT FROM jsonb_build_object('field','tax_id','suggestion_id',sid) THEN
    RAISE EXCEPTION 'Dismiss audit must retain provenance without sensitive values or source';
  END IF;
  IF (SELECT tax_id FROM profiles WHERE id=auth.uid()) IS DISTINCT FROM 'synthetic sensitive new value' THEN
    RAISE EXCEPTION 'Dismiss changed identity';
  END IF;
  PERFORM resolve_identity_suggestion(sid,'dismiss');
  IF (SELECT count(*) FROM audit_log WHERE details->>'suggestion_id'=sid::text) <> 1 THEN
    RAISE EXCEPTION 'Settled dismissal was audited again';
  END IF;
  RAISE NOTICE 'PASS: dismissal retains provenance, excludes source and values, preserves identity and settled rows';
END $$;
ROLLBACK;