CREATE OR REPLACE FUNCTION public.has_saved_lists_access(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions s
    WHERE s.user_id = _user_id AND (
      s.operative_lifetime OR (
        s.plan <> 'free' AND (
          (s.status IN ('active','trialing','past_due') AND (s.current_period_end IS NULL OR s.current_period_end > now()))
          OR (s.status = 'canceled' AND s.current_period_end IS NOT NULL AND s.current_period_end > now())
        )
      )
    )
  ) OR EXISTS (
    SELECT 1 FROM public.gift_redemptions g
    WHERE g.user_id = _user_id AND g.plan <> 'free'
      AND (g.gift_until IS NULL OR g.gift_until > now())
      AND public.gift_code_is_active(g.code_id)
  )
$$;
REVOKE ALL ON FUNCTION public.has_saved_lists_access(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_saved_lists_access(uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "own lists" ON public.lists;
CREATE POLICY "own lists" ON public.lists FOR ALL TO authenticated
  USING (auth.uid() = user_id AND public.has_saved_lists_access(auth.uid()))
  WITH CHECK (auth.uid() = user_id AND public.has_saved_lists_access(auth.uid()));

DROP POLICY IF EXISTS "own items" ON public.list_items;
CREATE POLICY "own items" ON public.list_items FOR ALL TO authenticated
  USING (auth.uid() = user_id AND public.has_saved_lists_access(auth.uid()))
  WITH CHECK (auth.uid() = user_id AND public.has_saved_lists_access(auth.uid())
    AND EXISTS (SELECT 1 FROM public.lists l WHERE l.id = list_items.list_id AND l.user_id = auth.uid()));