
-- 1. school_students: revoke parent contact cols from authenticated; expose via existing RPC
REVOKE SELECT (parent_email, parent_phone) ON public.school_students FROM authenticated;
REVOKE SELECT (parent_email, parent_phone) ON public.school_students FROM anon;

-- 2. schools: revoke internal/admin-only columns from authenticated role
REVOKE SELECT (admin_notes, reviewed_by, rejection_reason, cac_document_url, owner_id_url, approval_letter_url)
  ON public.schools FROM authenticated;
REVOKE SELECT (admin_notes, reviewed_by, rejection_reason, cac_document_url, owner_id_url, approval_letter_url)
  ON public.schools FROM anon;

-- Admin-only RPC to access full school row (incl. internal review fields)
CREATE OR REPLACE FUNCTION public.admin_get_school(_school_id uuid)
RETURNS public.schools
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.schools
   WHERE id = _school_id
     AND public.has_role(auth.uid(), 'admin'::app_role)
$$;
REVOKE EXECUTE ON FUNCTION public.admin_get_school(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_school(uuid) TO authenticated;

-- 3. affiliate_links: admin SELECT policy
DROP POLICY IF EXISTS "Admins can view all affiliate links" ON public.affiliate_links;
CREATE POLICY "Admins can view all affiliate links"
ON public.affiliate_links
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 4. promo_codes: restrict reads to owning tutor + admin
DROP POLICY IF EXISTS "Public reads active codes" ON public.promo_codes;
DROP POLICY IF EXISTS "Tutors read own codes" ON public.promo_codes;
CREATE POLICY "Tutors read own codes"
ON public.promo_codes
FOR SELECT
TO authenticated
USING (auth.uid() = tutor_id OR public.has_role(auth.uid(), 'admin'::app_role));

-- 5. token_transfers: senders can view their own outgoing transfers
DROP POLICY IF EXISTS "Senders see own transfers" ON public.token_transfers;
CREATE POLICY "Senders see own transfers"
ON public.token_transfers
FOR SELECT
TO authenticated
USING (auth.uid() = from_user);
