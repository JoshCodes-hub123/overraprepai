import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { DashboardHero } from "@/components/dashboard/DashboardHero";
import { SEO } from "@/components/seo/SEO";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft } from "lucide-react";
import logo from "@/assets/logo.png";
import { ProfileStatBlocks } from "@/components/profile/ProfileStatBlocks";

type Role = "student" | "tutor" | "admin" | "school" | "parent";

interface PublicProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  profile_image_url: string | null;
  cover_photo_url: string | null;
  department: string | null;
  level: string | null;
  state_of_origin: string | null;
  tutor_code: string | null;
  bio: string | null;
  created_at: string | null;
}

const PublicProfile = () => {
  const { userId } = useParams<{ userId: string }>();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [role, setRole] = useState<Role>("student");
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!userId) return;
      setLoading(true);
      const [{ data: p }, { data: r }] = await Promise.all([
        supabase
          .from("profiles")
          .select(
            "id, full_name, avatar_url, profile_image_url, cover_photo_url, department, level, state_of_origin, tutor_code, bio, created_at, is_official",
          )
          .eq("id", userId)
          .maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", userId).limit(1).maybeSingle(),
      ]);
      if (!alive) return;
      if (!p) {
        setNotFound(true);
      } else {
        setProfile(p as PublicProfile);
        setRole(((r?.role as Role) || "student"));
      }
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [userId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <p className="text-lg font-semibold">Profile not found</p>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/">Back home</Link>
        </Button>
      </div>
    );
  }

  const meta =
    [profile.department, profile.level ? `Level ${profile.level}` : null, profile.tutor_code]
      .filter(Boolean)
      .join(" • ") || undefined;

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={`${profile.full_name || "Member"} on OverraPrep`}
        description={profile.bio || `${profile.full_name || "Member"}'s profile on OverraPrep AI FUTA.`}
        url={`https://overraprep.com/u/${profile.id}`}
      />
      <header className="bg-card border-b border-border sticky top-0 z-40">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center" aria-label="OverraPrep home">
              <img src={logo} alt="OverraPrep" className="h-10 w-auto object-contain" />
            </Link>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/">
                <ArrowLeft className="w-4 h-4 mr-2" aria-hidden="true" />
                Back
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <DashboardHero
          role={role}
          fullName={profile.full_name}
          avatarUrl={profile.avatar_url || profile.profile_image_url}
          coverUrl={profile.cover_photo_url}
          institution="Federal University of Technology, Akure (FUTA)"
          meta={meta}
          showEditProfile={false}
          contact={{
            // Email/phone intentionally omitted from public profile to protect PII
            location: profile.state_of_origin || null,
            joined: profile.created_at
              ? new Date(profile.created_at).toLocaleDateString(undefined, {
                  month: "long",
                  year: "numeric",
                })
              : null,
          }}
        />

        {profile.is_official && (
          <div className="mt-4 flex items-center gap-2 rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-white px-4 py-3">
            <OfficialBadge size="md" />
            <span className="text-[13px] text-amber-900 font-medium">
              Verified by OverraPrep · this is an official account.
            </span>
          </div>
        )}


        {profile.bio && (
          <section className="mt-6 bg-card rounded-2xl border border-border p-6">
            <h2 className="font-serif text-xl font-semibold mb-2">About</h2>
            <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{profile.bio}</p>
          </section>
        )}

        <ProfileStatBlocks userId={profile.id} role={role} />
      </main>
    </div>
  );
};

export default PublicProfile;
