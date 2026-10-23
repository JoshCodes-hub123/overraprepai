import { Link } from "react-router-dom";
import { GraduationCap, ShieldCheck, Mail, Github, Twitter, Sparkles } from "lucide-react";

/**
 * Decent, professional global footer. Anchored on legal trust (Verify, Terms, Privacy).
 * Designed to slot beneath any public-facing screen.
 */
export const SiteFooter = () => {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-amber-100/60 bg-gradient-to-b from-white to-amber-50/40">
      <div className="container max-w-6xl mx-auto px-4 py-10">
        <div className="grid gap-8 md:grid-cols-4">
          <div className="md:col-span-2">
            <Link to="/" className="inline-flex items-center gap-2 group">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 shadow-md shadow-amber-500/30 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <span className="font-serif text-xl font-bold tracking-tight">OverraPrep AI</span>
            </Link>
            <p className="mt-3 text-sm text-muted-foreground max-w-md leading-relaxed">
              AI-powered university course revision, CBT practice, and theory exam preparation — built for Nigerian tertiary students and campus tutors.
            </p>
          </div>

          <div>
            <h3 className="font-serif text-sm font-semibold tracking-wide text-foreground mb-3">Platform</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/study-hub" className="text-muted-foreground hover:text-amber-700 transition">Study Hub</Link></li>
              <li><Link to="/ai-tutor" className="text-muted-foreground hover:text-amber-700 transition">AI Tutor</Link></li>
              <li><Link to="/tutors" className="text-muted-foreground hover:text-amber-700 transition">Browse Tutors</Link></li>
              <li><Link to="/leaderboard" className="text-muted-foreground hover:text-amber-700 transition">Leaderboard</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-serif text-sm font-semibold tracking-wide text-foreground mb-3">Trust & Legal</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/terms" className="text-muted-foreground hover:text-amber-700 transition">Terms of Service</Link></li>
              <li><Link to="/privacy" className="text-muted-foreground hover:text-amber-700 transition">Privacy Policy</Link></li>
              <li><Link to="/settings/privacy" className="text-muted-foreground hover:text-amber-700 transition">Manage your data</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-amber-100/60 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
            <GraduationCap className="h-3.5 w-3.5" />
            © {year} OverraPrep AI. All rights reserved.
            <Link
              to="/auth?redirect=/admin"
              aria-label="Admin login"
              title="Admin"
              className="ml-2 inline-block h-1.5 w-1.5 rounded-full bg-amber-300/60 hover:bg-amber-600 transition-colors"
            />
          </p>
          <div className="flex items-center gap-4 text-muted-foreground">
            <a href="mailto:hello@overraprep.com" aria-label="Email" className="hover:text-amber-700 transition"><Mail className="h-4 w-4" /></a>
            <a href="https://twitter.com" target="_blank" rel="noreferrer noopener" aria-label="Twitter" className="hover:text-amber-700 transition"><Twitter className="h-4 w-4" /></a>
            <a href="https://github.com" target="_blank" rel="noreferrer noopener" aria-label="GitHub" className="hover:text-amber-700 transition"><Github className="h-4 w-4" /></a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default SiteFooter;
