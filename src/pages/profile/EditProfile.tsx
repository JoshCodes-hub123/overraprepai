import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import {
  ArrowLeft,
  Loader2,
  Camera,
  User,
  Save,
  Image as ImageIcon,
} from "lucide-react";
import logo from "@/assets/logo.png";
import { NativeSettings } from "@/components/native/NativeSettings";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { uploadToBucketWithVerification } from "@/lib/storageUpload";
import { CoverCropDialog } from "@/components/profile/CoverCropDialog";
import { useStudentLevel, LEVEL_OPTIONS } from "@/hooks/useStudentLevel";

const GENDERS = ["Male", "Female", "Other", "Prefer not to say"];

const DEPARTMENTS = [
  "Agricultural & Resource Economics",
  "Agricultural Extension & Communication Technology",
  "Architecture",
  "Biology",
  "Building Technology",
  "Biochemistry",
  "Business Administration",
  "Chemistry",
  "Civil Engineering",
  "Computer Science",
  "Crop, Soil & Pest Management",
  "Earth Sciences",
  "Ecotourism & Wildlife Management",
  "Electrical & Electronics Engineering",
  "Estate Management",
  "Food Science & Technology",
  "Fisheries & Aquaculture Technology",
  "Forestry & Wood Technology",
  "Industrial & Production Engineering",
  "Industrial Design",
  "Mathematical Sciences",
  "Mechanical Engineering",
  "Metallurgical & Materials Engineering",
  "Mining Engineering",
  "Physics",
  "Quantity Surveying",
  "Remote Sensing & Geoscience Information System",
  "Statistics",
  "Transport Management Technology",
  "Urban & Regional Planning",
];

const EditProfile = () => {
  const navigate = useNavigate();
  const { user, profile, isLoading: authLoading, refreshProfile } = useAuth();
  const { setLevel: persistLevel } = useStudentLevel();
  const [fullName, setFullName] = useState("");
  const [department, setDepartment] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Extended fields
  const [level, setLevel] = useState("");
  const [currentCgpa, setCurrentCgpa] = useState("");
  const [aspiringCgpa, setAspiringCgpa] = useState("");
  const [matricNo, setMatricNo] = useState("");
  const [phone, setPhone] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("");
  const [bio, setBio] = useState("");
  const [stateOfOrigin, setStateOfOrigin] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [xHandle, setXHandle] = useState("");
  const [interests, setInterests] = useState("");
  const [hobbies, setHobbies] = useState("");
  const [organisationName, setOrganisationName] = useState("");
  const [organisationLogoUrl, setOrganisationLogoUrl] = useState<string | null>(null);
  const [isUploadingOrgLogo, setIsUploadingOrgLogo] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (profile) {
      const p: any = profile;
      setFullName(profile.full_name || "");
      setDepartment(profile.department || "");
      setAvatarUrl(profile.avatar_url);
      setCoverUrl(p.cover_photo_url ?? null);
      setLevel(p.level || "");
      setCurrentCgpa(p.current_cgpa != null ? String(p.current_cgpa) : "");
      setAspiringCgpa(p.aspiring_cgpa != null ? String(p.aspiring_cgpa) : "");
      setMatricNo(p.matric_no || "");
      setPhone(p.phone || "");
      setDob(p.date_of_birth || "");
      setGender(p.gender || "");
      setBio(p.bio || "");
      setStateOfOrigin(p.state_of_origin || "");
      setLinkedin(p.linkedin_handle || "");
      setXHandle(p.x_handle || "");
      setInterests((p.study_interests || []).join(", "));
      setHobbies((p.hobbies || []).join(", "));
      setOrganisationName(p.organisation_name || "");
      setOrganisationLogoUrl(p.organisation_logo_url || null);
    }
  }, [profile]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset the input so picking the same file twice still triggers change
    e.target.value = "";
    if (!file || !user) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be less than 2MB");
      return;
    }

    // Instant local preview while we upload (never saved to DB)
    const localPreview = URL.createObjectURL(file);
    const previousUrl = avatarUrl;
    setAvatarUrl(localPreview);

    setIsUploading(true);
    const fileExt = (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = `${user.id}/avatar-${Date.now()}.${fileExt}`;

    try {
      const { publicUrl } = await uploadToBucketWithVerification({
        bucket: "avatars",
        path,
        file,
      });

      // Persist immediately so the dashboard avatar updates without a full Save.
      // Write to BOTH columns so every legacy reader picks it up.
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl, profile_image_url: publicUrl } as any)
        .eq("id", user.id);

      if (updateError) throw updateError;

      setAvatarUrl(publicUrl);
      await refreshProfile();
      toast.success("Profile picture saved");
    } catch (error: any) {
      console.error("Avatar upload failed:", error);
      toast.error("Failed to upload avatar", {
        description: error?.message || "Check console for details",
      });
      // Roll back preview to whatever was there before
      setAvatarUrl(previousUrl);
    } finally {
      URL.revokeObjectURL(localPreview);
      setIsUploading(false);
    }
  };

  // === Cover photo: pick → crop dialog → verified upload ===
  const [coverDialogOpen, setCoverDialogOpen] = useState(false);
  const [coverDraftSrc, setCoverDraftSrc] = useState<string | null>(null);

  const handleCoverPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset the input so picking the same file twice still triggers change
    e.target.value = "";
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Cover image must be less than 8MB");
      return;
    }
    const url = URL.createObjectURL(file);
    setCoverDraftSrc(url);
    setCoverDialogOpen(true);
  };

  const handleCroppedCoverSave = async (blob: Blob) => {
    if (!user) return;
    setIsUploadingCover(true);
    const path = `${user.id}/cover.jpg`;
    try {
      const { publicUrl } = await uploadToBucketWithVerification({
        bucket: "profile-covers",
        path,
        file: blob,
        contentType: "image/jpeg",
      });
      await supabase
        .from("profiles")
        .update({ cover_photo_url: publicUrl } as any)
        .eq("id", user.id);
      setCoverUrl(publicUrl);
      await refreshProfile();
      setCoverDialogOpen(false);
      if (coverDraftSrc) URL.revokeObjectURL(coverDraftSrc);
      setCoverDraftSrc(null);
      toast.success("Cover saved successfully", {
        description: `Stored at profile-covers/${path}`,
      });
    } catch (err: any) {
      console.error("Cover upload failed:", err);
      toast.error("Failed to upload cover photo", {
        description: err?.message || "Check console for details",
      });
    } finally {
      setIsUploadingCover(false);
    }
  };

  const handleOrgLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }
    if (file.size > 1024 * 1024) {
      toast.error("Logo must be less than 1MB");
      return;
    }
    setIsUploadingOrgLogo(true);
    try {
      const fileExt = (file.name.split(".").pop() || "png").toLowerCase();
      const path = `${user.id}/org-logo-${Date.now()}.${fileExt}`;
      const { error: upErr } = await supabase.storage
        .from("tutor-profiles")
        .upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const publicUrl = supabase.storage.from("tutor-profiles").getPublicUrl(path).data.publicUrl;
      setOrganisationLogoUrl(publicUrl);
      toast.success("Logo uploaded — remember to Save");
    } catch (err: any) {
      console.error("Org logo upload failed", err);
      toast.error("Failed to upload logo", { description: err?.message });
    } finally {
      setIsUploadingOrgLogo(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    if (!fullName.trim()) {
      toast.error("Please enter your name");
      return;
    }
    if (isUploading) {
      toast.error("Please wait for the profile picture to finish uploading");
      return;
    }

    // Defensive: never persist a temporary blob preview URL.
    const safeAvatarUrl =
      avatarUrl && !avatarUrl.startsWith("blob:") ? avatarUrl : profile?.avatar_url ?? null;

    setIsSaving(true);
    try {
      const toArr = (s: string) => s.split(",").map(t => t.trim()).filter(Boolean);
      const num = (s: string) => (s.trim() === "" ? null : Math.min(5, Math.max(0, parseFloat(s))));
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim(),
          department: department || null,
          avatar_url: safeAvatarUrl,
          profile_image_url: safeAvatarUrl,
          cover_photo_url: coverUrl,
          level: level || null,
          current_cgpa: num(currentCgpa),
          aspiring_cgpa: num(aspiringCgpa),
          matric_no: matricNo.trim() || null,
          phone: phone.trim() || null,
          date_of_birth: dob || null,
          gender: gender || null,
          bio: bio.trim() || null,
          state_of_origin: stateOfOrigin.trim() || null,
          linkedin_handle: linkedin.trim() || null,
          x_handle: xHandle.trim() || null,
          study_interests: toArr(interests),
          hobbies: toArr(hobbies),
          organisation_name: organisationName.trim() || null,
          organisation_logo_url: organisationLogoUrl,
        } as any)
        .eq("id", user.id);

      if (error) throw error;

      await refreshProfile();
      toast.success("Profile updated successfully");
      navigate(-1);
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center group">
              <img 
                src={logo} 
                alt="OverraPrep AI FUTA" 
                className="h-10 w-auto object-contain"
              />
            </Link>

            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-xl">
        <div className="mb-8">
          <h1 className="font-display text-2xl font-bold text-foreground mb-2">
            Edit Profile
          </h1>
          <p className="text-muted-foreground">
            Update your personal information
          </p>
        </div>

        <div className="bg-card rounded-xl border border-border overflow-hidden">
          {/* Cover photo banner */}
          <div
            className="relative h-36 sm:h-44 w-full bg-gradient-to-br from-primary/20 via-accent/10 to-primary/5"
            style={coverUrl ? { backgroundImage: `url(${coverUrl})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
          >
            <label
              htmlFor="cover-upload"
              className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 bg-background/90 hover:bg-background backdrop-blur text-foreground text-xs font-medium px-3 py-1.5 rounded-full border border-border cursor-pointer shadow-sm"
            >
              {isUploadingCover ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImageIcon className="w-3.5 h-3.5" />}
              {coverUrl ? "Change cover" : "Add cover"}
            </label>
            <input
              id="cover-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleCoverPick}
              disabled={isUploadingCover}
            />
          </div>

          <CoverCropDialog
            open={coverDialogOpen}
            onOpenChange={(o) => {
              setCoverDialogOpen(o);
              if (!o && coverDraftSrc) {
                URL.revokeObjectURL(coverDraftSrc);
                setCoverDraftSrc(null);
              }
            }}
            imageSrc={coverDraftSrc}
            onCropped={handleCroppedCoverSave}
            saving={isUploadingCover}
          />

          <div className="p-6 space-y-6">
          {/* Avatar Section */}
          <div className="flex flex-col items-center gap-4 -mt-16">
            <div className="relative">
              <Avatar className="w-24 h-24 border-4 border-border">
                <AvatarImage src={avatarUrl || undefined} alt={fullName || profile?.full_name || "Profile"} />
                <AvatarFallback className="bg-primary/10 text-primary text-2xl font-bold">
                  {getInitials(fullName || profile?.full_name)}
                </AvatarFallback>
              </Avatar>
              <label
                htmlFor="avatar-upload"
                className="absolute bottom-0 right-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center cursor-pointer hover:bg-primary/90 transition-colors"
              >
                {isUploading ? (
                  <Loader2 className="w-4 h-4 text-primary-foreground animate-spin" />
                ) : (
                  <Camera className="w-4 h-4 text-primary-foreground" />
                )}
              </label>
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
                disabled={isUploading}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Click the camera icon to upload a new photo
            </p>
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Input
                id="department"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="e.g. Computer Science"
                maxLength={120}
                autoComplete="organization-title"
              />
              <p className="text-[11px] text-muted-foreground">
                Type your department exactly as it appears on your school records.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Level</Label>
                <Select
                  value={level}
                  onValueChange={async (v) => {
                    setLevel(v);
                    // Persist + invalidate queries immediately so dashboards / courses refresh
                    await persistLevel(v);
                  }}
                >
                  <SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger>
                  <SelectContent>{LEVEL_OPTIONS.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Matric No</Label>
                <Input value={matricNo} onChange={(e) => setMatricNo(e.target.value)} placeholder="e.g. CSC/19/0001" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Current CGPA</Label>
                <Input type="number" step="0.01" min="0" max="5" value={currentCgpa} onChange={(e) => setCurrentCgpa(e.target.value)} placeholder="0.00 – 5.00" />
              </div>
              <div className="space-y-2">
                <Label>Aspiring CGPA</Label>
                <Input type="number" step="0.01" min="0" max="5" value={aspiringCgpa} onChange={(e) => setAspiringCgpa(e.target.value)} placeholder="Goal" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+234..." />
              </div>
              <div className="space-y-2">
                <Label>Date of Birth</Label>
                <Input type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Gender</Label>
                <Select value={gender} onValueChange={setGender}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{GENDERS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>State of Origin</Label>
                <Input value={stateOfOrigin} onChange={(e) => setStateOfOrigin(e.target.value)} placeholder="e.g. Lagos" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Bio</Label>
              <Textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell others about yourself..." rows={3} maxLength={500} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>LinkedIn</Label>
                <Input value={linkedin} onChange={(e) => setLinkedin(e.target.value)} placeholder="username" />
              </div>
              <div className="space-y-2">
                <Label>X (Twitter)</Label>
                <Input value={xHandle} onChange={(e) => setXHandle(e.target.value)} placeholder="@handle" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Study Interests <span className="text-xs text-muted-foreground">(comma separated)</span></Label>
              <Input value={interests} onChange={(e) => setInterests(e.target.value)} placeholder="AI, Algorithms, Calculus" />
            </div>

            <div className="space-y-2">
              <Label>Hobbies <span className="text-xs text-muted-foreground">(comma separated)</span></Label>
              <Input value={hobbies} onChange={(e) => setHobbies(e.target.value)} placeholder="Football, Music, Reading" />
            </div>

            {/* Organisation (tutors / partners) */}
            <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4 space-y-3">
              <div>
                <h3 className="font-display font-bold text-sm text-foreground">Your organisation <span className="text-xs font-normal text-muted-foreground">(optional)</span></h3>
                <p className="text-xs text-muted-foreground">Shown as a badge next to your name on quizzes and your tutor profile.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="org-name">Organisation name</Label>
                <Input
                  id="org-name"
                  value={organisationName}
                  onChange={(e) => setOrganisationName(e.target.value)}
                  placeholder="e.g. FUTA · Mech Eng, TopRank Tutors, Independent"
                  maxLength={60}
                />
              </div>
              <div className="space-y-2">
                <Label>Organisation logo</Label>
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-lg border border-amber-200 bg-white flex items-center justify-center overflow-hidden shrink-0">
                    {organisationLogoUrl ? (
                      <img src={organisationLogoUrl} alt="Org logo" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="w-4 h-4 text-amber-500" />
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <label
                      htmlFor="org-logo-upload"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-amber-300 text-amber-800 text-xs font-semibold cursor-pointer hover:bg-amber-50"
                    >
                      {isUploadingOrgLogo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImageIcon className="w-3.5 h-3.5" />}
                      {organisationLogoUrl ? "Change logo" : "Upload logo"}
                    </label>
                    {organisationLogoUrl && (
                      <button
                        type="button"
                        onClick={() => setOrganisationLogoUrl(null)}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        Remove
                      </button>
                    )}
                    <input
                      id="org-logo-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleOrgLogoUpload}
                      disabled={isUploadingOrgLogo}
                    />
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground">PNG or JPG, square works best, under 1MB.</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                value={user?.email || ""}
                disabled
                className="bg-muted/50"
              />
              <p className="text-xs text-muted-foreground">
                Email cannot be changed
              </p>
            </div>
          </div>

          {/* Appearance & Theme Preference */}
          <div className="space-y-3 pt-2">
            <h3 className="font-display text-base font-semibold">Appearance</h3>
            <div className="rounded-2xl border border-border/80 bg-card p-4 space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">Theme Mode</p>
                  <p className="text-xs text-muted-foreground">Choose clean Light, deep navy Dark, or match your device System</p>
                </div>
              </div>
              <ThemeToggle variant="segmented" className="w-full" />
            </div>
          </div>

          {/* Native mobile features */}
          <div className="space-y-3 pt-2">
            <h3 className="font-display text-base font-semibold">Mobile app</h3>
            <NativeSettings />
          </div>

          {/* Save Button */}
          <Button
            onClick={handleSave}
            disabled={isSaving || isUploading}
            className="w-full"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
          <Link
            to="/settings/academic"
            className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50/40 p-4 hover:bg-amber-50 transition-colors"
          >
            <div className="min-w-0">
              <p className="font-display font-bold text-foreground">Academic Profile</p>
              <p className="text-xs text-muted-foreground">Manage your university campus, faculty, department, and level.</p>
            </div>
            <span className="text-amber-700 font-semibold text-sm shrink-0">Configure →</span>
          </Link>
          </div>
        </div>
      </main>
    </div>
  );
};

export default EditProfile;
