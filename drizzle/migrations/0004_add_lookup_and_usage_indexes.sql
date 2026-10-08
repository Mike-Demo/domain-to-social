CREATE INDEX IF NOT EXISTS lookups_user_checked_idx ON public.lookups (user_id, checked_at DESC);
CREATE INDEX IF NOT EXISTS browser_runs_user_run_idx ON public.browser_runs (user_id, run_at DESC);