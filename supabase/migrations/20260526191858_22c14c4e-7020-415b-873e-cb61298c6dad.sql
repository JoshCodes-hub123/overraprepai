-- 1) school_students: drop the teacher branch from the broad SELECT policy.
--    Teachers no longer have direct table access; only school owner/admin, the student themselves,
--    the parent, and platform admins can read student rows (which include PII like parent_phone).
DROP POLICY IF EXISTS ss_select ON public.school_students;
CREATE POLICY ss_select ON public.school_students
FOR SELECT TO authenticated
USING (
  is_school_member(school_id, 'owner')
  OR is_school_member(school_id, 'admin')
  OR (user_id = auth.uid())
  OR (parent_user_id = auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- 2) token_transfers: revoke direct read of recipient email from end users.
--    Clients should use the get_my_sent_transfers() / equivalent RPC, which already
--    handles the email exposure rules.
REVOKE SELECT (to_email) ON public.token_transfers FROM authenticated;
REVOKE SELECT (to_email) ON public.token_transfers FROM anon;