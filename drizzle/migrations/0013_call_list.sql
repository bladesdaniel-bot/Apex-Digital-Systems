CREATE TABLE public.call_list (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id text NOT NULL UNIQUE,
  business_name text NOT NULL,
  phone text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  website text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT '',
  area text NOT NULL DEFAULT '',
  found_by uuid,
  found_at timestamptz NOT NULL DEFAULT now(),
  called_by uuid,
  caller_name text NOT NULL DEFAULT '',
  called_at timestamptz,
  outcome text NOT NULL DEFAULT ''
);
GRANT SELECT, INSERT, UPDATE ON public.call_list TO authenticated;
GRANT ALL ON public.call_list TO service_role;
ALTER TABLE public.call_list ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team reads call list" ON public.call_list FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'telemarketer'));
CREATE POLICY "Team adds to call list" ON public.call_list FOR INSERT TO authenticated
  WITH CHECK ((public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'telemarketer')) AND found_by = auth.uid());
CREATE POLICY "Team marks calls" ON public.call_list FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'telemarketer'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'telemarketer'));
CREATE INDEX call_list_called_idx ON public.call_list (called_at);