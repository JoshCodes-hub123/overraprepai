import { useState, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, GraduationCap, ChevronRight, Smartphone } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import TutorApplicationDialog from "@/components/landing/TutorApplicationDialog";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { InstallAppModal } from "@/components/pwa/InstallAppModal";
import logo from "@/assets/logo.png";

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showTutorDialog, setShowTutorDialog] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, isLoading, hasRole } = useAuth();
  const initials = (profile?.full_name || user?.email || "U").split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  const avatar = (profile as any)?.avatar_url || (profile as any)?.profile_image_url || null;

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: "Features", href: "#features" },
    { name: "How It Works", href: "#how-it-works" },
    { name: "Tutors", href: "/tutors", isRoute: true },
    { name: "Theory Prep", href: "/theory", isRoute: true },
    { name: "Study Hub", href: "/study-hub", isRoute: true },
    { name: "FAQ", href: "#faq" },
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
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled 
          ? 'bg-card/90 backdrop-blur-xl shadow-lg shadow-foreground/5 border-b border-border/50' 
          : 'bg-transparent'
      }`}>
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16 md:h-18">
            {/* Logo */}
            <Link to="/" className="flex items-center group">
              <img 
                src={logo} 
                alt="OverraPrep AI FUTA" 
                className="h-9 md:h-10 w-auto object-contain transition-transform group-hover:scale-105"
              />
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-1">
              {navLinks.map((link) => (
                link.isRoute ? (
                  <Link
                    key={link.name}
                    to={link.href}
                    className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/50 transition-all duration-200"
                  >
                    {link.name}
                  </Link>
                ) : (
                  <a
                    key={link.name}
                    href={link.href}
                    onClick={(e) => handleSmoothScroll(e, link.href)}
                    className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/50 transition-all duration-200 cursor-pointer"
                  >
                    {link.name}
                  </a>
                )
              ))}
            </div>

            {/* Desktop CTA */}
            <div className="hidden lg:flex items-center gap-2.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowInstallModal(true)}
                className="gap-1.5 text-xs font-semibold rounded-full border-primary/40 text-foreground hover:bg-primary/10 shadow-xs"
              >
                <Smartphone className="w-3.5 h-3.5 text-primary" />
                Install App
              </Button>

              {showTutorButton && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShowTutorDialog(true)}
                  className="gap-1.5 text-muted-foreground hover:text-foreground text-xs"
                >
                  <GraduationCap className="w-4 h-4" />
                  Become a Tutor
                </Button>
              )}
              {!isLoading && (
                user ? (
                  <>
                    <NotificationCenter />
                    <Button 
                      variant="hero" 
                      size="sm" 
                      onClick={() => navigate("/dashboard")}
                      className="shadow-md shadow-primary/20 text-xs font-semibold"
                    >
                      Dashboard
                      <ChevronRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                    <button
                      onClick={() => navigate("/profile/edit")}
                      aria-label="Edit profile"
                      className="rounded-full ring-2 ring-primary/20 hover:ring-primary/50 transition-all"
                    >
                      <Avatar className="w-9 h-9">
                        <AvatarImage src={avatar || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">{initials}</AvatarFallback>
                      </Avatar>
                    </button>
                  </>
                ) : (
                  <>
                    <Button variant="ghost" size="sm" onClick={() => navigate("/auth")} className="text-xs">
                      Sign In
                    </Button>
                    <Button 
                      variant="hero" 
                      size="sm" 
                      onClick={() => navigate("/start")}
                      className="shadow-md shadow-primary/20 text-xs font-semibold rounded-full px-4"
                    >
                      Get Started
                      <ChevronRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  </>
                )
              )}
            </div>

            {/* Mobile Menu Button */}
            <div className="flex items-center gap-1.5 lg:hidden">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowInstallModal(true)}
                className="h-8 px-2.5 text-[11px] font-semibold rounded-full border-primary/40 text-primary hover:bg-primary/10"
              >
                <Smartphone className="w-3.5 h-3.5 mr-1" />
                App
              </Button>

              <button
                className="p-2 text-foreground rounded-lg hover:bg-muted/50 transition-colors"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                aria-label="Toggle menu"
              >
                {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          <div className={`lg:hidden overflow-hidden transition-all duration-300 ${
            isMenuOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
          }`}>
            <div className="py-4 border-t border-border/50">
              <div className="flex flex-col gap-1">
                {navLinks.map((link) => (
                  link.isRoute ? (
                    <Link
                      key={link.name}
                      to={link.href}
                      className="px-4 py-3 text-muted-foreground hover:text-foreground font-medium transition-colors rounded-lg hover:bg-muted/50"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      {link.name}
                    </Link>
                  ) : (
                    <a
                      key={link.name}
                      href={link.href}
                      onClick={(e) => handleSmoothScroll(e, link.href)}
                      className="px-4 py-3 text-muted-foreground hover:text-foreground font-medium transition-colors rounded-lg hover:bg-muted/50 cursor-pointer"
                    >
                      {link.name}
                    </a>
                  )
                ))}
                <div className="flex flex-col gap-2 pt-4 mt-2 border-t border-border/50">
                  <Button
                    variant="outline"
                    className="w-full justify-center gap-1.5 border-primary/30"
                    onClick={() => { setIsMenuOpen(false); setShowInstallModal(true); }}
                  >
                    <Smartphone className="w-4 h-4 text-primary" />
                    Install OverraPrep App (Play Store / PWA)
                  </Button>

                  {showTutorButton && (
                    <Button 
                      variant="outline" 
                      className="w-full justify-center gap-1.5" 
                      onClick={() => { setIsMenuOpen(false); setShowTutorDialog(true); }}
                    >
                      <GraduationCap className="w-4 h-4" />
                      Become a Tutor
                    </Button>
                  )}
                  {user ? (
                    <div className="flex items-center gap-2">
                      <NotificationCenter />
                      <Button 
                        variant="hero" 
                        className="flex-1 justify-center" 
                        onClick={() => { setIsMenuOpen(false); navigate("/dashboard"); }}
                      >
                        Go to Dashboard
                      </Button>
                      <button
                        onClick={() => { setIsMenuOpen(false); navigate("/profile/edit"); }}
                        aria-label="Edit profile"
                        className="rounded-full ring-2 ring-primary/20"
                      >
                        <Avatar className="w-9 h-9">
                          <AvatarImage src={avatar || undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">{initials}</AvatarFallback>
                        </Avatar>
                      </button>
                    </div>
                  ) : (
                    <>
                      <Button variant="ghost" className="w-full justify-center" onClick={() => navigate("/auth")}>
                        Sign In
                      </Button>
                      <Button variant="hero" className="w-full justify-center" onClick={() => navigate("/start")}>
                        Get Started Free
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <TutorApplicationDialog 
        open={showTutorDialog} 
        onOpenChange={setShowTutorDialog} 
      />

      <InstallAppModal
        open={showInstallModal}
        onOpenChange={setShowInstallModal}
      />
    </>
  );
};

export default Navbar;
