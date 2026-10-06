ALTER TABLE public.subscriptions DROP CONSTRAINT subscriptions_pkey;
ALTER TABLE public.subscriptions
  ADD COLUMN environment text NOT NULL DEFAULT 'sandbox',
  ADD COLUMN operative_lifetime boolean NOT NULL DEFAULT false,
  ADD COLUMN stripe_customer_id text,
  ADD COLUMN stripe_subscription_id text,
  ADD COLUMN price_id text,
  ADD COLUMN cancel_at_period_end boolean NOT NULL DEFAULT false;
ALTER TABLE public.subscriptions ADD PRIMARY KEY (user_id, environment);
ALTER TABLE public.subscriptions ALTER COLUMN status SET DEFAULT 'none';
UPDATE public.subscriptions SET status = 'none' WHERE plan = 'free';
INSERT INTO public.subscriptions(user_id, environment, status)
  SELECT user_id, 'live', 'none' FROM public.subscriptions WHERE environment = 'sandbox'
  ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles(id, display_name) VALUES (NEW.id, split_part(NEW.email,'@',1)) ON CONFLICT DO NOTHING;
  INSERT INTO public.subscriptions(user_id, environment, status) VALUES (NEW.id, 'sandbox', 'none'), (NEW.id, 'live', 'none') ON CONFLICT DO NOTHING;
  RETURN NEW;
END $$;