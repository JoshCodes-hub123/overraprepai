import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, Download, FileSpreadsheet, RefreshCcw, History, AlertCircle } from "lucide-react";
import * as XLSX from "xlsx";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

interface ImportLog {
  id: string;
  admin_id: string;
  file_name: string;
  file_size_bytes: number | null;
  file_type: string | null;
  course_codes: string[];
  total_rows: number;
  imported_questions: number;
  imported_quizzes: number;
  rejected_rows: number;
  status: string;
  rejected_payload: any;
  notes: string | null;
  created_at: string;
}

interface AdminImportHistoryProps {
  onRetry?: () => void;
  refreshKey?: number;
}

export function AdminImportHistory({ onRetry, refreshKey = 0 }: AdminImportHistoryProps) {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-import-logs", refreshKey],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("admin_import_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data || []) as ImportLog[];
    },
    staleTime: 30_000,
  });

  const downloadRejected = (log: ImportLog) => {
    if (!log.rejected_payload || !Array.isArray(log.rejected_payload) || log.rejected_payload.length === 0) {
      toast.info("No rejected rows saved for this import");
      return;
    }
    const rows = log.rejected_payload.map((r: any) => ({
      row_number: r.row,
      reason: r.reason,
      missing_fields: (r.missing_fields || []).join(", "),
      ...(r.data || {}),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Rejected Rows");
    const stamp = new Date(log.created_at).toISOString().slice(0, 10);
    XLSX.writeFile(wb, `rejected_${log.file_name.replace(/\.[^.]+$/, "")}_${stamp}.xlsx`);
    toast.success("Rejected rows downloaded");
  };

  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <History className="w-4 h-4 text-amber-600 shrink-0" />
          <h3 className="font-semibold text-base">Import history</h3>
          <Badge variant="outline" className="text-[10px]">Admin</Badge>
        </div>
        <Button size="sm" variant="ghost" onClick={() => refetch()}>
          <RefreshCcw className="w-3.5 h-3.5 mr-1" /> Refresh
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading recent imports…</p>
      ) : !data || data.length === 0 ? (
        <p className="text-sm text-muted-foreground">No imports yet. Your bulk uploads will appear here.</p>
      ) : (
        <ScrollArea className="max-h-[420px]">
          <ul className="space-y-2">
            {data.map((log) => (
              <li
                key={log.id}
                className="rounded-lg border bg-card p-3 flex items-start gap-3 hover:bg-muted/30 transition"
              >
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-amber-100 text-amber-700">
                  <FileSpreadsheet className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <p className="font-medium text-sm truncate" title={log.file_name}>
                      {log.file_name}
                    </p>
                    <Badge
                      variant={log.status === "success" ? "outline" : "destructive"}
                      className="text-[10px] shrink-0"
                    >
                      {log.status}
                    </Badge>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1.5 text-[11px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                    </span>
                    <span>·</span>
                    <span>{log.imported_quizzes} quiz{log.imported_quizzes !== 1 ? "zes" : ""}</span>
                    <span>·</span>
                    <span>{log.imported_questions} questions</span>
                    {log.rejected_rows > 0 && (
                      <>
                        <span>·</span>
                        <span className="text-rose-600 inline-flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" /> {log.rejected_rows} rejected
                        </span>
                      </>
                    )}
                  </div>
                  {log.course_codes.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {log.course_codes.slice(0, 6).map((c) => (
                        <Badge key={c} variant="secondary" className="text-[10px] font-mono">
                          {c}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {log.notes && (
                    <p className="mt-1.5 text-[11px] text-muted-foreground line-clamp-2" title={log.notes}>
                      {log.notes}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {log.rejected_rows > 0 && (
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => downloadRejected(log)}>
                        <Download className="w-3 h-3 mr-1" />
                        Rejected rows
                      </Button>
                    )}
                    {onRetry && (
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={onRetry}>
                        <RefreshCcw className="w-3 h-3 mr-1" />
                        Re-upload
                      </Button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </ScrollArea>
      )}
    </Card>
  );
}

export default AdminImportHistory;
