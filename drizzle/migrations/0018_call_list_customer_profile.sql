ALTER TABLE public.call_list
  ADD COLUMN contact_name text NOT NULL DEFAULT '',
  ADD COLUMN contact_role text NOT NULL DEFAULT '',
  ADD COLUMN needs text NOT NULL DEFAULT '',
  ADD COLUMN interested_package text NOT NULL DEFAULT '',
  ADD COLUMN budget text NOT NULL DEFAULT '',
  ADD COLUMN follow_up_date date,
  ADD COLUMN profile_notes text NOT NULL DEFAULT '',
  ADD COLUMN profile_updated_by_name text NOT NULL DEFAULT '',
  ADD COLUMN profile_updated_at timestamptz;