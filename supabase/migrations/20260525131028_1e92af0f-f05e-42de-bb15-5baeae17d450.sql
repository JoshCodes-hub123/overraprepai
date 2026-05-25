-- Tighten admin UPDATE on withdrawal_requests so admins can only change status/processed fields, not bank/payout details
DROP POLICY IF EXISTS "Admins can update withdrawals" ON public.withdrawal_requests;

CREATE POLICY "Admins can update withdrawal status"
ON public.withdrawal_requests
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  AND tutor_id      = (SELECT tutor_id      FROM public.withdrawal_requests w WHERE w.id = withdrawal_requests.id)
  AND amount        = (SELECT amount        FROM public.withdrawal_requests w WHERE w.id = withdrawal_requests.id)
  AND bank_name     IS NOT DISTINCT FROM (SELECT bank_name     FROM public.withdrawal_requests w WHERE w.id = withdrawal_requests.id)
  AND account_number IS NOT DISTINCT FROM (SELECT account_number FROM public.withdrawal_requests w WHERE w.id = withdrawal_requests.id)
  AND account_name  IS NOT DISTINCT FROM (SELECT account_name  FROM public.withdrawal_requests w WHERE w.id = withdrawal_requests.id)
);