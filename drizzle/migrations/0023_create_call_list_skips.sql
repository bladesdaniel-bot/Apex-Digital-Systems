CREATE TABLE public.call_list_skips (
  user_id uuid not null,
  call_list_id uuid not null references public.call_list(id) on delete cascade,
  skipped_at timestamp with time zone not null default now(),
  primary key (user_id, call_list_id)
);
GRANT SELECT, INSERT, DELETE ON public.call_list_skips TO authenticated;
GRANT ALL ON public.call_list_skips TO service_role;
ALTER TABLE public.call_list_skips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own skips" ON public.call_list_skips FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users add own skips" ON public.call_list_skips FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users remove own skips" ON public.call_list_skips FOR DELETE TO authenticated USING (user_id = auth.uid());