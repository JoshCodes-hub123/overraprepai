import { useState, type ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import type { OpportunityCategory } from "@/hooks/useOpportunities";
import { Lightbulb } from "lucide-react";
import { toast } from "sonner";

const CATS: OpportunityCategory[] = ["internship","scholarship","hackathon","competition","tech_program","career"];

interface Props {
  trigger?: ReactNode;
}

/**
 * Opportunity submission dialog.
 * - Admins & tutors publish immediately.
 * - Students (and any other authenticated user) submit a draft for admin review.
 */
export function SuggestOpportunityDialog({ trigger }: Props) {
  const { user, hasRole } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const isAdmin = hasRole("admin");
  const isTutor = hasRole("tutor");
  const canPublishDirectly = isAdmin || isTutor;

  const [form, setForm] = useState({
    title: "", organization: "", category: "internship" as OpportunityCategory,
    description: "", deadline: "", apply_url: "", university: "",
  });

  const submit = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Sign in required");
      const payload: any = {
        title: form.title.trim(),
        organization: form.organization.trim(),
        category: form.category,
        description: form.description.trim(),
        deadline: form.deadline || null,
        apply_url: form.apply_url.trim() || null,
        university: form.university.trim() || null,
        posted_by: user.id,
        status: canPublishDirectly ? "published" : "draft",
      };
      const { error } = await (supabase.from as any)("opportunities").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(
        canPublishDirectly
          ? "Opportunity published"
          : "Suggestion sent for admin review. Thank you!"
      );
      setOpen(false);
      setForm({ title: "", organization: "", category: "internship", description: "", deadline: "", apply_url: "", university: "" });
      qc.invalidateQueries({ queryKey: ["opportunities"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to submit"),
  });

  const valid = form.title.trim() && form.organization.trim() && form.description.trim();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white">
            <Lightbulb className="h-4 w-4 mr-1.5" />
            {canPublishDirectly ? "Post opportunity" : "Suggest opportunity"}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {canPublishDirectly ? "Post an opportunity" : "Suggest an opportunity"}
          </DialogTitle>
          <DialogDescription>
            {canPublishDirectly
              ? "Goes live to all students immediately."
              : "Your submission will be reviewed by an admin before being published."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Input placeholder="Title (e.g. MTN Scholarship 2026)" value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <Input placeholder="Organization (e.g. MTN Foundation)" value={form.organization}
            onChange={(e) => setForm({ ...form, organization: e.target.value })} />
          <select className="w-full border rounded-md h-10 px-3 text-sm bg-background"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value as OpportunityCategory })}>
            {CATS.map((c) => <option key={c} value={c}>{c.replace("_", " ")}</option>)}
          </select>
          <Textarea placeholder="What's the opportunity about? Eligibility, benefits, how to apply…"
            rows={4} value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <Input type="date" value={form.deadline}
            onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
          <Input placeholder="Apply URL (https://…)" value={form.apply_url}
            onChange={(e) => setForm({ ...form, apply_url: e.target.value })} />
          <Input placeholder="University (optional, e.g. FUTA)" value={form.university}
            onChange={(e) => setForm({ ...form, university: e.target.value })} />
          <Button onClick={() => submit.mutate()} disabled={submit.isPending || !valid}
            className="w-full bg-amber-500 hover:bg-amber-600 text-white">
            {submit.isPending
              ? "Submitting…"
              : canPublishDirectly ? "Publish now" : "Send for review"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default SuggestOpportunityDialog;