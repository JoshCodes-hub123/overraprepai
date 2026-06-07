import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import { Shield, Clock, User, Database } from "lucide-react";
import { exportToCsv } from "@/lib/exportCsv";
import { exportToPdf } from "@/lib/exportPdf";
import { ExportButton } from "./ExportButton";

interface AuditLog {
  id: string;
  admin_id: string;
  action: string;
  table_name: string;
  record_id: string;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  created_at: string;
}

const getActionBadgeVariant = (action: string) => {
  switch (action) {
    case "approve":
      return "default";
    case "reject":
      return "destructive";
    case "update":
      return "secondary";
    case "delete":
      return "destructive";
    case "view":
      return "outline";
    default:
      return "secondary";
  }
};

export const AuditLogs = () => {
  const [tableFilter, setTableFilter] = useState<string>("all");

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["audit-logs", tableFilter],
    queryFn: async () => {
      let query = supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (tableFilter !== "all") {
        query = query.eq("table_name", tableFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as AuditLog[];
    },
  });

  const { data: adminProfiles = {} } = useQuery({
    queryKey: ["admin-profiles", logs],
    queryFn: async () => {
      const adminIds = [...new Set(logs.map((log) => log.admin_id))];
      if (adminIds.length === 0) return {};

      const { data, error } = await (supabase as any).rpc("admin_get_profile_contacts", { _ids: adminIds });

      if (error) throw error;

      return (data ?? []).reduce((acc: any, profile: any) => {
        acc[profile.id] = profile;
        return acc;
      }, {} as Record<string, { full_name: string | null; email: string }>);
    },
    enabled: logs.length > 0,
  });

  const getAdminName = (adminId: string) => {
    const profile = adminProfiles[adminId];
    return profile?.full_name || profile?.email || "Unknown Admin";
  };

  const exportColumns = [
    { key: "created_at", label: "Time" },
    { key: "admin_name", label: "Admin" },
    { key: "action", label: "Action" },
    { key: "table_name", label: "Table" },
    { key: "record_id", label: "Record ID" },
  ];

  const getExportData = () =>
    logs.map((log) => ({
      ...log,
      admin_name: getAdminName(log.admin_id),
      created_at: format(new Date(log.created_at), "yyyy-MM-dd HH:mm:ss"),
    }));

  const handleExportCsv = () => {
    exportToCsv(getExportData(), "audit-logs", exportColumns);
  };

  const handleExportPdf = () => {
    exportToPdf(getExportData(), "audit-logs", "Audit Logs Report", exportColumns);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <CardTitle>Audit Logs</CardTitle>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton
            onExportCsv={handleExportCsv}
            onExportPdf={handleExportPdf}
            disabled={logs.length === 0}
          />
          <Select value={tableFilter} onValueChange={setTableFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by table" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tables</SelectItem>
              <SelectItem value="tutor_applications">Tutor Applications</SelectItem>
              <SelectItem value="withdrawal_requests">Withdrawals</SelectItem>
              <SelectItem value="token_purchase_requests">Token Purchases</SelectItem>
              <SelectItem value="user_roles">User Roles</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-muted-foreground">Loading audit logs...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Shield className="h-12 w-12 mb-4 opacity-50" />
            <p>No audit logs found</p>
          </div>
        ) : (
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Admin</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Table</TableHead>
                  <TableHead>Record ID</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-sm">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                        {format(new Date(log.created_at), "MMM d, yyyy HH:mm")}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="truncate max-w-[150px]">
                          {getAdminName(log.admin_id)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getActionBadgeVariant(log.action)}>
                        {log.action}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Database className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm">{log.table_name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                        {log.record_id.substring(0, 8)}...
                      </code>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};
