REVOKE INSERT, UPDATE ON public.lists FROM authenticated, anon;
REVOKE INSERT, UPDATE ON public.list_items FROM authenticated, anon;
GRANT ALL ON public.lists TO service_role;
GRANT ALL ON public.list_items TO service_role;
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;