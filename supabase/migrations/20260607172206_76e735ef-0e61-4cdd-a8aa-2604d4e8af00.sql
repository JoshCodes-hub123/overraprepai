ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS organisation_name TEXT,
  ADD COLUMN IF NOT EXISTS organisation_logo_url TEXT;