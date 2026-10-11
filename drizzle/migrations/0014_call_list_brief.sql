ALTER TABLE public.call_list ADD COLUMN brief text NOT NULL DEFAULT '';
ALTER TABLE public.call_list ADD COLUMN brief_at timestamptz;