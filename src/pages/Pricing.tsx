import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Wallet,
  Zap,
  Check,
  Sparkles,
  ShieldCheck,
  ArrowRight,
  HelpCircle,
  Clock,
  BookOpen,
  Brain,
} from "lucide-react";
import { SEO } from "@/components/seo/SEO";
import { useAuth } from "@/hooks/useAuth";
import { usePremium } from "@/hooks/usePremium";

const TOP_UP_TIERS = [
  { naira: 250, tokens: 5, label: "Starter Pack", desc: "Ideal for quick quiz drills & revision" },
  {
    naira: 500,
    tokens: 10,
    label: "Study Sprint",
    desc: "Most popular for midterm tests & quizzes",
    badge: "Popular",
    featured: true,
  },
  { naira: 1000, tokens: 20, label: "Exam Pack", desc: "Ample tokens for extensive CBT simulations" },
  {
    naira: 2000,
    tokens: 40,
    label: "Semester Pass",
    desc: "Heavy practice, deep explanations & mock exams",
  },
  {
    naira: 5000,
    tokens: 100,
    label: "Ultimate Pass",
    desc: "All-in-one prep for semester exams & degree finals",
    badge: "Best Value",
  },
];

const TOKEN_COSTS = [
  { action: "Daily Free Allowance", cost: "0 Tokens", desc: "3 AI queries replenished every midnight" },
  { action: "Step-by-step AI Solution Breakdown", cost: "1 Token", desc: "Detailed breakdown of any difficult question" },
  { action: "AI Study Coach Diagnostics", cost: "1 Token", desc: "Personalized weak area detection & advice" },
  { action: "Instant AI Quiz from Syllabus/Topic", cost: "2 Tokens", desc: "Custom exam-format questions with explanations" },
  { action: "Full Mock CBT Readiness Intelligence", cost: "3 Tokens", desc: "Comprehensive score breakdown & prediction" },
  { action: "Flashcards, Audio Suite & Study Hub", cost: "Always Free", desc: "Standard revision tools never consume tokens" },
];

export default function Pricing() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { balance, freeLeft } = usePremium();

  const handleTopUp = () => {
    navigate("/wallet");
  };

  const pricingStructuredData = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: "OverraPrep Prepaid Study Tokens",
    description: "Pay-as-you-go exam preparation tokens for Nigerian university students and scholars. ₦50 per token with 3 free queries daily.",
    brand: { "@type": "Brand", name: "OverraPrep" },
    offers: {
      "@type": "AggregateOffer",
      lowPrice: "250",
      highPrice: "5000",
      priceCurrency: "NGN",
      offerCount: "5",
    },
  };

  return (
    <>
      <SEO
        title="Pricing & Token Packages — OverraPrep"
        description="Transparent pay-as-you-go exam prep. ₦50 per AI token with 3 free queries every day. No locked subscriptions. Top up via card or bank transfer."
        url="/pricing"
        structuredData={pricingStructuredData}
      />

      <div className="container mx-auto p-4 max-w-4xl space-y-8 py-8">
        {/* Hero Section */}
        <header className="text-center space-y-3 max-w-2xl mx-auto">
          <Badge variant="outline" className="px-3 py-1 text-xs border-amber-300 bg-amber-500/10 text-amber-700 dark:text-amber-300">
            <Sparkles className="w-3.5 h-3.5 mr-1.5" />
            Zero Monthly Lock-ins · Pay Only For What You Use
          </Badge>
          <h1 className="text-3xl sm:text-4xl font-display font-extrabold text-foreground tracking-tight">
            Transparent, Student-Friendly Pricing
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            No expensive subscriptions. Get <strong className="text-foreground">3 free AI questions daily</strong>, or top up prepaid tokens at just <strong className="text-foreground">₦50 per token</strong>.
          </p>

          {user && (
            <div className="inline-flex items-center gap-3 p-2 px-4 rounded-full bg-card border border-border shadow-xs text-xs mt-2">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Wallet className="w-3.5 h-3.5 text-primary" />
                Current Balance: <strong className="text-foreground">{balance} tokens</strong>
              </span>
              <span className="text-border">|</span>
              <span className="text-muted-foreground">
                Daily Free Left: <strong className="text-emerald-600 dark:text-emerald-400">{freeLeft} free</strong>
              </span>
            </div>
          )}
        </header>

        {/* Token Packages Grid */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-display font-bold">Prepaid Token Packs</h2>
              <p className="text-xs text-muted-foreground">Tokens never expire. Use them whenever you study.</p>
            </div>
            <Button size="sm" onClick={handleTopUp} className="gap-1.5 text-xs">
              <Wallet className="w-3.5 h-3.5" />
              Go to Wallet
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {TOP_UP_TIERS.map((tier) => (
              <Card
                key={tier.naira}
                className={`relative flex flex-col justify-between transition-all hover:shadow-md ${
                  tier.featured ? "border-2 border-primary bg-primary/5" : "border-border/80"
                }`}
              >
                {tier.badge && (
                  <Badge
                    className={`absolute -top-2.5 right-4 text-[10px] uppercase font-bold ${
                      tier.featured ? "bg-primary text-primary-foreground" : "bg-amber-500 text-white"
                    }`}
                  >
                    {tier.badge}
                  </Badge>
                )}

                <CardHeader className="pb-3">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {tier.label}
                  </div>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-2xl font-extrabold text-foreground">₦{tier.naira.toLocaleString()}</span>
                    <span className="text-xs text-muted-foreground">/ one-time</span>
                  </div>
                  <div className="text-sm font-bold text-primary flex items-center gap-1 mt-1">
                    <Zap className="w-4 h-4 fill-primary" />
                    {tier.tokens} AI Tokens
                  </div>
                </CardHeader>

                <CardContent className="space-y-4 pt-0">
                  <p className="text-xs text-muted-foreground min-h-[32px]">{tier.desc}</p>
                  <Button
                    className="w-full text-xs font-semibold"
                    variant={tier.featured ? "default" : "outline"}
                    onClick={handleTopUp}
                  >
                    Top Up ₦{tier.naira.toLocaleString()}
                    <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Token Usage Cost Breakdown */}
        <section className="space-y-4 rounded-2xl border border-border/80 bg-card p-5 shadow-xs">
          <div>
            <h2 className="text-base font-display font-bold">What Does Each Feature Cost?</h2>
            <p className="text-xs text-muted-foreground">Complete transparency on token consumption.</p>
          </div>

          <div className="grid sm:grid-cols-2 gap-3 divide-y sm:divide-y-0 sm:divide-x divide-border/60">
            <div className="space-y-3">
              {TOKEN_COSTS.slice(0, 3).map((item) => (
                <div key={item.action} className="flex items-start justify-between gap-3 text-xs pt-2 sm:pt-0">
                  <div>
                    <div className="font-semibold text-foreground flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                      {item.action}
                    </div>
                    <p className="text-muted-foreground pl-5 text-[11px]">{item.desc}</p>
                  </div>
                  <Badge variant="secondary" className="shrink-0 text-[11px] font-mono font-bold">
                    {item.cost}
                  </Badge>
                </div>
              ))}
            </div>

            <div className="space-y-3 sm:pl-3 pt-3 sm:pt-0">
              {TOKEN_COSTS.slice(3).map((item) => (
                <div key={item.action} className="flex items-start justify-between gap-3 text-xs pt-2 sm:pt-0">
                  <div>
                    <div className="font-semibold text-foreground flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                      {item.action}
                    </div>
                    <p className="text-muted-foreground pl-5 text-[11px]">{item.desc}</p>
                  </div>
                  <Badge variant="secondary" className="shrink-0 text-[11px] font-mono font-bold">
                    {item.cost}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQs */}
        <section className="space-y-3">
          <h2 className="text-base font-display font-bold">Frequently Asked Questions</h2>
          <div className="grid sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-xl border border-border/70 bg-card/60 space-y-1">
              <h3 className="font-bold text-foreground flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-amber-500" />
                How do I pay in Nigeria?
              </h3>
              <p className="text-muted-foreground">
                You can pay using any Nigerian debit card (Mastercard, Visa, Verve) via secure Flutterwave or send a direct bank transfer with instant reconciliation.
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-border/70 bg-card/60 space-y-1">
              <h3 className="font-bold text-foreground flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                Do purchased tokens expire?
              </h3>
              <p className="text-muted-foreground">
                Never. Tokens remain in your OverraPrep wallet permanently until you choose to use them across any semester or exam diet.
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-border/70 bg-card/60 space-y-1">
              <h3 className="font-bold text-foreground flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                How does the free tier work?
              </h3>
              <p className="text-muted-foreground">
                Every user gets 3 free AI requests refreshed at 12:00 AM every midnight. If you run out, your wallet tokens step in seamlessly.
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-border/70 bg-card/60 space-y-1">
              <h3 className="font-bold text-foreground flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                Can tutors monetize their content?
              </h3>
              <p className="text-muted-foreground">
                Yes! Verified tutors earn tokens when students unlock their curated quizzes and notes, which can be cashed out directly to any Nigerian bank account.
              </p>
            </div>
          </div>
        </section>

        {/* Bottom CTA */}
        <div className="text-center p-6 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 space-y-3">
          <h3 className="font-display font-bold text-base text-foreground">Ready to accelerate your exam readiness?</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Start solving past questions for free, or top up your wallet with as little as ₦250.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Button onClick={() => navigate("/practice")} variant="outline" size="sm">
              Practice For Free
            </Button>
            <Button onClick={handleTopUp} size="sm" className="gap-1.5">
              <Wallet className="w-3.5 h-3.5" />
              Manage Wallet
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
