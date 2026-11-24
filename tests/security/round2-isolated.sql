-- Run only against a disposable local database containing copied functions.
-- This is a focused function test, not full application/RLS homologation.
BEGIN;
SET test.uid='11111111-1111-1111-1111-111111111111';
SET test.role='admin';
INSERT INTO sponsors(id,secret) VALUES('22222222-2222-2222-2222-222222222222','preserve');
DO $$
DECLARE f text; n integer:=0; rid uuid;
BEGIN
 FOREACH f IN ARRAY ARRAY['image_url','logo_url','link_url','external_link','phone','whatsapp','short_description','full_description','linked_city','linked_category'] LOOP
  rid:=gen_random_uuid();
  INSERT INTO sponsor_change_requests(id,sponsor_id,status,changes) VALUES(rid,'22222222-2222-2222-2222-222222222222','pending',jsonb_build_object(f,'test-'||f));
  PERFORM admin_review_sponsor_change_request(rid,'approved','isolated');
  IF NOT EXISTS(SELECT 1 FROM sponsors s WHERE (to_jsonb(s)->>f)='test-'||f AND secret='preserve') THEN RAISE EXCEPTION 'Allowed field % failed or protected data changed',f; END IF;
  IF NOT EXISTS(SELECT 1 FROM audit_log WHERE resource_id=rid AND action='sponsor_change_request_approved') THEN RAISE EXCEPTION 'Sponsor audit missing';END IF;
  n:=n+1;
 END LOOP;
 RAISE NOTICE 'PASS: ten allowed sponsor fields and protected data preservation (% fields)',n;
END $$;
DO $$
DECLARE rid uuid:=gen_random_uuid();
BEGIN
 INSERT INTO sponsor_change_requests(id,sponsor_id,status,changes) VALUES(rid,'22222222-2222-2222-2222-222222222222','pending','{"secret":"attack"}');
 BEGIN
  PERFORM admin_review_sponsor_change_request(rid,'approved');
  RAISE EXCEPTION 'Forbidden payload accepted';
 EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
 IF NOT EXISTS(SELECT 1 FROM sponsors WHERE secret='preserve') THEN RAISE EXCEPTION 'Protected sponsor field changed'; END IF;
 RAISE NOTICE 'PASS: forbidden sponsor field remains unchanged';
 IF NOT EXISTS(SELECT 1 FROM sponsor_change_requests WHERE id=rid AND status='pending') THEN RAISE EXCEPTION 'Forbidden payload status changed'; END IF;
END $$;
DO $$
BEGIN
 PERFORM set_config('test.role','user',true);
 BEGIN
  PERFORM admin_review_sponsor_change_request('00000000-0000-0000-0000-000000000000','approved');
  RAISE EXCEPTION 'Non-admin was allowed';
 EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE 'PASS: non-admin rejected'; END;
END $$;
INSERT INTO profiles(id,full_name,tax_id,whatsapp,phone) VALUES('11111111-1111-1111-1111-111111111111','original','protected','protected','protected');
DO $$
DECLARE f text; rid uuid; mapped text;
BEGIN
 FOREACH f IN ARRAY ARRAY['full_name','display_name','tax_id','document','whatsapp','phone'] LOOP
  rid:=gen_random_uuid(); mapped:=CASE f WHEN 'display_name' THEN 'full_name' WHEN 'document' THEN 'tax_id' ELSE f END;
  INSERT INTO profile_change_suggestions(id,user_id,field,suggested_value,status) VALUES(rid,auth.uid(),f,'test-'||f,'pending');
  PERFORM resolve_identity_suggestion(rid,'apply');
  IF NOT EXISTS(SELECT 1 FROM profiles p WHERE id=auth.uid() AND (to_jsonb(p)->>mapped)='test-'||f) THEN RAISE EXCEPTION 'Identity field % failed',f; END IF;
  IF NOT EXISTS(SELECT 1 FROM profile_change_suggestions WHERE id=rid AND status='applied') THEN RAISE EXCEPTION 'Suggestion not persisted'; END IF;
  IF NOT EXISTS(SELECT 1 FROM audit_log WHERE action='identity_suggestion_applied' AND details->>'suggestion_id'=rid::text) THEN RAISE EXCEPTION 'Suggestion audit missing for %', f; END IF;
 END LOOP;
 RAISE NOTICE 'PASS: four identity fields and two aliases persist';
 IF NOT EXISTS(SELECT 1 FROM audit_log WHERE action='identity_suggestion_applied') THEN RAISE EXCEPTION 'Identity audit missing'; END IF;
END $$;
DO $$
DECLARE rid uuid:=gen_random_uuid();
BEGIN
 INSERT INTO profile_change_suggestions(id,user_id,field,suggested_value,status) VALUES(rid,auth.uid(),'staff_role','admin','pending');
 BEGIN
  PERFORM resolve_identity_suggestion(rid,'apply');
  RAISE EXCEPTION 'Forbidden identity field accepted';
 EXCEPTION WHEN raise_exception THEN
  IF SQLERRM NOT LIKE 'field % not allowed for self-apply' THEN RAISE; END IF;
 END;
 IF NOT EXISTS(SELECT 1 FROM profile_change_suggestions WHERE id=rid AND status='pending') THEN RAISE EXCEPTION 'Forbidden suggestion mutated'; END IF;
 RAISE NOTICE 'PASS: forbidden identity field rejected, pending preserved';
END $$;
DO $$
DECLARE rid uuid:=gen_random_uuid();result jsonb;
BEGIN
 INSERT INTO profile_change_suggestions(id,user_id,field,suggested_value,status) VALUES(rid,'33333333-3333-3333-3333-333333333333','full_name','foreign','pending');
 result:=resolve_identity_suggestion(rid,'apply');
 IF result->>'status'<>'not_found' THEN RAISE EXCEPTION 'Other owner suggestion accessible'; END IF;
 RAISE NOTICE 'PASS: another owner suggestion denied';
END $$;
DO $$
DECLARE failures integer:=0;
BEGIN
 IF EXISTS(SELECT 1 FROM sponsor_change_requests WHERE changes ? 'secret' AND status='approved') THEN failures:=failures+1; END IF;
 IF NOT EXISTS(SELECT 1 FROM audit_log WHERE action='identity_suggestion_applied') THEN failures:=failures+1; END IF;
 IF failures>0 THEN RAISE EXCEPTION '% homologation criteria failed; discard this local database',failures; END IF;
END $$;
ROLLBACK;
