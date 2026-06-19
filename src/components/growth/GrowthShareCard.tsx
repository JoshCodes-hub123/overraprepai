import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Share2, Download, MessageCircle, Instagram, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { logShareEvent } from "@/hooks/useGrowth";
import { useAuth } from "@/hooks/useAuth";
import { resolveAvatarUrl, initialsFor } from "@/lib/avatar";

async function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

export type ShareCardVariant = "success" | "win" | "streak" | "leaderboard" | "milestone";

export interface GrowthShareCardProps {
  variant: ShareCardVariant;
  /** Big headline number/text (e.g. "87", "12-day streak", "#3") */
  bigStat: string | number;
  /** Eyebrow over the big stat */
  eyebrow: string;
  /** Title under the eyebrow */
  title: string;
  /** Subtitle below the big stat */
  subtitle?: string;
  /** Personal handle / name shown at bottom */
  handle?: string;
  /** Optional referral / share url (defaults to overraprepai.com) */
  shareUrl?: string;
  /** Inline button size */
  size?: "sm" | "default";
  /** Custom trigger label */
  label?: string;
  /** Optional profile photo URL rendered on the card (defaults to signed-in user's avatar) */
  avatarUrl?: string;
}

const VARIANT_META: Record<ShareCardVariant, { emoji: string; suffix: string; accent: string }> = {
  success: { emoji: "✨", suffix: "Success Score", accent: "#B8860B" },
  win:     { emoji: "🏆", suffix: "Arena Win",     accent: "#9A6B00" },
  streak:  { emoji: "🔥", suffix: "Study Streak",  accent: "#C2410C" },
  leaderboard: { emoji: "🥇", suffix: "Leaderboard", accent: "#B8860B" },
  milestone:   { emoji: "🎯", suffix: "Milestone",   accent: "#7A5A00" },
};

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number, maxLines = 3): number {
  const words = text.split(" ");
  let line = ""; let lines = 0; let yy = y;
  for (const w of words) {
    const test = line + w + " ";
    if (ctx.measureText(test).width > maxWidth && line) {
      if (++lines >= maxLines) { ctx.fillText(line.trim() + "…", x, yy); return yy; }
      ctx.fillText(line, x, yy); line = w + " "; yy += lineHeight;
    } else line = test;
  }
  ctx.fillText(line, x, yy);
  return yy;
}

async function makeCard(p: GrowthShareCardProps): Promise<Blob> {
  const meta = VARIANT_META[p.variant];
  const c = document.createElement("canvas");
  c.width = 1080; c.height = 1350;
  const ctx = c.getContext("2d")!;

  // Background: white with subtle gold corner
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, 1080, 1350);
  const radial = ctx.createRadialGradient(900, 200, 50, 900, 200, 900);
  radial.addColorStop(0, "rgba(229, 185, 46, 0.35)");
  radial.addColorStop(1, "rgba(229, 185, 46, 0)");
  ctx.fillStyle = radial; ctx.fillRect(0, 0, 1080, 1350);
  // Gold accent strip
  ctx.fillStyle = meta.accent;
  ctx.fillRect(0, 0, 12, 1350);

  // Header: brand
  ctx.fillStyle = "#0B0B0B";
  ctx.font = "800 56px Inter, sans-serif";
  ctx.fillText("OverraPrep", 80, 130);
  ctx.font = "600 28px Inter, sans-serif";
  ctx.fillStyle = "#7A5A00";
  ctx.fillText("Study Smart, Not Hard.", 80, 172);

  // Eyebrow chip
  const eyebrow = `${meta.emoji}  ${p.eyebrow.toUpperCase()}`;
  ctx.font = "700 26px Inter, sans-serif";
  const chipW = ctx.measureText(eyebrow).width + 60;
  ctx.fillStyle = "rgba(229, 185, 46, 0.18)";
  roundRect(ctx, 80, 280, chipW, 60, 30);
  ctx.fillStyle = meta.accent;
  ctx.fillText(eyebrow, 110, 320);

  // Title
  ctx.fillStyle = "#0B0B0B";
  ctx.font = "800 72px Inter, sans-serif";
  wrapText(ctx, p.title, 80, 430, 920, 84, 2);

  // Big stat
  ctx.textAlign = "center";
  ctx.fillStyle = meta.accent;
  ctx.font = "900 320px Inter, sans-serif";
  const big = String(p.bigStat);
  ctx.fillText(big, 540, 880);

  // Subtitle
  if (p.subtitle) {
    ctx.font = "600 38px Inter, sans-serif";
    ctx.fillStyle = "#3A3A3A";
    ctx.fillText(p.subtitle, 540, 960);
  }

  // Suffix label
  ctx.font = "700 30px Inter, sans-serif";
  ctx.fillStyle = "#5A5A5A";
  ctx.fillText(meta.suffix.toUpperCase(), 540, 1020);

  // Footer — personalised author chip (avatar + name)
  ctx.textAlign = "left";
  const footerY = 1190;
  const avatarSize = 84;
  const avatarX = 80;
  const avatarCY = footerY + avatarSize / 2;

  // Avatar circle (image if available, otherwise gold initials disc)
  let img: HTMLImageElement | null = null;
  if (p.avatarUrl) img = await loadImage(p.avatarUrl);

  ctx.save();
  ctx.beginPath();
  ctx.arc(avatarX + avatarSize / 2, avatarCY, avatarSize / 2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  if (img) {
    ctx.drawImage(img, avatarX, footerY, avatarSize, avatarSize);
  } else {
    const g = ctx.createLinearGradient(avatarX, footerY, avatarX + avatarSize, footerY + avatarSize);
    g.addColorStop(0, "#F5C04A");
    g.addColorStop(1, meta.accent);
    ctx.fillStyle = g;
    ctx.fillRect(avatarX, footerY, avatarSize, avatarSize);
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "800 36px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(initialsFor(p.handle, "U"), avatarX + avatarSize / 2, avatarCY + 2);
    ctx.textBaseline = "alphabetic";
    ctx.textAlign = "left";
  }
  ctx.restore();
  // Ring around avatar
  ctx.beginPath();
  ctx.arc(avatarX + avatarSize / 2, avatarCY, avatarSize / 2 + 2, 0, Math.PI * 2);
  ctx.strokeStyle = meta.accent;
  ctx.lineWidth = 3;
  ctx.stroke();

  // Name + handle text
  const textX = avatarX + avatarSize + 22;
  if (p.handle) {
    ctx.font = "800 34px Inter, sans-serif";
    ctx.fillStyle = "#0B0B0B";
    ctx.fillText(p.handle, textX, avatarCY - 4);
  }
  ctx.font = "600 22px Inter, sans-serif";
  ctx.fillStyle = "#7A5A00";
  ctx.fillText("on OverraPrep AI", textX, avatarCY + 26);

  ctx.font = "600 24px Inter, sans-serif";
  ctx.fillStyle = "#5A5A5A";
  ctx.fillText("overraprepai.com  ·  join me 🚀", 80, 1310);

  // Bottom gold rule
  ctx.fillStyle = meta.accent;
  ctx.fillRect(0, 1338, 1080, 12);

  return new Promise((res) => c.toBlob((b) => res(b!), "image/png"));
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  ctx.fill();
}

function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}

export function GrowthShareCard(propsIn: GrowthShareCardProps) {
  const { profile, user } = useAuth();
  const props: GrowthShareCardProps = {
    ...propsIn,
    handle: propsIn.handle || profile?.full_name || (user?.email ? user.email.split("@")[0] : undefined),
    avatarUrl: propsIn.avatarUrl || resolveAvatarUrl(profile),
  };
  const [open, setOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const blobRef = useRef<Blob | null>(null);
  const shareUrl = props.shareUrl || "https://overraprepai.com";


  useEffect(() => {
    let revoke: string | null = null;
    if (open) {
      makeCard(props).then((b) => {
        blobRef.current = b;
        const u = URL.createObjectURL(b);
        revoke = u;
        setPreviewUrl(u);
      });
    }
    return () => { if (revoke) URL.revokeObjectURL(revoke); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, props.variant, props.bigStat, props.title, props.subtitle, props.eyebrow, props.handle, props.avatarUrl]);

  const ensureBlob = async () => blobRef.current ?? (blobRef.current = await makeCard(props));

  const shareNative = async () => {
    const blob = await ensureBlob();
    const file = new File([blob], `overraprep-${props.variant}.png`, { type: "image/png" });
    logShareEvent(`share_card_${props.variant}`, "native");
    try {
      if ((navigator as any).canShare?.({ files: [file] })) {
        await (navigator as any).share({ files: [file], title: props.title, text: `${props.title} on OverraPrep`, url: shareUrl });
      } else {
        downloadBlob(blob, `overraprep-${props.variant}.png`);
        toast.success("Image saved — paste into your story or chat");
      }
    } catch (e: any) {
      if (e?.name !== "AbortError") toast.error("Could not share");
    }
  };

  const shareWhatsApp = async () => {
    await ensureBlob();
    logShareEvent(`share_card_${props.variant}`, "whatsapp");
    const text = encodeURIComponent(`${VARIANT_META[props.variant].emoji} ${props.title}\n${shareUrl}`);
    window.open(`https://wa.me/?text=${text}`, "_blank", "noopener,noreferrer");
    toast.message("Tip", { description: "Tap Save image below, then attach it in WhatsApp." });
  };

  const shareInstagram = async () => {
    const blob = await ensureBlob();
    logShareEvent(`share_card_${props.variant}`, "instagram");
    downloadBlob(blob, `overraprep-${props.variant}.png`);
    toast.success("Saved to your device", { description: "Open Instagram → Story → pick the image from your gallery." });
  };

  const save = async () => {
    const blob = await ensureBlob();
    logShareEvent(`share_card_${props.variant}`, "download");
    downloadBlob(blob, `overraprep-${props.variant}.png`);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size={props.size ?? "sm"} variant="outline" className="border-amber-300 text-amber-800 hover:bg-amber-50">
          <Share2 className="w-4 h-4 mr-1.5" /> {props.label ?? "Share"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        <div className="bg-gradient-to-b from-amber-50 to-background p-4">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-amber-600" />
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-800">Share card</p>
          </div>
          <div className="rounded-2xl overflow-hidden border border-amber-200 bg-white shadow-sm aspect-[4/5] flex items-center justify-center">
            {previewUrl ? (
              <img src={previewUrl} alt="Share preview" className="w-full h-full object-contain" />
            ) : (
              <div className="text-sm text-muted-foreground">Generating…</div>
            )}
          </div>
        </div>
        <div className="p-4 grid grid-cols-2 gap-2 border-t">
          <Button onClick={shareWhatsApp} className="bg-[#25D366] hover:bg-[#1ebd5a] text-white">
            <MessageCircle className="w-4 h-4 mr-1.5" /> WhatsApp
          </Button>
          <Button onClick={shareInstagram} className="bg-gradient-to-r from-[#F58529] via-[#DD2A7B] to-[#8134AF] text-white hover:opacity-95">
            <Instagram className="w-4 h-4 mr-1.5" /> Instagram
          </Button>
          <Button onClick={shareNative} variant="outline">
            <Share2 className="w-4 h-4 mr-1.5" /> More…
          </Button>
          <Button onClick={save} variant="outline">
            <Download className="w-4 h-4 mr-1.5" /> Save image
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
