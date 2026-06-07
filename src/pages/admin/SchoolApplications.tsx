import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import AppScreen from "@/components/app-shell/AppScreen";
import AppListItem from "@/components/app-shell/AppListItem";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { School, Check, X, Loader2, Mail, Bell, Shield, Clock } from "lucide-react";
import { toast } from "sonner";
import { sendNotification } from "@/hooks/useSendNotification";
import { useAuditLog } from "@/hooks/useAuditLog";
import { motion, AnimatePresence } from "framer-motion";

type SchoolRow = {
  id: string;
  name: string;
  state: string | null;
  address: string | null;
  status: string;
  owner_id: string | null;
  principal_name: string | null;
  phone: string | null;
  email: string | null;
  created_at: string;
};

export default function AdminSchoolApplications() {
  const { user, hasRole } = useAuth();
  const { logAction } = useAuditLog();
  const [rows, setRows] = useState<SchoolRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [previewSchool, setPreviewSchool] = useState<SchoolRow | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("schools")
      .select("*")
      .order("created_at", { ascending: false });
    setRows((data as any) || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const act = async (school: SchoolRow, status: "approved" | "rejected") => {
    if (status === "rejected" && !notes[school.id]) {
      return toast.error("Please add reviewer notes for rejection.");
    }
    setBusy(school.id);
    try {
      const { error } = await supabase.from("schools").update({ status }).eq("id", school.id);
      if (error) throw error;

      // Audit log
      await logAction({
        action: status === "approved" ? "approve" : "reject",
        tableName: "schools",
        recordId: school.id,
        oldData: { status: school.status },
        newData: { status, admin_notes: notes[school.id] || null },
      });

      // Look up owner email if not on schools row
      let ownerEmail = school.email;
      let ownerName = school.principal_name;
      if (school.owner_id) {
        const { data: owners } = await (supabase as any).rpc("admin_get_profile_contacts", { _ids: [school.owner_id] });
        const owner = owners?.[0];
        if (owner?.email) ownerEmail = owner.email;
        if (owner?.full_name) ownerName = owner.full_name;
      }

      // Send email + in-app notification (Resend handles email; falls back to in-app)
      if (ownerEmail) {
        await sendNotification({
          type: status === "approved" ? "school_approved" : "school_rejected",
          to: ownerEmail,
          userId: school.owner_id || undefined,
          data: {
            schoolName: school.name,
            ownerName,
            adminNotes: notes[school.id] || null,
            dashboardUrl: `${window.location.origin}/school/dashboard`,
          },
        });
      } else if (school.owner_id) {
        // Fallback in-app only
        await supabase.from("notifications").insert({
          user_id: school.owner_id,
          title: status === "approved" ? "School approved" : "School application update",
          message:
            status === "approved"
              ? `${school.name} has been approved.`
              : `Your application for ${school.name} was not approved. ${notes[school.id] || ""}`,
          type: status === "approved" ? "success" : "warning",
          link: status === "approved" ? "/school/dashboard" : "/school/register",
        });
      }

      toast.success(`School ${status} · notifications sent`);
      load();
    } catch (e: any) {
      toast.error(e.message || "Failed");
    } finally {
      setBusy(null);
    }
  };

  if (!hasRole("admin")) {
    return <AppScreen title="Forbidden"><p className="text-center text-sm text-muted-foreground py-10">Admins only.</p></AppScreen>;
  }

  const pending = rows.filter((r) => r.status === "pending");
  const approved = rows.filter((r) => r.status === "approved");
  const rejected = rows.filter((r) => r.status === "rejected");

  const renderRow = (s: SchoolRow) => (
    <Card key={s.id} variant="elevated" className="p-5">
      <div className="flex items-start justify-between gap-3">
        <AppListItem icon={School} title={s.name} subtitle={`${s.state || "—"} · applied ${new Date(s.created_at).toLocaleDateString()}`} />
        <span className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-1 rounded-full ${
          s.status === "approved" ? "bg-success/15 text-success" :
          s.status === "rejected" ? "bg-destructive/15 text-destructive" :
          "bg-amber-500/15 text-amber-700 dark:text-amber-400"
        }`}>{s.status}</span>
      </div>

      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-muted-foreground">
        {s.address && <div><span className="font-semibold text-foreground">Address:</span> {s.address}</div>}
        {s.principal_name && <div><span className="font-semibold text-foreground">Principal:</span> {s.principal_name}</div>}
        {s.phone && <div><span className="font-semibold text-foreground">Phone:</span> {s.phone}</div>}
        {s.email && <div><span className="font-semibold text-foreground">Email:</span> {s.email}</div>}
      </div>

      {s.status === "pending" && (
        <div className="mt-4 space-y-3">
          <Textarea
            placeholder="Reviewer notes (required to reject, optional to approve)"
            value={notes[s.id] || ""}
            onChange={(e) => setNotes({ ...notes, [s.id]: e.target.value })}
            rows={2}
            className="text-sm"
          />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => act(s, "approved")} disabled={busy === s.id}>
              {busy === s.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4 mr-1" /> Approve</>}
            </Button>
            <Button size="sm" variant="destructive" onClick={() => act(s, "rejected")} disabled={busy === s.id}>
              <X className="w-4 h-4 mr-1" /> Reject
            </Button>
            <Button size="sm" variant="outline" onClick={() => setPreviewSchool(s)}>
              <Bell className="w-4 h-4 mr-1" /> Preview notifications
            </Button>
          </div>
        </div>
      )}
    </Card>
  );

  return (
    <AppScreen title="School applications" subtitle="Review · approve · reject" back>
      <div className="max-w-3xl mx-auto pb-12">
        {/* Stat strip */}
        <div className="grid grid-cols-3 gap-2 mb-5">
          <Stat label="Pending" value={pending.length} icon={Clock} tone="amber" />
          <Stat label="Approved" value={approved.length} icon={Check} tone="success" />
          <Stat label="Rejected" value={rejected.length} icon={X} tone="destructive" />
        </div>

        <Tabs defaultValue="pending">
          <TabsList className="mb-4">
            <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
            <TabsTrigger value="approved">Approved ({approved.length})</TabsTrigger>
            <TabsTrigger value="rejected">Rejected ({rejected.length})</TabsTrigger>
          </TabsList>

          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin text-primary mx-auto mt-12" />
          ) : (
            <>
              <TabsContent value="pending" className="space-y-3">
                {pending.length === 0 ? <Empty msg="No pending applications." /> : pending.map(renderRow)}
              </TabsContent>
              <TabsContent value="approved" className="space-y-3">
                {approved.length === 0 ? <Empty msg="No approved schools yet." /> : approved.map(renderRow)}
              </TabsContent>
              <TabsContent value="rejected" className="space-y-3">
                {rejected.length === 0 ? <Empty msg="No rejected applications." /> : rejected.map(renderRow)}
              </TabsContent>
            </>
          )}
        </Tabs>

        {/* Notification preview drawer */}
        <AnimatePresence>
          {previewSchool && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end md:items-center justify-center p-4"
              onClick={() => setPreviewSchool(null)}
            >
              <motion.div
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 30, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-lg bg-card border border-border rounded-2xl p-5 shadow-2xl"
              >
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="w-4 h-4 text-primary" />
                  <h3 className="font-display font-bold">Notification preview</h3>
                </div>
                <p className="text-xs text-muted-foreground mb-4">
                  {previewSchool.name} — what the owner will receive
                </p>

                <div className="space-y-3">
                  <div className="rounded-xl border border-success/30 bg-success/5 p-3">
                    <div className="flex items-center gap-2 text-xs font-semibold text-success mb-1">
                      <Check className="w-3.5 h-3.5" /> If approved
                    </div>
                    <p className="text-sm font-semibold">School Approved</p>
                    <p className="text-xs text-muted-foreground">{previewSchool.name} has been approved. You can now access the full school management dashboard.</p>
                    <div className="flex items-center gap-1 mt-2 text-[11px] text-muted-foreground">
                      <Mail className="w-3 h-3" /> Email + in-app notification
                    </div>
                  </div>
                  <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3">
                    <div className="flex items-center gap-2 text-xs font-semibold text-destructive mb-1">
                      <X className="w-3.5 h-3.5" /> If rejected
                    </div>
                    <p className="text-sm font-semibold">School Application Update</p>
                    <p className="text-xs text-muted-foreground">
                      Your application for {previewSchool.name} was not approved at this time. {notes[previewSchool.id] || "(reviewer notes required)"}
                    </p>
                  </div>
                </div>

                <Button className="w-full mt-4" variant="outline" onClick={() => setPreviewSchool(null)}>Close</Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AppScreen>
  );
}

const Empty = ({ msg }: { msg: string }) => (
  <div className="text-center py-12 rounded-2xl border border-dashed border-border/60">
    <p className="text-sm text-muted-foreground">{msg}</p>
  </div>
);

const Stat = ({ label, value, icon: Icon, tone }: { label: string; value: number; icon: any; tone: "amber" | "success" | "destructive" }) => {
  const styles = {
    amber: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
    success: "bg-success/10 text-success border-success/20",
    destructive: "bg-destructive/10 text-destructive border-destructive/20",
  }[tone];
  return (
    <div className={`rounded-xl border p-3 ${styles}`}>
      <Icon className="w-4 h-4 mb-1" />
      <p className="text-xl font-display font-bold">{value}</p>
      <p className="text-[10px] uppercase tracking-wider font-semibold opacity-80">{label}</p>
    </div>
  );
};
