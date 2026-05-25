import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { SEO } from "@/components/seo/SEO";
import DashboardNav from "@/components/layout/DashboardNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wallet as WalletIcon, ArrowUpRight, ArrowDownLeft, Send, ShoppingBag, TestTube2 } from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

const Wallet = () => {
  const { user } = useAuth();

  const { data: wallet } = useQuery({
    queryKey: ["my-wallet", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("token_wallets").select("*").eq("user_id", user!.id).maybeSingle();
      return data;
    },
  });

  const { data: txns = [] } = useQuery({
    queryKey: ["my-txns", wallet?.id],
    enabled: !!wallet?.id,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("token_transactions").select("*").eq("wallet_id", wallet.id)
        .order("created_at", { ascending: false }).limit(30);
      return data ?? [];
    },
  });

  const { data: purchases = [] } = useQuery({
    queryKey: ["my-token-purchases", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("token_purchases").select("*").eq("user_id", user!.id)
        .order("created_at", { ascending: false }).limit(15);
      return data ?? [];
    },
  });

  return (
    <>
      <SEO title="Wallet" description="Your OverraPrep token wallet." url="https://overraprep.com/wallet" />
      <div className="min-h-screen bg-background pb-24">
        <DashboardNav role="student" />
        <main className="container mx-auto px-4 py-6 max-w-2xl">
          <header className="mb-6">
            <h1 className="font-display text-2xl font-bold flex items-center gap-2">
              <WalletIcon className="w-6 h-6 text-amber-500" /> Wallet
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Tokens for sessions, premium content, and rewards.</p>
          </header>

          <Card className="p-3 mb-4 border-amber-200 bg-amber-50/60 flex items-center gap-2.5">
            <TestTube2 className="w-4 h-4 text-amber-700 shrink-0" />
            <p className="text-xs text-amber-900">
              <span className="font-semibold">Test mode active.</span> All purchases use Paddle sandbox — no real money is charged.
            </p>
          </Card>

          <Card className="p-5 mb-5 border-amber-100 bg-gradient-to-br from-amber-50/60 to-background">
            <p className="text-xs uppercase tracking-wider font-semibold text-amber-700">Balance</p>
            <p className="font-display text-4xl font-bold mt-1">{wallet?.balance ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-1">Earned total: {wallet?.total_earned ?? 0}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button asChild className="gap-1.5">
                <Link to="/subscription"><ShoppingBag className="w-4 h-4" /> Buy tokens</Link>
              </Button>
              <Button disabled variant="outline" className="gap-1.5" title="Coming soon">
                <Send className="w-4 h-4" /> Transfer
              </Button>
            </div>
          </Card>

          <h2 className="font-display text-lg font-bold mb-3 flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-amber-600" /> Recent purchases
          </h2>
          {purchases.length === 0 ? (
            <p className="text-sm text-muted-foreground mb-6">No purchases yet.</p>
          ) : (
            <div className="space-y-2 mb-6">
              {purchases.map((p: any) => (
                <Card key={p.id} className="p-3 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">
                      +{p.tokens_credited} tokens
                      <Badge variant="outline" className="ml-2 text-[10px] uppercase">{p.environment}</Badge>
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {p.price_id} · {format(new Date(p.created_at), "PP p")}
                    </p>
                  </div>
                  <span className="font-bold text-sm text-foreground shrink-0">
                    {(p.amount_cents / 100).toLocaleString(undefined, { style: "currency", currency: p.currency || "USD" })}
                  </span>
                </Card>
              ))}
            </div>
          )}

          <h2 className="font-display text-lg font-bold mb-3">Recent activity</h2>
          {txns.length === 0 ? (
            <p className="text-sm text-muted-foreground">No transactions yet.</p>
          ) : (
            <div className="space-y-2">
              {txns.map((t: any) => {
                const positive = (t.amount || 0) > 0;
                return (
                  <Card key={t.id} className="p-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`h-8 w-8 rounded-full grid place-items-center shrink-0 ${positive ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}>
                        {positive ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">{t.description || t.type}</p>
                        <p className="text-[11px] text-muted-foreground">{format(new Date(t.created_at), "PP p")}</p>
                      </div>
                    </div>
                    <span className={`font-bold text-sm ${positive ? "text-emerald-600" : "text-rose-600"}`}>
                      {positive ? "+" : ""}{t.amount}
                    </span>
                  </Card>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </>
  );
};

export default Wallet;
