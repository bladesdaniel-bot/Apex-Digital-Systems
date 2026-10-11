ALTER TABLE public.payments DROP CONSTRAINT payments_member_id_fkey;
ALTER TABLE public.payments ADD CONSTRAINT payments_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.members(id) ON DELETE RESTRICT;
ALTER TABLE public.members DROP CONSTRAINT members_status_check;
ALTER TABLE public.members ADD CONSTRAINT members_status_check CHECK (status IN ('active','past_due','canceled','archived'));