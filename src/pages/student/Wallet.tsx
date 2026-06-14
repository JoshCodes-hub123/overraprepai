import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePremium } from "@/hooks/usePremium";
import { SEO } from "@/components/seo/SEO";
import DashboardNav from "@/components/layout/DashboardNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Wallet as WalletIcon, Zap, Plus, Minus, Loader2, ArrowDownLeft, Sparkles, Info, ShieldCheck,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { PremiumPageHero } from "@/components/shell/PremiumPageHero";
import VerifyPaymentDialog from "@/components/student/VerifyPaymentDialog";
import BankTransferTopUpDialog from "@/components/student/BankTransferTopUpDialog";
import { LoadingState } from "@/components/ui/loading-state";
import { Banknote, CreditCard } from "lucide-react";

const NAIRA_PER_TOKEN = 50
const MIN_NAIRA = 250
const TOP_UPS = [
  { naira: 250, tokens: 5 },
  { naira: 500, tokens: 10, badge: "Popular" },
  { naira: 1000, tokens: 20 },
  { naira: 2000, tokens: 40 },
  { naira: 5000, tokens: 100, badge: "Best value" },
];

type Txn = {
  id: string;
  user_id: string;
  kind: "topup" | "spend" | "free" | "admin_credit" | "admin_debit" | "refund";
  tokens: number;
  naira_amount: number | null;
  action_kind: string | null;
  reason: string | null;
  balance_after: number;
  created_at: string;
};

const labelFor = (t: Txn) => {
  switch (t.kind) {
    case "topup": return "Wallet top-up";
    case "spend": return `AI · ${t.action_kind?.replace(/_/g, " ") ?? "action"}`;
    case "free": return `Free · ${t.action_kind?.replace(/_/g, " ") ?? "action"}`;
    case "admin_credit": return "Admin credit";
    case "admin_debit": return "Admin debit";
    case "refund": return "Refund";
  }
};

const WalletPage = () => {
  const { user } = useAuth();
  const { balance, freeLeft, isLoading, refetch } = usePremium();
  const qc = useQueryClient();
  const [custom, setCustom] = useState("");
  const [busy, setBusy] = useState<number | "custom" | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [bankOpen, setBankOpen] = useState(false);

  // Reconcile redirect from Flutterwave: if URL has tx_ref/transaction_id,
  // call flutterwave-verify so a missed webhook still credits the wallet.
  useEffect(() => {
    if (!user?.id) return;
    const url = new URL(window.location.href);
    const txRef = url.searchParams.get("tx_ref");
    const txId = url.searchParams.get("transaction_id");
    const flwStatus = url.searchParams.get("status");
    if (!txRef && !txId) return;

    // Clear params from address bar
    url.searchParams.delete("tx_ref");
    url.searchParams.delete("transaction_id");
    url.searchParams.delete("status");
    window.history.replaceState({}, "", url.pathname + url.search);

    if (flwStatus && /cancel|fail/i.test(flwStatus)) {
      toast.error("Payment was cancelled.");
      return;
    }

    (async () => {
      setVerifying(true);
      try {
        const { data, error } = await supabase.functions.invoke("flutterwave-verify", {
          body: { tx_ref: txRef ?? undefined, transaction_id: txId ?? undefined },
        });
        if (error) throw error;
        const d = data as any;
        if (d?.ok) {
          if (d.idempotent) {
            toast.success("Payment already credited ✓");
          } else {
            toast.success(`Top-up successful · +${d.tokens} tokens`);
          }
          refetch();
          qc.invalidateQueries({ queryKey: ["wallet-transactions"] });
        } else if (d?.status === "pending") {
          toast.message("Payment still processing — refresh in a moment.");
        } else {
          toast.error(d?.message || "Could not verify payment yet. We'll try again on refresh.");
        }
      } catch (e: any) {
        console.error("verify error", e);
        toast.error("Could not verify payment. Contact support if money was deducted.");
      } finally {
        setVerifying(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);


  const { data: txns = [], isLoading: txLoading, isError: txError, refetch: refetchTxns } = useQuery({
    queryKey: ["wallet-transactions", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("wallet_transactions")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(100);
      return (data ?? []) as Txn[];
    },
  });

  const startTopUp = async (amountNaira: number) => {
    if (!amountNaira || amountNaira < MIN_NAIRA) {
      toast.error(`Minimum top-up is ₦${MIN_NAIRA}`);
      return;
    }
    setBusy(amountNaira === Number(custom) ? "custom" : amountNaira);
    try {
      const { data, error } = await supabase.functions.invoke("flutterwave-init", {
        body: { amount_naira: amountNaira, redirect_url: `${window.location.origin}/wallet` },
      });
      if (error) throw error;
      const url = (data as any)?.checkout_url;
      if (!url) throw new Error("No checkout URL returned");
      window.location.href = url;
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Could not start checkout. Try again.");
      setBusy(null);
    }
  };

  const lifetimeSpent = useMemo(
    () => txns.filter((t) => t.kind === "spend").reduce((s, t) => s + Math.abs(t.tokens), 0),
    [txns],
  );

  return (
    <>
      <SEO title="Wallet" description="Top up your OverraPrep wallet and track AI usage." url="https://overraprepai.com/wallet" noindex />
      <div className="min-h-screen bg-background pb-24">
        <DashboardNav role="student" />
        <main className="container mx-auto px-4 py-6 max-w-3xl">
          <PremiumPageHero
            eyebrow="WALLET"
            title="Your study fuel"
            subtitle="1 token = ₦50 = 1 AI action. Top up from ₦250 and use them anytime."
            icon={WalletIcon}
            back
            size="sm"
            className="mb-5"
          />

          {/* Balance hero */}
          <Card className="p-5 bg-gradient-to-br from-amber-50 via-white to-amber-50 border-amber-200 mb-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-wide font-semibold text-amber-700">Balance</p>
                <p className="mt-1 font-display text-4xl font-extrabold text-amber-900 flex items-center gap-2">
                  <Zap className="w-7 h-7" /> {isLoading ? "—" : balance}
                  <span className="text-base font-bold text-amber-700">tokens</span>
                </p>
                <p className="text-[12px] text-amber-800 mt-1">≈ ₦{(balance * NAIRA_PER_TOKEN).toLocaleString()}</p>
              </div>
              <div className="text-right">
                <Badge variant="outline" className="bg-white/80 border-amber-300 text-amber-800">
                  ₦{NAIRA_PER_TOKEN}/token
                </Badge>
                <p className="text-[11px] text-muted-foreground mt-2">Lifetime spent: {lifetimeSpent}</p>
              </div>
            </div>
          </Card>

          {/* Payment method picker */}
          <section className="mb-3">
            <h2 className="font-display text-base font-bold mb-2">Choose how to pay</h2>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setBankOpen(true)}
                className="rounded-2xl border-2 border-emerald-200 bg-emerald-50/60 hover:bg-emerald-50 hover:border-emerald-400 p-3 text-left transition-colors"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Banknote className="h-5 w-5 text-emerald-700" />
                  <span className="text-[10px] font-extrabold uppercase tracking-wider bg-emerald-600 text-white px-1.5 py-0.5 rounded">
                    No fees
                  </span>
                </div>
                <p className="font-display text-sm font-extrabold text-emerald-900">Bank transfer</p>
                <p className="text-[11px] text-emerald-800 mt-0.5">Works on any network · 24h credit</p>
              </button>

              <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-3">
                <div className="flex items-center gap-2 mb-1">
                  <CreditCard className="h-5 w-5 text-amber-700" />
                  <span className="text-[10px] font-extrabold uppercase tracking-wider bg-amber-500 text-white px-1.5 py-0.5 rounded">
                    Instant
                  </span>
                </div>
                <p className="font-display text-sm font-extrabold text-amber-900">Card / USSD</p>
                <p className="text-[11px] text-amber-800 mt-0.5">Via Flutterwave — pick an amount below</p>
              </div>
            </div>
          </section>

          {/* Top-up grid */}
          <section className="mb-6">
            <h2 className="font-display text-base font-bold mb-2">Card / USSD top-up</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {TOP_UPS.map((t) => (
                <button
                  key={t.naira}
                  onClick={() => startTopUp(t.naira)}
                  disabled={busy !== null}
                  className="relative text-left rounded-2xl border border-amber-100 hover:border-amber-300 bg-amber-50/40 hover:bg-amber-50 p-3 transition-colors disabled:opacity-60"
                >
                  {t.badge && (
                    <span className="absolute -top-2 right-2 text-[9px] font-bold uppercase tracking-wide bg-amber-500 text-white px-1.5 py-0.5 rounded">
                      {t.badge}
                    </span>
                  )}
                  <p className="font-display text-base font-extrabold text-amber-900">
                    ₦{t.naira.toLocaleString()}
                  </p>
                  <p className="text-[11px] text-amber-800 mt-0.5 flex items-center gap-1">
                    <Zap className="h-3 w-3" /> {t.tokens} tokens
                  </p>
                  {busy === t.naira && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-700 absolute bottom-2 right-2" />
                  )}
                </button>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <Input
                type="number"
                inputMode="numeric"
                min={MIN_NAIRA}
                placeholder={`Custom (₦${MIN_NAIRA}+, rounded to ₦${NAIRA_PER_TOKEN})`}
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                className="h-10"
              />
              <Button
                onClick={() => startTopUp(Number(custom))}
                disabled={busy !== null || !custom || Number(custom) < MIN_NAIRA}
                className="h-10 bg-amber-600 hover:bg-amber-700 text-white"
              >
                {busy === "custom" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Top up"}
              </Button>
            </div>
            {/* Self-serve recovery for missed webhooks / interrupted redirects */}
            <button
              type="button"
              onClick={() => setVerifyOpen(true)}
              className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-semibold text-amber-700 hover:text-amber-900 hover:underline"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              I paid but didn't get my tokens
            </button>
          </section>

          {/* Transactions */}
          <section className="mb-6">
            <h2 className="font-display text-base font-bold mb-2">Activity</h2>
            {txns.length === 0 ? (
              <Card className="p-6 text-center text-sm text-muted-foreground">
                No transactions yet — top up to get started.
              </Card>
            ) : (
              <div className="space-y-1.5">
                {txns.map((t) => {
                  const positive = t.tokens > 0;
                  return (
                    <Card key={t.id} className="p-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                          positive ? "bg-emerald-50 text-emerald-700" : t.kind === "free" ? "bg-sky-50 text-sky-700" : "bg-rose-50 text-rose-700"
                        }`}>
                          {positive ? <Plus className="h-4 w-4" /> : t.kind === "free" ? <Sparkles className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate">{labelFor(t)}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {format(new Date(t.created_at), "MMM d, HH:mm")}
                            {t.naira_amount ? ` · ₦${t.naira_amount.toLocaleString()}` : ""}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`text-sm font-bold ${positive ? "text-emerald-700" : t.kind === "free" ? "text-sky-700" : "text-rose-700"}`}>
                          {positive ? "+" : ""}{t.tokens}
                        </p>
                        <p className="text-[10px] text-muted-foreground">bal {t.balance_after}</p>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </section>

          <Card className="p-4 bg-amber-50/50 border-amber-100">
            <p className="text-[12px] text-amber-900 flex items-start gap-2">
              <Info className="h-4 w-4 mt-0.5 shrink-0" />
              <span>
                <strong>How it works.</strong> Every AI action (quiz, summary, study pack, mock exam, notes-to-audio,
                tutor chat, study coach) costs 1 token. Browsing, leaderboards, SRS review, bookmarks and community
                are always free. Top up from ₦250 to get 5 tokens.
              </span>
            </p>
          </Card>
        </main>
      </div>
      <VerifyPaymentDialog
        open={verifyOpen}
        onOpenChange={setVerifyOpen}
        onVerified={() => {
          refetch();
          qc.invalidateQueries({ queryKey: ["wallet-transactions"] });
        }}
      />
      <BankTransferTopUpDialog
        open={bankOpen}
        onOpenChange={setBankOpen}
        onSubmitted={() => {
          qc.invalidateQueries({ queryKey: ["wallet-transactions"] });
        }}
      />
    </>
  );
};

export default WalletPage;
