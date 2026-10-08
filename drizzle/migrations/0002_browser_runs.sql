CREATE TABLE public.browser_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  domain text NOT NULL,
  run_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX browser_runs_user_time ON public.browser_runs (user_id, run_at DESC);
GRANT SELECT, INSERT ON public.browser_runs TO authenticated;
GRANT ALL ON public.browser_runs TO service_role;
ALTER TABLE public.browser_runs ENABLE ROW LEVEL SECURITY;
-- Insert/read own rows only; no update/delete so users cannot reset their daily cap.
CREATE POLICY "Users read own browser runs" ON public.browser_runs FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users log own browser runs" ON public.browser_runs FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());