-- Add is_official flag to profiles for OverraPrep-official accounts badge
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_official boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS profiles_is_official_idx ON public.profiles(is_official) WHERE is_official = true;