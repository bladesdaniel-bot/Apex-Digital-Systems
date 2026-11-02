ALTER TABLE public.call_list
  ADD COLUMN no_answer_at timestamptz,
  ADD COLUMN no_answer_by uuid,
  ADD COLUMN no_answer_name text NOT NULL DEFAULT '',
  ADD COLUMN no_answer_count integer NOT NULL DEFAULT 0;