import { useState, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, GraduationCap, ChevronRight, Smartphone, User, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import TutorApplicationDialog from "@/components/landing/TutorApplicationDialog";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { InstallAppModal } from "@/components/pwa/InstallAppModal";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import logo from "@/assets/logo.png";

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showTutorDialog, setShowTutorDialog] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, isLoading, hasRole, signOut } = useAuth();
  const initials = (profile?.full_name || user?.email || "U")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const avatar = (profile as any)?.avatar_url || (profile as any)?.profile_image_url || null;

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 16);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!isMenuOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsMenuOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isMenuOpen]);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  const navLinks = [
    { name: "Features", href: "#features", isRoute: false },
    { name: "How It Works", href: "#how-it-works", isRoute: false },
    { name: "Pricing", href: "#pricing", isRoute: false },
    { name: "Testimonials", href: "#testimonials", isRoute: false },
  ];

  const handleSmoothScroll = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    if (location.pathname !== "/") {
      navigate("/");
      setTimeout(() => {
        const element = document.querySelector(href);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 100);
    } else {
      const element = document.querySelector(href);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
    setIsMenuOpen(false);
  };

  const showTutorButton = !hasRole("tutor") && !hasRole("admin");

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${
          isScrolled || isMenuOpen
            ? "bg-background/95 backdrop-blur-md border-b border-border shadow-2xs"
            : "bg-background/70 backdrop-blur-sm border-b border-transparent"
        }`}
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Strict 3-Zone Top Bar Contract: Brand — Concise Links — Primary Action */}
          <div className="flex items-center justify-between gap-4 lg:gap-8 h-14 sm:h-16">
            {/* Zone 1: Single-line Brand Wordmark */}
            <Link
              to="/"
              className="flex items-center gap-2.5 shrink-0 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg"
            >
              <img
                src={logo}
                alt="OverraPrep"
                className="h-8 w-auto object-contain shrink-0"
              />
              <span className="font-display font-extrabold tracking-tight text-base sm:text-lg text-foreground whitespace-nowrap">
                OverraPrep
              </span>
            </Link>

            {/* Zone 2: 4 Concise Single-Line Navigation Links */}
            <div className="hidden lg:flex items-center gap-7">
              {navLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  onClick={(e) => handleSmoothScroll(e, link.href)}
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap shrink-0 underline-offset-4 hover:underline cursor-pointer"
                >
                  {link.name}
                </a>
              ))}
              {showTutorButton && (
                <button
                  type="button"
                  onClick={() => setShowTutorDialog(true)}
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap shrink-0 underline-offset-4 hover:underline cursor-pointer"
                >
                  Become a Tutor
                </button>
              )}
            </div>

            {/* Zone 3: Single Primary Action (+ compact signed-in avatar menu) */}
            <div className="hidden lg:flex items-center gap-3 shrink-0">
              {!isLoading &&
                (user ? (
                  <>
                    <Button
                      size="sm"
                      onClick={() => navigate("/dashboard")}
                      className="h-10 px-4 rounded-xl bg-foreground hover:bg-foreground/90 text-background font-bold text-xs whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <span>Open Dashboard</span>
                      <ChevronRight className="w-3.5 h-3.5 ml-1 text-primary" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          aria-label="User account menu"
                          className="h-10 w-10 rounded-full flex items-center justify-center ring-1 ring-border hover:ring-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
                        >
                          <Avatar className="w-9 h-9">
                            <AvatarImage src={avatar || undefined} />
                            <AvatarFallback className="bg-primary/15 text-foreground text-xs font-bold">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56 p-1.5 rounded-2xl">
                        <DropdownMenuLabel className="font-normal p-2">
                          <p className="text-sm font-bold text-foreground truncate">
                            {profile?.full_name || initials}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => navigate("/dashboard")}
                          className="cursor-pointer gap-2 py-2 rounded-xl"
                        >
                          <ChevronRight className="w-4 h-4 text-primary" />
                          <span>Dashboard</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => navigate("/profile/edit")}
                          className="cursor-pointer gap-2 py-2 rounded-xl"
                        >
                          <User className="w-4 h-4 text-muted-foreground" />
                          <span>Edit Profile</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => navigate("/settings/academic")}
                          className="cursor-pointer gap-2 py-2 rounded-xl"
                        >
                          <GraduationCap className="w-4 h-4 text-primary" />
                          <span>Academic Settings</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setShowInstallModal(true)}
                          className="cursor-pointer gap-2 py-2 rounded-xl"
                        >
                          <Smartphone className="w-4 h-4 text-primary" />
                          <span>Install Mobile App</span>
                        </DropdownMenuItem>
                        <div className="px-2 py-1.5">
                          <ThemeToggle variant="segmented" className="w-full" />
                        </div>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={async () => {
                            await signOut();
                            navigate("/auth", { replace: true });
                          }}
                          className="cursor-pointer gap-2 py-2 rounded-xl text-destructive focus:text-destructive"
                        >
                          <LogOut className="w-4 h-4" />
                          <span className="font-semibold">Log Out</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => navigate("/auth?mode=signup")}
                    className="h-10 px-5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs whitespace-nowrap shrink-0 transition-transform active:scale-[0.98] cursor-pointer"
                  >
                    <span>Get Started</span>
                    <ChevronRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                ))}
            </div>

            {/* Mobile & Tablet Controls (<lg) */}
            <div className="flex items-center gap-2 lg:hidden shrink-0">
              {!isLoading && (
                <Button
                  size="sm"
                  onClick={() => navigate(user ? "/dashboard" : "/auth?mode=signup")}
                  className="h-10 px-3.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs whitespace-nowrap cursor-pointer"
                >
                  {user ? "Dashboard" : "Get Started"}
                </Button>
              )}

              <button
                type="button"
                className="h-11 w-11 flex items-center justify-center text-foreground rounded-xl border border-border bg-card hover:bg-secondary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                aria-label={isMenuOpen ? "Close menu" : "Open menu"}
                aria-expanded={isMenuOpen}
              >
                {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Mobile & Tablet Slide-Down Drawer */}
          <div
            className={`lg:hidden overflow-hidden transition-all duration-200 ${
              isMenuOpen ? "max-h-[640px] opacity-100 pb-5" : "max-h-0 opacity-0 pointer-events-none"
            }`}
          >
            <div className="pt-3 border-t border-border space-y-3">
              <div className="flex flex-col gap-1">
                {navLinks.map((link) => (
                  <a
                    key={link.name}
                    href={link.href}
                    onClick={(e) => handleSmoothScroll(e, link.href)}
                    className="min-h-[44px] px-3.5 flex items-center text-sm font-semibold text-foreground hover:bg-secondary rounded-xl transition-colors cursor-pointer"
                  >
                    {link.name}
                  </a>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-3 border-t border-border">
                <Button
                  variant="outline"
                  className="w-full min-h-[44px] justify-center gap-2 rounded-xl border-border bg-card font-semibold text-xs"
                  onClick={() => {
                    setIsMenuOpen(false);
                    setShowInstallModal(true);
                  }}
                >
                  <Smartphone className="w-4 h-4 text-primary" />
                  <span>Install App</span>
                </Button>

                {showTutorButton && (
                  <Button
                    variant="outline"
                    className="w-full min-h-[44px] justify-center gap-2 rounded-xl border-border bg-card font-semibold text-xs"
                    onClick={() => {
                      setIsMenuOpen(false);
                      setShowTutorDialog(true);
                    }}
                  >
                    <GraduationCap className="w-4 h-4 text-primary" />
                    <span>Become a Tutor</span>
                  </Button>
                )}
              </div>

              <div className="pt-1">
                <ThemeToggle variant="segmented" className="w-full" />
              </div>

              <div className="pt-2 border-t border-border">
                {user ? (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <NotificationCenter />
                      <Button
                        className="flex-1 min-h-[44px] justify-center rounded-xl bg-foreground text-background font-bold text-xs"
                        onClick={() => {
                          setIsMenuOpen(false);
                          navigate("/dashboard");
                        }}
                      >
                        Go to Dashboard
                      </Button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsMenuOpen(false);
                          navigate("/profile/edit");
                        }}
                        aria-label="Edit profile"
                        className="h-11 w-11 rounded-full flex items-center justify-center ring-1 ring-border"
                      >
                        <Avatar className="w-9 h-9">
                          <AvatarImage src={avatar || undefined} />
                          <AvatarFallback className="bg-primary/15 text-foreground text-xs font-bold">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                      </button>
                    </div>
                    <Button
                      variant="outline"
                      className="w-full min-h-[44px] justify-center gap-2 rounded-xl border-destructive/30 text-destructive hover:bg-destructive/10 text-xs font-bold"
                      onClick={async () => {
                        setIsMenuOpen(false);
                        await signOut();
                        navigate("/auth", { replace: true });
                      }}
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Log Out</span>
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      className="w-full min-h-[44px] rounded-xl font-semibold text-xs"
                      onClick={() => {
                        setIsMenuOpen(false);
                        navigate("/auth");
                      }}
                    >
                      Sign In
                    </Button>
                    <Button
                      className="w-full min-h-[44px] rounded-xl bg-primary text-primary-foreground font-bold text-xs"
                      onClick={() => {
                        setIsMenuOpen(false);
                        navigate("/start");
                      }}
                    >
                      Get Started
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      <TutorApplicationDialog open={showTutorDialog} onOpenChange={setShowTutorDialog} />

      <InstallAppModal open={showInstallModal} onOpenChange={setShowInstallModal} />
    </>
  );
};

export default Navbar;
