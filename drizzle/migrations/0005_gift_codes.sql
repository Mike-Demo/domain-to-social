CREATE TYPE public.app_role AS ENUM ('admin');
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;
CREATE POLICY "own roles read" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.gift_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code_hash text NOT NULL UNIQUE,
  plan public.plan_tier NOT NULL CHECK (plan <> 'free'),
  duration_days integer CHECK (duration_days IS NULL OR duration_days > 0),
  max_uses integer NOT NULL DEFAULT 1 CHECK (max_uses > 0),
  uses integer NOT NULL DEFAULT 0,
  note text,
  expires_at timestamptz,
  disabled_at timestamptz,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.gift_codes TO service_role;
ALTER TABLE public.gift_codes ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.gift_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code_id uuid NOT NULL REFERENCES public.gift_codes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  plan public.plan_tier NOT NULL,
  gift_until timestamptz,
  redeemed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (code_id, user_id)
);
CREATE INDEX gift_redemptions_user_idx ON public.gift_redemptions(user_id);
GRANT SELECT ON public.gift_redemptions TO authenticated;
GRANT ALL ON public.gift_redemptions TO service_role;
ALTER TABLE public.gift_redemptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own gifts read" ON public.gift_redemptions FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.redeem_gift_code(_hash text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c public.gift_codes; uid uuid := auth.uid(); until_ts timestamptz;
BEGIN
  IF uid IS NULL THEN RETURN jsonb_build_object('error','Sign in first.'); END IF;
  SELECT * INTO c FROM public.gift_codes WHERE code_hash = _hash FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('error','That code is not valid.'); END IF;
  IF c.disabled_at IS NOT NULL THEN RETURN jsonb_build_object('error','That code has been disabled.'); END IF;
  IF c.expires_at IS NOT NULL AND c.expires_at <= now() THEN RETURN jsonb_build_object('error','That code has expired.'); END IF;
  IF c.uses >= c.max_uses THEN RETURN jsonb_build_object('error','That code has been used up.'); END IF;
  IF EXISTS (SELECT 1 FROM public.gift_redemptions WHERE code_id = c.id AND user_id = uid) THEN
    RETURN jsonb_build_object('error','You already redeemed this code.'); END IF;
  until_ts := CASE WHEN c.duration_days IS NULL THEN NULL ELSE now() + make_interval(days => c.duration_days) END;
  UPDATE public.gift_codes SET uses = uses + 1 WHERE id = c.id;
  INSERT INTO public.gift_redemptions(code_id, user_id, plan, gift_until) VALUES (c.id, uid, c.plan, until_ts);
  RETURN jsonb_build_object('plan', c.plan, 'gift_until', until_ts);
END $$;
REVOKE ALL ON FUNCTION public.redeem_gift_code(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.redeem_gift_code(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_create_gift_code(_hash text, _plan public.plan_tier, _days integer, _max_uses integer, _note text, _expires_at timestamptz)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Admins only'; END IF;
  INSERT INTO public.gift_codes(code_hash, plan, duration_days, max_uses, note, expires_at, created_by)
  VALUES (_hash, _plan, CASE WHEN _plan = 'operative' THEN NULL ELSE _days END, _max_uses, _note, _expires_at, auth.uid())
  RETURNING id INTO new_id;
  RETURN new_id;
END $$;

CREATE OR REPLACE FUNCTION public.admin_list_gift_codes()
RETURNS TABLE(id uuid, plan public.plan_tier, duration_days integer, max_uses integer, uses integer, note text, expires_at timestamptz, disabled_at timestamptz, created_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Admins only'; END IF;
  RETURN QUERY SELECT g.id, g.plan, g.duration_days, g.max_uses, g.uses, g.note, g.expires_at, g.disabled_at, g.created_at
    FROM public.gift_codes g ORDER BY g.created_at DESC;
END $$;

CREATE OR REPLACE FUNCTION public.admin_disable_gift_code(_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Admins only'; END IF;
  UPDATE public.gift_codes SET disabled_at = now() WHERE id = _id AND disabled_at IS NULL;
END $$;
REVOKE ALL ON FUNCTION public.admin_create_gift_code(text, public.plan_tier, integer, integer, text, timestamptz) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_list_gift_codes() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_disable_gift_code(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_create_gift_code(text, public.plan_tier, integer, integer, text, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_gift_codes() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_disable_gift_code(uuid) TO authenticated;