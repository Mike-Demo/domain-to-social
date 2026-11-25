CREATE OR REPLACE FUNCTION public.redeem_gift_code(_hash text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE c public.gift_codes; uid uuid := auth.uid(); until_ts timestamptz; p public.plan_tier; n integer;
BEGIN
  IF uid IS NULL THEN RETURN jsonb_build_object('error','Sign in first.'); END IF;
  PERFORM pg_advisory_xact_lock(hashtext('gift:' || uid::text));
  SELECT * INTO c FROM public.gift_codes WHERE code_hash = _hash FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('error','That code is not valid.'); END IF;
  IF c.disabled_at IS NOT NULL THEN RETURN jsonb_build_object('error','That code has been disabled.'); END IF;
  IF c.expires_at IS NOT NULL AND c.expires_at <= now() THEN RETURN jsonb_build_object('error','That code has expired.'); END IF;
  IF c.uses >= c.max_uses THEN RETURN jsonb_build_object('error','That code has been used up.'); END IF;
  IF EXISTS (SELECT 1 FROM public.gift_redemptions WHERE code_id = c.id AND user_id = uid) THEN
    RETURN jsonb_build_object('error','You already redeemed this code.'); END IF;
  p := c.plan;
  IF c.note = 'appsumo' THEN
    SELECT count(*) + 1 INTO n FROM public.gift_redemptions r JOIN public.gift_codes g ON g.id = r.code_id
      WHERE r.user_id = uid AND g.note = 'appsumo' AND g.disabled_at IS NULL;
    IF n > 3 THEN RETURN jsonb_build_object('error','You already stacked 3 codes, the top tier.'); END IF;
    p := CASE n WHEN 1 THEN 'operative' WHEN 2 THEN 'deep_recon' ELSE 'brand_command' END;
  END IF;
  until_ts := CASE WHEN c.duration_days IS NULL THEN NULL ELSE now() + make_interval(days => c.duration_days) END;
  UPDATE public.gift_codes SET uses = uses + 1 WHERE id = c.id;
  INSERT INTO public.gift_redemptions(code_id, user_id, plan, gift_until) VALUES (c.id, uid, p, until_ts);
  RETURN jsonb_build_object('plan', p, 'gift_until', until_ts);
END $function$;