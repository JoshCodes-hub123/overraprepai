import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Shield, CheckCircle2, XCircle, Loader2, ArrowLeft } from 'lucide-react';
import { useAuditLog } from '@/hooks/useAuditLog';
import { AdminPersistentHeader } from '@/components/admin/AdminPersistentHeader';
import { Link } from 'react-router-dom';

export default function AdminModeration() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { logAction } = useAuditLog();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const { data } = useQuery({
    queryKey: ['mod-queue'],
    queryFn: async () => {
      const { data } = await supabase.from('moderation_queue').select('*').order('created_at', { ascending: false }).limit(100);
      return data ?? [];
    },
  });

  const review = useMutation({
    mutationFn: async ({ id, status, action }: { id: string; status: string; action: 'remove' | 'approve'; row: any }) => {
      const target = (await supabase.from('moderation_queue').select('*').eq('id', id).single()).data;
      if (action === 'remove' && target) {
        const tableMap: Record<string, string> = { comment: 'quiz_comments', message: 'chat_messages', post: 'community_posts', quiz: 'quizzes' };
        const tbl = tableMap[target.content_type];
        if (tbl) {
          // soft hide if column exists, else delete
          if (tbl === 'quiz_comments' || tbl === 'community_posts') {
            await supabase.from(tbl).update({ is_hidden: true } as any).eq('id', target.content_id);
          } else {
            await supabase.from(tbl as any).delete().eq('id', target.content_id);
          }
        }
      }
      const { error } = await supabase.from('moderation_queue')
        .update({ status, reviewed_by: user!.id, reviewed_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
      // Audit log
      await logAction({
        action: action === 'remove' ? 'reject' : 'approve',
        tableName: 'moderation_queue',
        recordId: id,
        oldData: { status: target?.status, content_type: target?.content_type, content_id: target?.content_id },
        newData: { status, action },
      });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['mod-queue'] }); toast.success('Reviewed'); },
    onError: (e: any) => toast.error(e.message ?? 'Failed'),
  });

  const pending = (data ?? []).filter((r: any) => r.status === 'pending');
  const allPendingSelected = pending.length > 0 && pending.every((r: any) => selected.has(r.id));

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected(allPendingSelected ? new Set() : new Set(pending.map((r: any) => r.id)));
  };

  const runBulk = async (kind: 'approve' | 'reject') => {
    if (selected.size === 0) {
      toast.error('Select at least one item');
      return;
    }
    setBulkBusy(true);
    let ok = 0;
    let failed = 0;
    for (const id of selected) {
      try {
        await review.mutateAsync({
          id,
          status: kind === 'reject' ? 'removed' : 'approved',
          action: kind === 'reject' ? 'remove' : 'approve',
          row: null,
        });
        ok++;
      } catch {
        failed++;
      }
    }
    setBulkBusy(false);
    setSelected(new Set());
    toast.success(`Bulk ${kind}: ${ok} done${failed ? `, ${failed} failed` : ''}`);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <AdminPersistentHeader showNavStrip={true} />
      <div className="container mx-auto p-4 max-w-3xl space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Link to="/admin" className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <h1 className="text-2xl font-bold flex items-center gap-2"><Shield className="w-6 h-6"/>Moderation Queue</h1>
          </div>
          <div className="text-xs text-muted-foreground">All decisions are audit-logged</div>
        </div>

      {pending.length > 0 && (
        <Card>
          <CardContent className="p-3 flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Checkbox checked={allPendingSelected} onCheckedChange={toggleAll} id="select-all" />
              <label htmlFor="select-all" className="text-sm cursor-pointer">
                Select all pending ({pending.length})
              </label>
            </div>
            <div className="flex-1" />
            <Badge variant="outline">{selected.size} selected</Badge>
            <Button
              size="sm"
              variant="outline"
              disabled={bulkBusy || selected.size === 0}
              onClick={() => runBulk('approve')}
            >
              {bulkBusy ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <CheckCircle2 className="w-4 h-4 mr-1" />}
              Bulk approve
            </Button>
            <Button
              size="sm"
              variant="destructive"
              disabled={bulkBusy || selected.size === 0}
              onClick={() => runBulk('reject')}
            >
              {bulkBusy ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <XCircle className="w-4 h-4 mr-1" />}
              Bulk reject
            </Button>
          </CardContent>
        </Card>
      )}

      {(data ?? []).length === 0 && <Card><CardContent className="p-6 text-center text-muted-foreground">Queue is empty.</CardContent></Card>}
      {(data ?? []).map((r: any) => (
        <Card key={r.id}>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {r.status === 'pending' && (
                  <Checkbox
                    checked={selected.has(r.id)}
                    onCheckedChange={() => toggle(r.id)}
                  />
                )}
                <CardTitle className="text-base capitalize">{r.content_type}</CardTitle>
              </div>
              <Badge variant={r.status === 'pending' ? 'secondary' : r.status === 'removed' ? 'destructive' : 'default'}>{r.status}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">{r.reason} • {new Date(r.created_at).toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">ID: {r.content_id}</p>
          </CardHeader>
          {r.status === 'pending' && (
            <CardContent className="flex gap-2">
              <Button size="sm" variant="destructive" onClick={() => review.mutate({ id: r.id, status: 'removed', action: 'remove', row: r })}>Remove content</Button>
              <Button size="sm" variant="outline" onClick={() => review.mutate({ id: r.id, status: 'approved', action: 'approve', row: r })}>Keep</Button>
            </CardContent>
          )}
        </Card>
      ))}
      </div>
    </div>
  );
}
