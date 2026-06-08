import { useMemo, useState } from "react";
import {
  Search, Mail, MessageCircle, BookOpen, Shield, Wallet, Bot,
  GraduationCap, Bell, ChevronDown, ExternalLink, Sparkles,
} from "lucide-react";
import AppScreen from "@/components/app-shell/AppScreen";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { SEO } from "@/components/seo/SEO";

const QUICK = [
  { icon: Wallet,        label: "Wallet & tokens",  to: "/wallet" },
  { icon: Bot,           label: "AI tutor",         to: "/ai-tutor" },
  { icon: GraduationCap, label: "My courses",       to: "/courses" },
  { icon: Bell,          label: "Notifications",    to: "/settings/notifications" },
  { icon: Shield,        label: "Privacy",          to: "/settings/privacy" },
  { icon: BookOpen,      label: "Library",          to: "/library" },
];

const FAQS = [
  {
    q: "How do tokens and free daily uses work?",
    a: "Every student gets 3 free AI actions every day, which reset at midnight (Africa/Lagos). After your free uses are exhausted, your wallet kicks in — 1 token = ₦50 = 1 AI action. Top up any time from the Wallet page.",
  },
  {
    q: "How do I top up my wallet?",
    a: "Open Wallet from the menu, choose a preset (₦250 / ₦500 / ₦1,000 / ₦2,000 / ₦5,000) or enter a custom amount, then pay securely with Flutterwave. Tokens land in your wallet seconds after payment confirms.",
  },
  {
    q: "I didn't receive my verification email.",
    a: "Check your Spam / Promotions folder first. You can request a new magic link from the sign-in page, or use the 6-digit OTP option as a fallback. Still stuck? Email support@overraprepai.com from the same address.",
  },
  {
    q: "How do streaks and daily goals work?",
    a: "Completing at least one practice question or AI action each day keeps your streak alive. Streaks reset at midnight WAT if you skip a day. Visit Dashboard → Today's Focus to see what's next.",
  },
  {
    q: "Can I use OverraPrep offline?",
    a: "Yes. Downloaded quizzes and your SRS review deck work offline. Open Library → Offline downloads to manage what's saved on this device.",
  },
  {
    q: "How do I become a tutor on OverraPrep?",
    a: "Tap Apply as Tutor from the menu and submit your application. Our team reviews tutor applications manually — once approved, you'll get access to the Tutor dashboard, payouts and storefront.",
  },
  {
    q: "How do I report a wrong question or bug?",
    a: "Inside any quiz, tap the flag icon to report an issue. For everything else, email support@overraprepai.com — please include screenshots so we can fix it fast.",
  },
  {
    q: "How do I delete my account?",
    a: "Email support@overraprepai.com from your registered address. We'll permanently delete your account and personal data within 14 days, in line with our Privacy Policy.",
  },
];

const HelpSupport = () => {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<number | null>(0);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return FAQS;
    return FAQS.filter((f) => f.q.toLowerCase().includes(s) || f.a.toLowerCase().includes(s));
  }, [q]);

  return (
    <AppScreen title="Help & support" back>
      <SEO title="Help & Support — OverraPrep AI" description="Get help with OverraPrep AI: tokens, tutors, account, and more." />
      <div className="max-w-2xl mx-auto pb-28 space-y-6">
        {/* Hero */}
        <div className="rounded-3xl bg-gradient-to-br from-amber-50 to-white border border-amber-100 p-5">
          <div className="flex items-center gap-2 mb-1.5">
            <Sparkles className="w-4 h-4 text-amber-600" />
            <p className="text-[11px] font-bold tracking-[0.18em] uppercase text-amber-700/80">
              We're here to help
            </p>
          </div>
          <h2 className="font-display text-[22px] font-extrabold leading-tight">
            How can we help today?
          </h2>
          <p className="text-[13px] text-neutral-600 mt-1">
            Search our FAQs or reach the team directly — most replies in under 24 hours.
          </p>
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search help articles…"
              className="pl-9 h-11 rounded-xl bg-white border-amber-100 focus-visible:ring-amber-300"
            />
          </div>
        </div>

        {/* Quick topics */}
        <section>
          <h3 className="px-1 text-[11px] font-bold tracking-[0.18em] uppercase text-amber-700/70 mb-2">
            Popular topics
          </h3>
          <div className="grid grid-cols-3 gap-2.5">
            {QUICK.map(({ icon: Icon, label, to }) => (
              <a
                key={label}
                href={to}
                className="flex flex-col items-center justify-center text-center gap-1.5 rounded-2xl border border-amber-100 bg-white p-3 hover:bg-amber-50/60 transition"
              >
                <span className="h-9 w-9 rounded-xl inline-flex items-center justify-center bg-amber-50 text-amber-700">
                  <Icon className="w-[18px] h-[18px]" strokeWidth={1.8} />
                </span>
                <span className="text-[11.5px] font-semibold text-neutral-700 leading-tight">{label}</span>
              </a>
            ))}
          </div>
        </section>

        {/* FAQs */}
        <section>
          <h3 className="px-1 text-[11px] font-bold tracking-[0.18em] uppercase text-amber-700/70 mb-2">
            Frequently asked
          </h3>
          <div className="rounded-2xl border border-amber-100 bg-white overflow-hidden">
            {filtered.length === 0 && (
              <p className="px-4 py-6 text-center text-[13px] text-neutral-500">
                No articles match "{q}". Try a different search or contact support below.
              </p>
            )}
            {filtered.map((f, i) => {
              const isOpen = open === i;
              return (
                <div key={f.q} className={cn(i !== filtered.length - 1 && "border-b border-amber-50")}>
                  <button
                    onClick={() => setOpen(isOpen ? null : i)}
                    className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-amber-50/40 transition"
                  >
                    <span className="flex-1 text-[14px] font-semibold text-neutral-800">{f.q}</span>
                    <ChevronDown
                      className={cn(
                        "w-4 h-4 text-neutral-400 transition-transform shrink-0",
                        isOpen && "rotate-180 text-amber-600",
                      )}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-4 text-[13.5px] leading-relaxed text-neutral-600">
                      {f.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Contact */}
        <section>
          <h3 className="px-1 text-[11px] font-bold tracking-[0.18em] uppercase text-amber-700/70 mb-2">
            Still need help?
          </h3>
          <div className="grid sm:grid-cols-2 gap-2.5">
            <a
              href="mailto:support@overraprepai.com"
              className="flex items-center gap-3 rounded-2xl border border-amber-100 bg-white p-4 hover:bg-amber-50/60 transition"
            >
              <span className="h-10 w-10 rounded-xl inline-flex items-center justify-center bg-amber-50 text-amber-700">
                <Mail className="w-5 h-5" strokeWidth={1.8} />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-[14px] font-semibold">Email support</span>
                <span className="block text-[12px] text-neutral-500 truncate">
                  support@overraprepai.com
                </span>
              </span>
              <ExternalLink className="w-4 h-4 text-neutral-400" />
            </a>
            <a
              href="https://wa.me/2348000000000"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-2xl border border-amber-100 bg-white p-4 hover:bg-amber-50/60 transition"
            >
              <span className="h-10 w-10 rounded-xl inline-flex items-center justify-center bg-amber-50 text-amber-700">
                <MessageCircle className="w-5 h-5" strokeWidth={1.8} />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-[14px] font-semibold">Chat on WhatsApp</span>
                <span className="block text-[12px] text-neutral-500 truncate">Mon–Sat, 9am–6pm WAT</span>
              </span>
              <ExternalLink className="w-4 h-4 text-neutral-400" />
            </a>
          </div>
        </section>

        <p className="text-center text-[11px] text-neutral-400">
          OverraPrep AI — Study Smart, Not Hard.
        </p>
      </div>
    </AppScreen>
  );
};

export default HelpSupport;
