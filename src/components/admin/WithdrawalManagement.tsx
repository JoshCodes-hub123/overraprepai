import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { sendNotification } from "@/hooks/useSendNotification";
import { useAuditLog } from "@/hooks/useAuditLog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  Banknote,
  CreditCard,
} from "lucide-react";
import { format } from "date-fns";
import { exportToCsv } from "@/lib/exportCsv";
import { exportToPdf } from "@/lib/exportPdf";
import { ExportButton } from "./ExportButton";

interface WithdrawalRequest {
  id: string;
  tutor_id: string;
  amount: number;
  bank_name: string;
  account_number: string;
  account_name: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
  tutor_email?: string;
  tutor_name?: string;
}

export function WithdrawalManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { logAction } = useAuditLog();
  const [requests, setRequests] = useState<WithdrawalRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const { data: requestsData, error } = await supabase
        .from("withdrawal_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (requestsData) {
        const ids = Array.from(new Set(requestsData.map((r) => r.tutor_id).filter(Boolean)));
        const { data: contacts } = ids.length
          ? await (supabase as any).rpc("admin_get_profile_contacts", { _ids: ids })
          : { data: [] as any[] };
        const byId = new Map<string, any>((contacts ?? []).map((c: any) => [c.id, c]));
        const requestsWithTutors = requestsData.map((req) => {
          const profile = byId.get(req.tutor_id);
          return {
            ...req,
            tutor_email: profile?.email || "Unknown",
            tutor_name: profile?.full_name || "Unknown Tutor",
          };
        });
        setRequests(requestsWithTutors);
      }
    } catch (error) {
      console.error("Error fetching requests:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (request: WithdrawalRequest) => {
    setProcessingId(request.id);

    try {
      const { error } = await supabase
        .from("withdrawal_requests")
        .update({
          status: "approved",
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", request.id);

      if (error) throw error;

      // Log audit action
      await logAction({
        action: "approve",
        tableName: "withdrawal_requests",
        recordId: request.id,
        oldData: { status: "pending" },
        newData: { status: "approved" },
      });

      // Send email notification
      if (request.tutor_email) {
        await sendNotification({
          type: "withdrawal_approved",
          to: request.tutor_email,
          userId: request.tutor_id,
          data: {
            name: request.tutor_name,
            amount: request.amount.toLocaleString(),
            bankName: request.bank_name,
            accountNumber: request.account_number,
          },
        });
      }

      toast({
        title: "Withdrawal Approved",
        description: "Email sent to tutor. Please proceed to transfer the funds.",
      });

      fetchRequests();
    } catch (error) {
      console.error("Error approving withdrawal:", error);
      toast({
        title: "Error",
        description: "Failed to approve withdrawal",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleComplete = async (request: WithdrawalRequest) => {
    setProcessingId(request.id);

    try {
      // Deduct from tutor's wallet
      const { data: wallet, error: walletError } = await supabase
        .from("token_wallets")
        .select("id, balance, total_spent")
        .eq("user_id", request.tutor_id)
        .single();

      if (walletError) throw walletError;

      const { error: updateError } = await supabase
        .from("token_wallets")
        .update({
          balance: wallet.balance - request.amount,
          total_spent: wallet.total_spent + request.amount,
        })
        .eq("id", wallet.id);

      if (updateError) throw updateError;

      // Create transaction record
      const { error: txError } = await supabase
        .from("token_transactions")
        .insert({
          wallet_id: wallet.id,
          amount: -request.amount,
          type: "withdrawal",
          description: `Withdrawal of ${request.amount} tokens`,
          reference_id: request.id,
        });

      if (txError) throw txError;

      // Mark as completed
      const { error } = await supabase
        .from("withdrawal_requests")
        .update({
          status: "completed",
        })
        .eq("id", request.id);

      if (error) throw error;

      toast({
        title: "Withdrawal Completed",
        description: "The withdrawal has been marked as completed",
      });

      fetchRequests();
    } catch (error) {
      console.error("Error completing withdrawal:", error);
      toast({
        title: "Error",
        description: "Failed to complete withdrawal",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (request: WithdrawalRequest) => {
    setProcessingId(request.id);

    try {
      const { error } = await supabase
        .from("withdrawal_requests")
        .update({
          status: "rejected",
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", request.id);

      if (error) throw error;

      // Log audit action
      await logAction({
        action: "reject",
        tableName: "withdrawal_requests",
        recordId: request.id,
        oldData: { status: "pending" },
        newData: { status: "rejected" },
      });

      // Send email notification
      if (request.tutor_email) {
        await sendNotification({
          type: "withdrawal_rejected",
          to: request.tutor_email,
          userId: request.tutor_id,
          data: {
            name: request.tutor_name,
            amount: request.amount.toLocaleString(),
            adminNotes: request.admin_notes,
          },
        });
      }

      toast({
        title: "Withdrawal Rejected",
        description: "Email notification sent to tutor.",
      });

      fetchRequests();
    } catch (error) {
      console.error("Error rejecting withdrawal:", error);
      toast({
        title: "Error",
        description: "Failed to reject withdrawal",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const filteredRequests = requests.filter(
    (req) =>
      req.tutor_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.tutor_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.account_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pendingCount = requests.filter((r) => r.status === "pending").length;
  const approvedCount = requests.filter((r) => r.status === "approved").length;

  const exportColumns = [
    { key: "tutor_name", label: "Tutor Name" },
    { key: "tutor_email", label: "Email" },
    { key: "amount", label: "Amount (Tokens)" },
    { key: "bank_name", label: "Bank" },
    { key: "account_number", label: "Account Number" },
    { key: "account_name", label: "Account Name" },
    { key: "status", label: "Status" },
    { key: "created_at", label: "Date" },
  ];

  const getExportData = () =>
    filteredRequests.map((r) => ({
      ...r,
      created_at: format(new Date(r.created_at), "yyyy-MM-dd HH:mm:ss"),
    }));

  const handleExportCsv = () => {
    exportToCsv(getExportData(), "withdrawal-requests", exportColumns);
  };

  const handleExportPdf = () => {
    exportToPdf(getExportData(), "withdrawal-requests", "Withdrawal Requests Report", exportColumns);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-bold text-foreground">
            Withdrawal Requests
          </h2>
          <div className="flex gap-4 text-sm text-muted-foreground">
            {pendingCount > 0 && (
              <span>{pendingCount} pending</span>
            )}
            {approvedCount > 0 && (
              <span className="text-accent">{approvedCount} approved (awaiting transfer)</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search tutors"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <ExportButton
            onExportCsv={handleExportCsv}
            onExportPdf={handleExportPdf}
            disabled={filteredRequests.length === 0}
          />
        </div>
      </div>

      {filteredRequests.length === 0 ? (
        <div className="bg-muted/30 rounded-xl p-8 text-center">
          <Banknote className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-foreground font-medium">No withdrawal requests</p>
          <p className="text-sm text-muted-foreground">
            Tutor withdrawal requests will appear here
          </p>
        </div>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tutor</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Bank Details</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRequests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium text-foreground">
                        {request.tutor_name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {request.tutor_email}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium text-success flex items-center gap-1">
                      <Banknote className="w-4 h-4" />
                      {request.amount} tokens
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <p className="font-medium text-foreground">
                        {request.account_name}
                      </p>
                      <p className="text-muted-foreground">
                        {request.bank_name} • {request.account_number}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(request.created_at), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
                        request.status === "completed"
                          ? "bg-success/10 text-success"
                          : request.status === "approved"
                          ? "bg-primary/10 text-primary"
                          : request.status === "rejected"
                          ? "bg-destructive/10 text-destructive"
                          : "bg-accent/10 text-accent"
                      }`}
                    >
                      {request.status === "completed" && (
                        <CheckCircle className="w-3 h-3" />
                      )}
                      {request.status === "approved" && (
                        <CreditCard className="w-3 h-3" />
                      )}
                      {request.status === "rejected" && (
                        <XCircle className="w-3 h-3" />
                      )}
                      {request.status === "pending" && (
                        <Clock className="w-3 h-3" />
                      )}
                      {request.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    {request.status === "pending" && (
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReject(request)}
                          disabled={processingId === request.id}
                        >
                          <XCircle className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleApprove(request)}
                          disabled={processingId === request.id}
                        >
                          {processingId === request.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Approve
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                    {request.status === "approved" && (
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handleComplete(request)}
                        disabled={processingId === request.id}
                      >
                        {processingId === request.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <CreditCard className="w-4 h-4 mr-1" />
                            Mark Paid
                          </>
                        )}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
