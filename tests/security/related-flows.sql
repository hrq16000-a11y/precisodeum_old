-- Focused LOCAL function regressions; not full application/RLS certification.
BEGIN;
SET test.uid='11111111-1111-1111-1111-111111111111';
SET test.role='admin';
INSERT INTO sponsors(id,secret) VALUES('22222222-2222-2222-2222-222222222222','preserve');
INSERT INTO profiles(id,full_name) VALUES(auth.uid(),'original');
INSERT INTO sponsor_contacts VALUES('22222222-2222-2222-2222-222222222222',auth.uid());
DO $$
DECLARE payload jsonb; rid uuid; result jsonb;
BEGIN
 FOREACH payload IN ARRAY ARRAY['{}'::jsonb, '{"phone":"changed","secret":"attack"}'::jsonb,
   '{"renewal_requested":true}'::jsonb, '{"phone":"changed","renewal_requested":true}'::jsonb,
   '{"phone":null}'::jsonb, '[]'::jsonb] LOOP
  rid:=gen_random_uuid();
  INSERT INTO sponsor_change_requests(id,sponsor_id,status,changes,requested_by)
  VALUES(rid,'22222222-2222-2222-2222-222222222222','pending',payload,auth.uid());
  BEGIN
   PERFORM admin_review_sponsor_change_request(rid,'approved');
   RAISE EXCEPTION 'Invalid payload accepted: %',payload;
  EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  IF NOT EXISTS(SELECT 1 FROM sponsor_change_requests WHERE id=rid AND status='pending') OR
    EXISTS(SELECT 1 FROM audit_log WHERE resource_id=rid) THEN RAISE EXCEPTION 'Invalid payload mutated state'; END IF;
 END LOOP;
 IF EXISTS(SELECT 1 FROM notifications) THEN RAISE EXCEPTION 'False approval notification'; END IF;
 RAISE NOTICE 'PASS: empty, mixed forbidden, renewal, malformed payloads remain pending without notifications';

 rid:=gen_random_uuid();
 INSERT INTO sponsor_change_requests(id,sponsor_id,status,changes,requested_by)
 VALUES(rid,'22222222-2222-2222-2222-222222222222','pending','{"phone":"updated"}',auth.uid());
 PERFORM admin_review_sponsor_change_request(rid,'approved');
 BEGIN
  PERFORM sponsor_cancel_change_request(rid);
  RAISE EXCEPTION 'Settled approval cancelled';
 EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
 IF NOT EXISTS(SELECT 1 FROM sponsor_change_requests WHERE id=rid AND status='approved') THEN RAISE EXCEPTION 'Settled request changed'; END IF;
 IF (SELECT count(*) FROM notifications)<>1 THEN RAISE EXCEPTION 'Approval notification missing'; END IF;
 RAISE NOTICE 'PASS: approval not cancelled, exactly one notification';

 rid:=gen_random_uuid();
 INSERT INTO profile_change_suggestions(id,user_id,field,suggested_value,status)
 VALUES(rid,auth.uid(),'full_name','changed','pending');
 result:=resolve_identity_suggestion(rid,'dismiss');
 IF result->>'status'<>'dismissed' OR NOT EXISTS(SELECT 1 FROM audit_log WHERE action='identity_suggestion_dismissed' AND details->>'suggestion_id'=rid::text) THEN RAISE EXCEPTION 'Dismiss audit missing'; END IF;
 result:=resolve_identity_suggestion(rid,'apply');
 IF result->>'status'<>'already_resolved' OR NOT EXISTS(SELECT 1 FROM profiles WHERE full_name='original') THEN RAISE EXCEPTION 'Settled suggestion changed'; END IF;
 RAISE NOTICE 'PASS: dismissal audited, settled suggestion preserved';
END $$;

-- Reject audit persistence to prove both mutations roll back rather than claim success.
CREATE FUNCTION public.fail_test_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic audit unavailable'; END $$;
CREATE TRIGGER fail_audit BEFORE INSERT ON audit_log FOR EACH ROW EXECUTE FUNCTION fail_test_audit();
DO $$
DECLARE rid uuid:=gen_random_uuid(); sid uuid:=gen_random_uuid();
BEGIN
 INSERT INTO profile_change_suggestions(id,user_id,field,suggested_value,status) VALUES(rid,auth.uid(),'full_name','must rollback','pending');
 BEGIN
  PERFORM resolve_identity_suggestion(rid,'apply');
  RAISE EXCEPTION 'Audit failure ignored';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM <> 'synthetic audit unavailable' THEN RAISE; END IF; END;
 IF NOT EXISTS(SELECT 1 FROM profiles WHERE full_name='original') OR NOT EXISTS(SELECT 1 FROM profile_change_suggestions WHERE id=rid AND status='pending') THEN RAISE EXCEPTION 'Identity not rolled back'; END IF;
 INSERT INTO sponsor_change_requests(id,sponsor_id,status,changes) VALUES(sid,'22222222-2222-2222-2222-222222222222','pending','{"phone":"must rollback"}');
 BEGIN
  PERFORM admin_review_sponsor_change_request(sid,'approved');
  RAISE EXCEPTION 'Audit failure ignored';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM <> 'synthetic audit unavailable' THEN RAISE; END IF; END;
 IF NOT EXISTS(SELECT 1 FROM sponsors WHERE phone='updated') OR NOT EXISTS(SELECT 1 FROM sponsor_change_requests WHERE id=sid AND status='pending') THEN RAISE EXCEPTION 'Approval not rolled back'; END IF;
 RAISE NOTICE 'PASS: audit failure rolls back profile and sponsor changes';
END $$;
DO $$
DECLARE r record;
BEGIN
 SELECT * INTO r FROM audit_user_ref_full_detailed() WHERE table_name='audit_fixture';
 IF NOT FOUND OR r.total_rows<>2 OR r.filled<>1 OR r.missing<>1 OR r.coverage_pct<>50 OR NOT r.has_index OR r.sample_missing_ids<>ARRAY['55555555-5555-5555-5555-555555555555'] THEN RAISE EXCEPTION 'Detailed audit counts incorrect'; END IF;
 PERFORM set_config('test.role','user',true);
 BEGIN
  PERFORM audit_user_ref_full_detailed();
  RAISE EXCEPTION 'User audit accepted';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'Forbidden' THEN RAISE; END IF; END;
 RAISE NOTICE 'PASS: detailed counts, missing sample, index and admin guard';
END $$;
ROLLBACK;