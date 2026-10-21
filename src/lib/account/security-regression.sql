-- Run within a transaction and roll back; fixtures never touch real accounts.
BEGIN;
DO $$
DECLARE uid uuid := gen_random_uuid(); other_uid uuid := gen_random_uuid(); code uuid := gen_random_uuid(); i integer; hosts text[];
BEGIN
  INSERT INTO public.gift_codes(id,code_hash,plan,created_by) VALUES(code,'security-test-' || code,'deep_recon',uid);
  INSERT INTO public.gift_redemptions(code_id,user_id,plan) VALUES(code,uid,'deep_recon');
  PERFORM set_config('request.jwt.claim.sub',uid::text,true);
  SET LOCAL ROLE authenticated;
  IF (SELECT count(*) FROM public.gift_redemptions WHERE code_id=code) <> 1 THEN RAISE EXCEPTION 'Active gift not visible'; END IF;
  RESET ROLE;
  UPDATE public.gift_codes SET disabled_at=now() WHERE id=code;
  SET LOCAL ROLE authenticated;
  IF EXISTS(SELECT 1 FROM public.gift_redemptions WHERE code_id=code) THEN RAISE EXCEPTION 'Disabled gift retained'; END IF;
  RESET ROLE;
  FOR i IN 1..5 LOOP
    IF NOT public.reserve_lookup_quota(uid,ARRAY['test-' || uid || '.example']) THEN RAISE EXCEPTION 'Target quota denied too early'; END IF;
  END LOOP;
  IF public.reserve_lookup_quota(other_uid,ARRAY['test-' || uid || '.example']) THEN RAISE EXCEPTION 'Sixth global target allowed'; END IF;
  SELECT array_agg('batch-' || uid || '-' || x || '.example') INTO hosts FROM generate_series(1,25) x;
  IF NOT public.reserve_lookup_quota(uid,hosts) THEN RAISE EXCEPTION '30 account sites denied too early'; END IF;
  IF public.reserve_lookup_quota(uid,ARRAY['extra-' || uid || '.example']) THEN RAISE EXCEPTION '31st account site allowed'; END IF;
  UPDATE public.lookup_quota_buckets SET reset_at=now()-interval '1 second' WHERE key='account:' || uid OR key='target:test-' || uid || '.example';
  IF NOT public.reserve_lookup_quota(uid,ARRAY['test-' || uid || '.example']) THEN RAISE EXCEPTION 'Expired window did not reset'; END IF;
  SET LOCAL ROLE authenticated;
  BEGIN
    PERFORM public.reserve_lookup_quota(uid,ARRAY['forged.example']);
    RAISE EXCEPTION 'Authenticated user can directly reserve/reset quotas';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  RESET ROLE;
END $$;
ROLLBACK;