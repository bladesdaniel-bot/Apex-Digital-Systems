CREATE TABLE public.team_shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  clock_in timestamptz NOT NULL DEFAULT now(),
  last_seen timestamptz NOT NULL DEFAULT now(),
  clock_out timestamptz,
  ended_by text NOT NULL DEFAULT ''
);
CREATE INDEX team_shifts_user_idx ON public.team_shifts (user_id, clock_in DESC);
GRANT SELECT, INSERT, UPDATE ON public.team_shifts TO authenticated;
GRANT ALL ON public.team_shifts TO service_role;
ALTER TABLE public.team_shifts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own or admin read shifts" ON public.team_shifts FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Insert own shift" ON public.team_shifts FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Update own shift" ON public.team_shifts FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.call_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  caller_name text NOT NULL DEFAULT '',
  call_list_id uuid,
  business_name text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  outcome text NOT NULL DEFAULT '',
  called_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX call_log_user_idx ON public.call_log (user_id, called_at DESC);
GRANT SELECT, INSERT ON public.call_log TO authenticated;
GRANT ALL ON public.call_log TO service_role;
ALTER TABLE public.call_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own or admin read calls" ON public.call_log FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Insert own call" ON public.call_log FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

INSERT INTO public.call_log (user_id, caller_name, call_list_id, business_name, phone, outcome, called_at)
SELECT called_by, caller_name, id, business_name, phone, outcome, called_at FROM public.call_list WHERE called_by IS NOT NULL AND called_at IS NOT NULL;