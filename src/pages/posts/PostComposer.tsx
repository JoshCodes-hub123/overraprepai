import { useState, useRef } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, ImagePlus, Loader2, Sparkles, Trash2, X } from "lucide-react";
import { SEO } from "@/components/seo/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { uploadPostImage, type PostType } from "@/hooks/usePosts";
import { toast } from "sonner";

const TYPES: { id: PostType; label: string; hint: string }[] = [
  { id: "showcase", label: "Talent Showcase", hint: "Celebrate a student or tutor's story, skills or win." },
  { id: "opportunity", label: "Opportunity", hint: "Scholarships, internships, hackathons, jobs." },
  { id: "article", label: "Article / Story", hint: "Long-form writing with images." },
  { id: "announcement", label: "Announcement", hint: "Short news to share with everyone." },
];

export default function PostComposer() {
  const { user, hasRole } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const initialType = (params.get("type") as PostType) || "showcase";

  const canPublish = hasRole("admin") || hasRole("tutor");

  const [type, setType] = useState<PostType>(initialType);
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [body, setBody] = useState("");
  const [cover, setCover] = useState<string>("");
  const [gallery, setGallery] = useState<string[]>([]);
  const [tagsInput, setTagsInput] = useState("");
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);

  // opportunity extras
  const [organization, setOrganization] = useState("");
  const [category, setCategory] = useState("");
  const [deadline, setDeadline] = useState("");
  const [applyUrl, setApplyUrl] = useState("");

  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const handleCover = async (f: File) => {
    if (!user) return;
    setUploadingCover(true);
    try {
      setCover(await uploadPostImage(user.id, f));
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
    } finally {
      setUploadingCover(false);
    }
  };

  const handleGallery = async (files: FileList | null) => {
    if (!files || !user) return;
    setUploadingGallery(true);
    try {
      const urls: string[] = [];
      for (const f of Array.from(files)) urls.push(await uploadPostImage(user.id, f));
      setGallery((prev) => [...prev, ...urls]);
      // also append into body for easy inline reference
      const inline = urls.map((u) => `\n\n![](${u})`).join("");
      setBody((b) => b + inline);
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
    } finally {
      setUploadingGallery(false);
    }
  };

  const submit = useMutation({
    mutationFn: async (status: "published" | "pending" | "draft") => {
      if (!user) throw new Error("Sign in required");
      const finalStatus = canPublish ? status : (status === "draft" ? "draft" : "pending");
      const tags = tagsInput.split(",").map((t) => t.trim()).filter(Boolean);
      const payload: any = {
        author_id: user.id,
        type,
        status: finalStatus,
        title: title.trim(),
        subtitle: subtitle.trim() || null,
        body,
        cover_image_url: cover || null,
        gallery_urls: gallery,
        tags,
      };
      if (type === "opportunity") {
        payload.organization = organization.trim() || null;
        payload.category = category.trim() || null;
        payload.deadline = deadline || null;
        payload.apply_url = applyUrl.trim() || null;
      }
      const { data, error } = await (supabase.from as any)("posts").insert(payload).select("id").maybeSingle();
      if (error) throw error;
      return { id: data?.id as string, status: finalStatus };
    },
    onSuccess: ({ id, status }) => {
      if (status === "published") {
        toast.success("Published!");
        navigate(`/posts/${id}`);
      } else if (status === "pending") {
        toast.success("Submitted for admin review. Thank you!");
        navigate("/feed");
      } else {
        toast.success("Saved as draft.");
        navigate("/feed");
      }
    },
    onError: (e: any) => toast.error(e.message || "Failed to save"),
  });

  const valid = title.trim() && body.trim();

  return (
    <>
      <SEO title="Compose · OverraPrep" description="Showcase talent, share opportunities, write stories." />
      <div className="min-h-screen bg-background">
        <header className="bg-card border-b border-amber-100/70 sticky top-0 z-30">
          <div className="container mx-auto px-4 h-14 flex items-center gap-3">
            <Link to="/feed" className="text-muted-foreground"><ArrowLeft className="h-5 w-5" /></Link>
            <h1 className="font-display text-base font-bold">New post</h1>
            <div className="ml-auto flex items-center gap-2">
              <Button variant="outline" size="sm"
                onClick={() => submit.mutate("draft")}
                disabled={submit.isPending || !valid}>
                Save draft
              </Button>
              <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white"
                onClick={() => submit.mutate("published")}
                disabled={submit.isPending || !valid}>
                {submit.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                {canPublish ? "Publish" : "Submit for review"}
              </Button>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-5 max-w-2xl space-y-5">
          {!canPublish && (
            <div className="rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2 text-[12.5px] text-amber-900 flex items-start gap-2">
              <Sparkles className="h-4 w-4 mt-0.5 shrink-0" />
              Your post will be reviewed by an admin before it goes live. Add great photos and a clear story to speed up approval.
            </div>
          )}

          {/* Type */}
          <div>
            <label className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Post type</label>
            <div className="grid grid-cols-2 gap-2 mt-1.5">
              {TYPES.map((t) => (
                <button key={t.id} type="button"
                  onClick={() => setType(t.id)}
                  className={`text-left p-3 rounded-lg border transition-colors ${
                    type === t.id ? "border-amber-500 bg-amber-50/60" : "border-amber-100/70 bg-card hover:border-amber-200"
                  }`}>
                  <div className="text-sm font-bold">{t.label}</div>
                  <div className="text-[11.5px] text-muted-foreground leading-snug">{t.hint}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Cover */}
          <div>
            <label className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Cover image</label>
            {cover ? (
              <div className="mt-1.5 relative rounded-xl overflow-hidden border border-amber-100/70 aspect-[16/9] bg-muted">
                <img src={cover} alt="cover" className="w-full h-full object-cover" />
                <button onClick={() => setCover("")} className="absolute top-2 right-2 bg-black/70 text-white rounded-full p-1.5">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <label className="mt-1.5 flex items-center justify-center gap-2 h-32 rounded-xl border-2 border-dashed border-amber-200 bg-amber-50/40 cursor-pointer text-sm text-amber-900 hover:bg-amber-50">
                {uploadingCover ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
                {uploadingCover ? "Uploading…" : "Tap to add cover (16:9 looks best)"}
                <input type="file" accept="image/*" className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleCover(e.target.files[0])} />
              </label>
            )}
          </div>

          {/* Title */}
          <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)}
            className="text-lg font-display font-bold h-12" />
          <Input placeholder="Subtitle (optional)" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} />

          {/* Opportunity extras */}
          {type === "opportunity" && (
            <div className="grid grid-cols-1 gap-2 p-3 rounded-lg border border-amber-100/70 bg-amber-50/40">
              <div className="text-[11px] uppercase tracking-wider font-semibold text-amber-900">Opportunity details</div>
              <Input placeholder="Organization (e.g. MTN Foundation)" value={organization} onChange={(e) => setOrganization(e.target.value)} />
              <Input placeholder="Category (scholarship, internship, hackathon…)" value={category} onChange={(e) => setCategory(e.target.value)} />
              <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
              <Input placeholder="Apply URL (https://…)" value={applyUrl} onChange={(e) => setApplyUrl(e.target.value)} />
            </div>
          )}

          {/* Body */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Story (Markdown supported)</label>
              <label className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-amber-700 cursor-pointer hover:text-amber-800">
                {uploadingGallery ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />}
                Add inline images
                <input type="file" accept="image/*" multiple className="hidden"
                  onChange={(e) => handleGallery(e.target.files)} />
              </label>
            </div>
            <Textarea ref={bodyRef} rows={12} value={body} onChange={(e) => setBody(e.target.value)}
              placeholder="Tell the story. Use **bold**, *italics*, or ![](image-url) for inline images. Images you upload above are auto-inserted here." />
          </div>

          {/* Gallery preview */}
          {gallery.length > 0 && (
            <div>
              <label className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Gallery ({gallery.length})</label>
              <div className="grid grid-cols-3 gap-2 mt-1.5">
                {gallery.map((u) => (
                  <div key={u} className="relative rounded-md overflow-hidden border border-amber-100/70 aspect-square bg-muted">
                    <img src={u} className="w-full h-full object-cover" />
                    <button onClick={() => setGallery((g) => g.filter((x) => x !== u))}
                      className="absolute top-1 right-1 bg-black/70 text-white rounded-full p-1">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tags */}
          <Input placeholder="Tags (comma separated)" value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} />

          <div className="h-4" />
        </main>
      </div>
    </>
  );
}