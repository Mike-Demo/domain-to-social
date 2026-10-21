CREATE OR REPLACE FUNCTION public.gift_code_is_active(_code_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.gift_codes WHERE id = _code_id AND disabled_at IS NULL); $$;
REVOKE ALL ON FUNCTION public.gift_code_is_active(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.gift_code_is_active(uuid) TO authenticated, service_role;
ALTER POLICY "own gifts read" ON public.gift_redemptions
USING (user_id = auth.uid() AND public.gift_code_is_active(code_id));

CREATE TABLE public.lookup_quota_buckets (
  key text PRIMARY KEY,
  count integer NOT NULL DEFAULT 0,
  reset_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.lookup_quota_buckets TO service_role;
REVOKE ALL ON public.lookup_quota_buckets FROM anon, authenticated;
ALTER TABLE public.lookup_quota_buckets ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.reserve_lookup_quota(_user_id uuid, _hosts text[])
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE ts timestamptz := clock_timestamp(); k text; n integer; b public.lookup_quota_buckets; h text;
BEGIN
  IF _user_id IS NULL OR cardinality(_hosts) IS NULL OR cardinality(_hosts) < 1 OR cardinality(_hosts) > 25 THEN
    RAISE EXCEPTION 'Invalid reservation';
  END IF;
  IF EXISTS (SELECT 1 FROM unnest(_hosts) host WHERE host IS NULL OR host = '' OR length(host) > 253)
     OR (SELECT count(DISTINCT host) FROM unnest(_hosts) host) <> cardinality(_hosts) THEN
    RAISE EXCEPTION 'Invalid hosts';
  END IF;
  -- A shared transaction lock serializes account and global destination reservations across all instances.
  PERFORM pg_advisory_xact_lock(721041, 1);
  k := 'account:' || _user_id::text;
  INSERT INTO public.lookup_quota_buckets(key) VALUES (k) ON CONFLICT DO NOTHING;
  SELECT * INTO b FROM public.lookup_quota_buckets WHERE key = k;
  IF b.reset_at > ts AND b.count + cardinality(_hosts) > 30 THEN RETURN false; END IF;
  FOREACH h IN ARRAY _hosts LOOP
    INSERT INTO public.lookup_quota_buckets(key) VALUES ('target:' || h) ON CONFLICT DO NOTHING;
    SELECT * INTO b FROM public.lookup_quota_buckets WHERE key = 'target:' || h;
    IF b.reset_at > ts AND b.count >= 5 THEN RETURN false; END IF;
  END LOOP;
  UPDATE public.lookup_quota_buckets SET count = CASE WHEN reset_at <= ts THEN cardinality(_hosts) ELSE count + cardinality(_hosts) END,
    reset_at = CASE WHEN reset_at <= ts THEN ts + interval '60 seconds' ELSE reset_at END WHERE key = k;
  FOREACH h IN ARRAY _hosts LOOP
    UPDATE public.lookup_quota_buckets SET count = CASE WHEN reset_at <= ts THEN 1 ELSE count + 1 END,
      reset_at = CASE WHEN reset_at <= ts THEN ts + interval '60 seconds' ELSE reset_at END WHERE key = 'target:' || h;
  END LOOP;
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.reserve_lookup_quota(uuid, text[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_lookup_quota(uuid, text[]) TO service_role;