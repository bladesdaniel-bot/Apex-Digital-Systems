-- Replace owner@example.com with the owner's email before running on a fresh database.
ALTER TABLE public.profiles ADD COLUMN gender text NOT NULL DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN position text NOT NULL DEFAULT 'telemarketer';
ALTER TABLE public.signup_invites ADD COLUMN position text NOT NULL DEFAULT 'telemarketer';

CREATE OR REPLACE FUNCTION public.handle_new_team_member()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE g text := lower(COALESCE(NEW.raw_user_meta_data->>'gender', ''));
BEGIN
  IF g NOT IN ('male', 'female') THEN g := ''; END IF;
  INSERT INTO public.profiles (id, email, username, gender)
  VALUES (NEW.id, COALESCE(NEW.email, ''), COALESCE(NEW.raw_user_meta_data->>'username', ''), g);
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, CASE WHEN lower(NEW.email) = 'owner@example.com' THEN 'admin'::public.app_role ELSE 'pending'::public.app_role END);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.redeem_signup_code(_code text, _user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE p text;
BEGIN
  UPDATE public.signup_invites SET used_at = now(), used_by = _user_id
  WHERE code = upper(trim(_code)) AND used_at IS NULL AND expires_at > now()
  RETURNING position INTO p;
  IF p IS NOT NULL THEN
    UPDATE public.profiles SET position = p WHERE id = _user_id;
  END IF;
END;
$$;