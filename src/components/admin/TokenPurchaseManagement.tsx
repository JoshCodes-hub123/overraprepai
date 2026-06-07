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
  Coins,
} from "lucide-react";
import { format } from "date-fns";
import { exportToCsv } from "@/lib/exportCsv";
import { exportToPdf } from "@/lib/exportPdf";
import { ExportButton } from "./ExportButton";

interface PurchaseRequest {
  id: string;
  user_id: string;
  tokens_requested: number;
  amount_paid: number;
  payment_reference: string;
  payment_method: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
  user_email?: string;
  user_name?: string;
}

export function TokenPurchaseManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { logAction } = useAuditLog();
  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const { data: requestsData, error } = await supabase
        .from("token_purchase_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch user details for each request
      if (requestsData) {
        const ids = Array.from(new Set(requestsData.map((r) => r.user_id).filter(Boolean)));
        const { data: contacts } = ids.length
          ? await (supabase as any).rpc("admin_get_profile_contacts", { _ids: ids })
          : { data: [] as any[] };
        const byId = new Map<string, any>((contacts ?? []).map((c: any) => [c.id, c]));
        const requestsWithUsers = requestsData.map((req) => {
          const profile = byId.get(req.user_id);
          return {
            ...req,
            user_email: profile?.email || "Unknown",
            user_name: profile?.full_name || "Unknown User",
          };
        });
        setRequests(requestsWithUsers);
      }
    } catch (error) {
      console.error("Error fetching requests:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (request: PurchaseRequest) => {
    setProcessingId(request.id);

    try {
      // Get user's wallet
      const { data: wallet, error: walletError } = await supabase
        .from("token_wallets")
        .select("id, balance, total_earned")
        .eq("user_id", request.user_id)
        .single();

      if (walletError) throw walletError;

      // Update wallet balance
      const { error: updateError } = await supabase
        .from("token_wallets")
        .update({
          balance: wallet.balance + request.tokens_requested,
          total_earned: wallet.total_earned + request.tokens_requested,
        })
        .eq("id", wallet.id);

      if (updateError) throw updateError;

      // Create transaction record
      const { error: txError } = await supabase
        .from("token_transactions")
        .insert({
          wallet_id: wallet.id,
          amount: request.tokens_requested,
          type: "purchase",
          description: `Purchased ${request.tokens_requested} tokens (₦${request.amount_paid})`,
          reference_id: request.id,
        });

      if (txError) throw txError;

      // Update request status
      const { error: reqError } = await supabase
        .from("token_purchase_requests")
        .update({
          status: "approved",
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", request.id);

      if (reqError) throw reqError;

      // Log audit action
      await logAction({
        action: "approve",
        tableName: "token_purchase_requests",
        recordId: request.id,
        oldData: { status: "pending" },
        newData: { status: "approved", tokens_credited: request.tokens_requested },
      });

      // Send email notification
      if (request.user_email) {
        await sendNotification({
          type: "purchase_confirmation",
          to: request.user_email,
          userId: request.user_id,
          data: {
            tokens: request.tokens_requested,
            amount: request.amount_paid.toLocaleString(),
            reference: request.payment_reference,
            dashboardUrl: `${window.location.origin}/dashboard`,
          },
        });
      }

      toast({
        title: "Request Approved",
        description: `${request.tokens_requested} tokens credited. Email notification sent.`,
      });

      fetchRequests();
    } catch (error) {
      console.error("Error approving request:", error);
      toast({
        title: "Error",
        description: "Failed to approve request",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (request: PurchaseRequest) => {
    setProcessingId(request.id);

    try {
      const { error } = await supabase
        .from("token_purchase_requests")
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
        tableName: "token_purchase_requests",
        recordId: request.id,
        oldData: { status: "pending" },
        newData: { status: "rejected" },
      });

      toast({
        title: "Request Rejected",
        description: "The purchase request has been rejected",
      });

      fetchRequests();
    } catch (error) {
      console.error("Error rejecting request:", error);
      toast({
        title: "Error",
        description: "Failed to reject request",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const filteredRequests = requests.filter(
    (req) =>
      req.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.payment_reference.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pendingCount = requests.filter((r) => r.status === "pending").length;

  const exportColumns = [
    { key: "user_name", label: "User Name" },
    { key: "user_email", label: "Email" },
    { key: "tokens_requested", label: "Tokens" },
    { key: "amount_paid", label: "Amount Paid (₦)" },
    { key: "payment_reference", label: "Reference" },
    { key: "payment_method", label: "Method" },
    { key: "status", label: "Status" },
    { key: "created_at", label: "Date" },
  ];

  const getExportData = () =>
    filteredRequests.map((r) => ({
      ...r,
      created_at: format(new Date(r.created_at), "yyyy-MM-dd HH:mm:ss"),
    }));

  const handleExportCsv = () => {
    exportToCsv(getExportData(), "token-purchases", exportColumns);
  };

  const handleExportPdf = () => {
    exportToPdf(getExportData(), "token-purchases", "Token Purchase Requests Report", exportColumns);
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
            Token Purchase Requests
          </h2>
          {pendingCount > 0 && (
            <p className="text-sm text-muted-foreground">
              {pendingCount} pending request{pendingCount > 1 ? "s" : ""}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or reference"
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
          <Coins className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-foreground font-medium">No purchase requests</p>
          <p className="text-sm text-muted-foreground">
            Token purchase requests will appear here
          </p>
        </div>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Tokens</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Reference</TableHead>
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
                        {request.user_name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {request.user_email}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium text-accent flex items-center gap-1">
                      <Coins className="w-4 h-4" />
                      {request.tokens_requested}
                    </span>
                  </TableCell>
                  <TableCell>₦{request.amount_paid.toLocaleString()}</TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-2 py-1 rounded">
                      {request.payment_reference}
                    </code>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(request.created_at), "MMM d, yyyy HH:mm")}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
                        request.status === "approved"
                          ? "bg-success/10 text-success"
                          : request.status === "rejected"
                          ? "bg-destructive/10 text-destructive"
                          : "bg-accent/10 text-accent"
                      }`}
                    >
                      {request.status === "approved" && (
                        <CheckCircle className="w-3 h-3" />
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
                          {processingId === request.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <XCircle className="w-4 h-4" />
                          )}
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
