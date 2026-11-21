REVOKE SELECT ON TABLE public.mfa_recovery_codes FROM authenticated;
DROP POLICY "Users read own recovery codes" ON public.mfa_recovery_codes;

-- Existing SHA-256 hashes cannot be upgraded without the plaintext codes.
DELETE FROM public.mfa_recovery_codes;
