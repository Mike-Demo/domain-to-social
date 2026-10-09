CREATE OR REPLACE FUNCTION public.admin_create_gift_code(_hash text, _plan plan_tier, _days integer, _max_uses integer, _note text, _expires_at timestamp with time zone DEFAULT NULL)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE new_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Admins only'; END IF;
  INSERT INTO public.gift_codes(code_hash, plan, duration_days, max_uses, note, expires_at, created_by)
  VALUES (_hash, _plan, CASE WHEN _plan = 'operative' THEN NULL ELSE _days END, _max_uses, _note, _expires_at, auth.uid())
  RETURNING id INTO new_id;
  RETURN new_id;
END $function$