DROP TRIGGER IF EXISTS on_auth_user_owner_admin ON auth.users;
DROP FUNCTION IF EXISTS public.grant_owner_admin();