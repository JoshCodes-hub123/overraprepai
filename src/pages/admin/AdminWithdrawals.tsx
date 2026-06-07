import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

export default function AdminWithdrawals() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<'withdrawals' | 'refunds'>('withdrawals');

  const { data } = useQuery({
    queryKey: ['admin-withdrawals'],
    queryFn: async () => {
      const { data: rows } = await supabase
        .from('withdrawal_requests')
        .select('*, profiles!withdrawal_requests_tutor_id_fkey(full_name, tutor_code)')
        .order('created_at', { ascending: false }).limit(100);
      const tutorIds = Array.from(new Set((rows ?? []).map((r: any) => r.tutor_id).filter(Boolean)));
      let emailMap: Record<string, string> = {};
      if (tutorIds.length > 0) {
        const { data: contacts } = await (supabase as any).rpc('admin_get_profile_contacts', { _ids: tutorIds });
        emailMap = Object.fromEntries((contacts ?? []).map((c: any) => [c.id, c.email]));
      }
      return (rows ?? []).map((r: any) => ({
        ...r,
        profiles: { ...(r.profiles ?? {}), email: emailMap[r.tutor_id] ?? null },
      }));
    },
  });

  const { data: refunds = [] } = useQuery({
    queryKey: ['admin-refunds'],
    queryFn: async () => {
      const { data } = await (supabase.from as any)('refund_events')
        .select('*').order('created_at', { ascending: false }).limit(100);
      return data ?? [];
    },
  });

  const update = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from('withdrawal_requests')
        .update({ status, processed_by: user!.id, processed_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-withdrawals'] }); toast.success('Updated'); },
    onError: (e: any) => toast.error(e.message ?? 'Failed'),
  });

  return (
    <div className="container mx-auto p-4 max-w-3xl space-y-4">
      <h1 className="text-2xl font-bold">Withdrawals &amp; refunds</h1>
      <div className="flex gap-1.5">
        {(['withdrawals','refunds'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`text-[12px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-md border ${
              tab === t ? 'bg-amber-500 border-amber-500 text-white' : 'bg-card border-amber-100/70 text-muted-foreground'
            }`}>{t}</button>
        ))}
      </div>
      {tab === 'withdrawals' && <>
      {(data ?? []).map((w: any) => (
        <Card key={w.id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{w.profiles?.full_name ?? '—'} • {w.amount} tokens</CardTitle>
              <Badge variant={w.status === 'paid' ? 'default' : w.status === 'rejected' ? 'destructive' : 'secondary'}>{w.status}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">{w.payout_email ?? w.profiles?.email} • {new Date(w.created_at).toLocaleString()}</p>
          </CardHeader>
          {w.status === 'pending' && (
            <CardContent className="flex gap-2">
              <Button size="sm" onClick={() => update.mutate({ id: w.id, status: 'approved' })}>Approve</Button>
              <Button size="sm" variant="default" onClick={() => update.mutate({ id: w.id, status: 'paid' })}>Mark Paid</Button>
              <Button size="sm" variant="destructive" onClick={() => update.mutate({ id: w.id, status: 'rejected' })}>Reject</Button>
            </CardContent>
          )}
        </Card>
      ))}
      {(data ?? []).length === 0 && <Card><CardContent className="p-6 text-center text-muted-foreground">No withdrawals yet.</CardContent></Card>}
      </>}
      {tab === 'refunds' && <>
        {refunds.length === 0 && <Card><CardContent className="p-6 text-center text-muted-foreground">No refunds recorded.</CardContent></Card>}
        {refunds.map((r: any) => (
          <Card key={r.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{r.paddle_transaction_id ?? r.id.slice(0,8)}</CardTitle>
                <Badge variant="destructive">{((r.amount_cents ?? 0) / 100).toFixed(2)} {r.currency ?? ''}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">{r.reason ?? 'No reason'} • {new Date(r.created_at).toLocaleString()}</p>
            </CardHeader>
          </Card>
        ))}
      </>}
    </div>
  );
}
