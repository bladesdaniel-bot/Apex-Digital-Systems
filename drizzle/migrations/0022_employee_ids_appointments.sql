CREATE SEQUENCE IF NOT EXISTS public.employee_id_seq START 1001;
GRANT USAGE ON SEQUENCE public.employee_id_seq TO service_role;
ALTER TABLE public.profiles ADD COLUMN employee_id text NOT NULL DEFAULT ('APX-' || nextval('public.employee_id_seq')::text);
CREATE UNIQUE INDEX profiles_employee_id_key ON public.profiles(employee_id);

ALTER TABLE public.call_list
  ADD COLUMN appointment_at timestamptz,
  ADD COLUMN expected_by date,
  ADD COLUMN rep_id uuid,
  ADD COLUMN rep_employee_id text NOT NULL DEFAULT '',
  ADD COLUMN rep_name text NOT NULL DEFAULT '';

ALTER TABLE public.quotes
  ADD COLUMN sales_rep_employee_id text NOT NULL DEFAULT '',
  ADD COLUMN appointment_at timestamptz,
  ADD COLUMN expected_by date;