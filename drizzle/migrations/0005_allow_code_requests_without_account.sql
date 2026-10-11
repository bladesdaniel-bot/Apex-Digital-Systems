ALTER TABLE public.signup_invites ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE public.signup_invites ADD COLUMN IF NOT EXISTS requester_email text NOT NULL DEFAULT '';