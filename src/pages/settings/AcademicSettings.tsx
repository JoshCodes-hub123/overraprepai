import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { INSTITUTIONS, InstitutionCode } from "@/config/environments";
import { Screen, ScreenHeader, Section, BrandButton } from "@/components/ui-kit";
import { SEO } from "@/components/seo/SEO";
import { toast } from "sonner";
import {
  GraduationCap,
  Building2,
  BookOpen,
  Check,
  Loader2,
  ChevronRight,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const UNIVERSITY_LEVELS = ["100", "200", "300", "400", "500"];

export default function AcademicSettings() {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();

  const [level, setLevel] = useState("");
  const [department, setDepartment] = useState("");
  const [faculty, setFaculty] = useState("");
  const [savingDetails, setSavingDetails] = useState(false);

  useEffect(() => {
    const p = profile as any;
    if (!p) return;
    if (p.level) setLevel(p.level);
    if (p.department) setDepartment(p.department);
    if (p.faculty) setFaculty(p.faculty);
  }, [profile]);

  const p = profile as any;
  const currentInstitutionDef = p?.university && INSTITUTIONS[p.university as InstitutionCode]
    ? INSTITUTIONS[p.university as InstitutionCode]
    : null;

  const handleSaveAcademicProfile = async () => {
    if (!user) return;
    setSavingDetails(true);

    try {
      const updates: Record<string, any> = {
        level: level || null,
        department: department.trim() || null,
        faculty: faculty.trim() || null,
        academic_path: "university",
        environment_type: "university",
      };

      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", user.id);

      if (error) throw error;

      await refreshProfile();
      toast.success("Academic profile updated successfully");
    } catch (err: any) {
      toast.error("Could not save changes", {
        description: err?.message || "Please try again.",
      });
    } finally {
      setSavingDetails(false);
    }
  };

  return (
    <Screen>
      <SEO
        title="Academic Profile Settings · OverraPrep AI"
        description="Manage your university institution, department, and academic level."
        noindex
      />

      <ScreenHeader
        title="Academic Profile"
        subtitle="Configure your university institution, department, and year level"
        back
      />

      <div className="space-y-6 pb-28">
        {/* Active Campus Banner */}
        <Section title="Current University Campus">
          <div className="rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50/70 via-white to-amber-50/30 p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-700">
                  <GraduationCap className="h-6 w-6 text-amber-700" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-neutral-900 text-base">
                      {currentInstitutionDef?.name || p?.university || "University Degree Student"}
                    </h3>
                  </div>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    {currentInstitutionDef?.city
                      ? `${currentInstitutionDef.city} · Campus Curricula & Exam Prep`
                      : "Campus Curricula & Course Materials"}
                  </p>
                </div>
              </div>
            </div>

            {/* Metadata summary */}
            <div className="mt-4 pt-4 border-t border-amber-100 grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-neutral-500 block">Institution</span>
                <span className="font-semibold text-neutral-800">
                  {currentInstitutionDef?.short || p?.university || "Not set"}
                </span>
              </div>
              <div>
                <span className="text-neutral-500 block">Level</span>
                <span className="font-semibold text-neutral-800">
                  {level ? `${level} Level` : "Not set"}
                </span>
              </div>
              <div className="col-span-2">
                <span className="text-neutral-500 block">Department</span>
                <span className="font-semibold text-neutral-800">
                  {department || "Not specified"}
                </span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-amber-100 flex items-center justify-between">
              <span className="text-xs text-neutral-500">
                Want to change your institution or faculty?
              </span>
              <button
                type="button"
                onClick={() => navigate("/onboarding/university")}
                className="text-xs font-semibold text-amber-700 hover:underline inline-flex items-center gap-1"
              >
                Change Campus <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </Section>

        {/* University Profile Details Form */}
        <Section title="Academic Details">
          <div className="rounded-2xl border border-neutral-200 bg-white p-5 space-y-4 shadow-xs">
            <div className="space-y-1.5">
              <Label htmlFor="level" className="text-xs font-medium text-neutral-700">
                Academic Level
              </Label>
              <Select value={level} onValueChange={setLevel}>
                <SelectTrigger id="level" className="rounded-xl border-neutral-200">
                  <SelectValue placeholder="Select level" />
                </SelectTrigger>
                <SelectContent>
                  {UNIVERSITY_LEVELS.map((lvl) => (
                    <SelectItem key={lvl} value={lvl}>
                      {lvl} Level
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="faculty" className="text-xs font-medium text-neutral-700">
                Faculty / School
              </Label>
              <Input
                id="faculty"
                value={faculty}
                onChange={(e) => setFaculty(e.target.value)}
                placeholder="e.g. School of Computing, Faculty of Science"
                className="rounded-xl border-neutral-200"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dept" className="text-xs font-medium text-neutral-700">
                Department
              </Label>
              <Input
                id="dept"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="e.g. Computer Science, Mechanical Engineering"
                className="rounded-xl border-neutral-200"
              />
            </div>

            <div className="pt-2">
              <BrandButton
                variant="primary"
                size="sm"
                onClick={handleSaveAcademicProfile}
                disabled={savingDetails}
                className="w-full sm:w-auto"
              >
                {savingDetails ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" /> Save Academic Details
                  </>
                )}
              </BrandButton>
            </div>
          </div>
        </Section>
      </div>
    </Screen>
  );
}
