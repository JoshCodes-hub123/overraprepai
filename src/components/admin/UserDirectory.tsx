import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, Users, Coins, Banknote, Mail, Phone } from "lucide-react";
import { format } from "date-fns";
import { exportToCsv } from "@/lib/exportCsv";
import { exportToPdf } from "@/lib/exportPdf";
import { ExportButton } from "./ExportButton";

interface UserRow {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  university: string | null;
  department: string | null;
  academic_path: string | null;
  ai_token_balance: number;
  created_at: string;
  last_seen_at: string | null;
  total_tokens_bought: number;
  total_amount_spent_ngn: number;
  purchase_count: number;
  total_users: number;
}

const PAGE_SIZE = 50;
const ngn = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });

export function UserDirectory() {
  const [rows, setRows] = useState<UserRow[]>([]);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => { setDebounced(search.trim()); setPage(0); }, 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data, error } = await (supabase as any).rpc("admin_list_users", {
        _search: debounced || null,
        _limit: PAGE_SIZE,
        _offset: page * PAGE_SIZE,
      });
      if (cancelled) return;
      if (error) {
        console.error("[UserDirectory] rpc error", error);
        setRows([]);
      } else {
        setRows(data ?? []);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [debounced, page]);

  const totalUsers = rows[0]?.total_users ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalUsers / PAGE_SIZE));

  // Aggregates across the *current page* — useful for at-a-glance comparison.
  const aggregates = useMemo(() => {
    const buyers = rows.filter((r) => r.total_amount_spent_ngn > 0);
    const totalSpent = buyers.reduce((s, r) => s + Number(r.total_amount_spent_ngn || 0), 0);
    const totalTokens = buyers.reduce((s, r) => s + Number(r.total_tokens_bought || 0), 0);
    return { buyers: buyers.length, totalSpent, totalTokens };
  }, [rows]);

  const handleExport = () => {
    exportToCsv(
      rows.map((r) => ({
        Name: r.full_name || "",
        Email: r.email || "",
        Phone: r.phone || "",
        University: r.university || "",
        Department: r.department || "",
        Path: r.academic_path || "",
        TokenBalance: r.ai_token_balance,
        TokensBought: r.total_tokens_bought,
        AmountSpentNGN: Number(r.total_amount_spent_ngn || 0),
        Purchases: r.purchase_count,
        Joined: r.created_at,
        LastSeen: r.last_seen_at || "",
      })),
      `users_${new Date().toISOString().slice(0, 10)}`,
    );
  };

  return (
    <div className="space-y-4">
      {/* Stat row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total users" value={totalUsers.toLocaleString()} icon={Users} />
        <StatCard label="Paying users (page)" value={aggregates.buyers.toString()} icon={Banknote} />
        <StatCard label="Tokens bought (page)" value={aggregates.totalTokens.toLocaleString()} icon={Coins} />
        <StatCard label="Revenue (page)" value={ngn.format(aggregates.totalSpent)} icon={Banknote} />
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" /> All users
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Name, email, phone, tokens bought and total amount spent across manual top-ups and Paddle purchases.
            </p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, email, phone, school…"
                className="pl-9"
              />
            </div>
            <ExportButton onExport={handleExport} disabled={!rows.length} label="Export CSV" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : rows.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">No users found.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>School / Path</TableHead>
                    <TableHead className="text-right">Tokens bought</TableHead>
                    <TableHead className="text-right">Amount spent</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead>Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => {
                    const isBuyer = Number(r.total_amount_spent_ngn) > 0;
                    return (
                      <TableRow key={r.id} className={isBuyer ? "bg-amber-50/40" : undefined}>
                        <TableCell>
                          <div className="font-medium leading-tight">{r.full_name || "—"}</div>
                          <div className="text-[11px] text-muted-foreground font-mono">{r.id.slice(0, 8)}…</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-xs">
                            <Mail className="w-3 h-3 text-muted-foreground" />
                            <span className="truncate max-w-[180px]" title={r.email || ""}>{r.email || "—"}</span>
                          </div>
                          {r.phone && (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                              <Phone className="w-3 h-3" /> {r.phone}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="text-xs">{r.university || "—"}</div>
                          <div className="text-[11px] text-muted-foreground">
                            {r.department || "—"}{r.academic_path ? ` · ${r.academic_path}` : ""}
                          </div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {r.total_tokens_bought > 0 ? (
                            <Badge variant="outline" className="border-amber-300 text-amber-700 bg-amber-50">
                              <Coins className="w-3 h-3 mr-1" /> {r.total_tokens_bought}
                            </Badge>
                          ) : <span className="text-muted-foreground">0</span>}
                        </TableCell>
                        <TableCell className="text-right tabular-nums font-semibold">
                          {isBuyer ? (
                            <span className="text-emerald-700">{ngn.format(Number(r.total_amount_spent_ngn))}</span>
                          ) : <span className="text-muted-foreground font-normal">—</span>}
                          {r.purchase_count > 0 && (
                            <div className="text-[10px] text-muted-foreground font-normal">
                              {r.purchase_count} purchase{r.purchase_count > 1 ? "s" : ""}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{r.ai_token_balance ?? 0}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {format(new Date(r.created_at), "dd MMM yyyy")}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {totalUsers > PAGE_SIZE && (
            <div className="flex items-center justify-between px-4 py-3 border-t text-sm">
              <span className="text-muted-foreground">
                Page {page + 1} of {totalPages} · {totalUsers.toLocaleString()} users
              </span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={page === 0 || loading}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}>Previous</Button>
                <Button size="sm" variant="outline" disabled={page + 1 >= totalPages || loading}
                  onClick={() => setPage((p) => p + 1)}>Next</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Users }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
          <Icon className="w-5 h-5" />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="text-lg font-bold leading-tight truncate">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default UserDirectory;
