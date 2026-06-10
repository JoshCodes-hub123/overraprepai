import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Share2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import logo from '@/assets/logo.png';

export interface QuizResultCardProps {
  quizTitle: string;
  courseCode?: string;
  score: number;
  total: number;
  timeSeconds: number;
  mode?: string;
  studentName?: string;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function wrap(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lh: number, maxLines = 2) {
  const words = text.split(' ');
  let line = '';
  let lines: string[] = [];
  for (const w of words) {
    const test = line + w + ' ';
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line.trim());
      line = w + ' ';
      if (lines.length === maxLines - 1) break;
    } else line = test;
  }
  lines.push(line.trim());
  if (lines.length === maxLines && ctx.measureText(lines[maxLines - 1]).width > maxW) {
    while (lines[maxLines - 1] && ctx.measureText(lines[maxLines - 1] + '…').width > maxW) {
      lines[maxLines - 1] = lines[maxLines - 1].slice(0, -1);
    }
    lines[maxLines - 1] += '…';
  }
  lines.forEach((ln, i) => ctx.fillText(ln, x, y + i * lh));
  return lines.length * lh;
}

async function renderCard(p: QuizResultCardProps): Promise<Blob> {
  const W = 1080, H = 1350;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d')!;

  // background: warm cream → gold radial
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#FFFBEA');
  bg.addColorStop(1, '#F4D58D');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // subtle gold rings
  ctx.save();
  ctx.globalAlpha = 0.18;
  ctx.strokeStyle = '#B8860B';
  ctx.lineWidth = 2;
  for (let r = 200; r < 900; r += 80) {
    ctx.beginPath(); ctx.arc(W / 2, 720, r, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();

  // header bar
  ctx.fillStyle = '#1a1a1a';
  try {
    const lg = await loadImage(logo);
    const lh = 90;
    const lw = lg.width * (lh / lg.height);
    ctx.drawImage(lg, 70, 60, lw, lh);
  } catch {
    ctx.font = 'bold 56px Inter, system-ui, sans-serif';
    ctx.fillText('OverraPrep', 70, 120);
  }
  ctx.font = '600 26px Inter, system-ui, sans-serif';
  ctx.fillStyle = '#7a5a00';
  ctx.textAlign = 'right';
  ctx.fillText('Study Smart, Not Hard.', W - 70, 110);
  ctx.textAlign = 'left';

  // White card
  const cardX = 60, cardY = 220, cardW = W - 120, cardH = 1000;
  roundRect(ctx, cardX, cardY, cardW, cardH, 32);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.strokeStyle = 'rgba(184,134,11,0.35)';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Quiz title
  ctx.fillStyle = '#1a1a1a';
  ctx.font = 'bold 44px Inter, system-ui, sans-serif';
  ctx.textAlign = 'center';
  const titleH = wrap(ctx, p.quizTitle, W / 2, cardY + 80, cardW - 100, 52, 2);

  if (p.courseCode) {
    ctx.font = '500 26px Inter, system-ui, sans-serif';
    ctx.fillStyle = '#7a5a00';
    ctx.fillText(p.courseCode.toUpperCase(), W / 2, cardY + 80 + titleH + 10);
  }

  // Big score circle
  const cx = W / 2, cy = cardY + 360;
  const pct = p.total > 0 ? Math.round((p.score / p.total) * 100) : 0;
  const ring = 150;
  // ring bg
  ctx.beginPath();
  ctx.arc(cx, cy, ring, 0, Math.PI * 2);
  ctx.strokeStyle = '#F4E8C1';
  ctx.lineWidth = 24;
  ctx.stroke();
  // ring fg
  ctx.beginPath();
  ctx.arc(cx, cy, ring, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * pct) / 100);
  const ringGrad = ctx.createLinearGradient(cx - ring, cy, cx + ring, cy);
  ringGrad.addColorStop(0, '#D4A017');
  ringGrad.addColorStop(1, '#B8860B');
  ctx.strokeStyle = ringGrad;
  ctx.lineCap = 'round';
  ctx.lineWidth = 24;
  ctx.stroke();
  ctx.lineCap = 'butt';

  ctx.fillStyle = '#1a1a1a';
  ctx.font = 'bold 130px Inter, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${pct}%`, cx, cy - 8);
  ctx.font = '600 28px Inter, system-ui, sans-serif';
  ctx.fillStyle = '#7a5a00';
  ctx.fillText(`${p.score} / ${p.total} correct`, cx, cy + 80);
  ctx.textBaseline = 'alphabetic';

  // Verdict
  const verdict =
    pct >= 90 ? 'OUTSTANDING' :
    pct >= 80 ? 'EXCELLENT' :
    pct >= 70 ? 'GREAT JOB' :
    pct >= 50 ? 'PASSED' : 'KEEP PRACTICING';
  ctx.font = 'bold 32px Inter, system-ui, sans-serif';
  ctx.fillStyle = '#1a1a1a';
  ctx.textAlign = 'center';
  ctx.fillText(verdict, cx, cardY + 580);

  // Stats grid (3 tiles)
  const accuracy = pct;
  const avgSec = p.total > 0 ? Math.round(p.timeSeconds / p.total) : 0;
  const mins = Math.floor(p.timeSeconds / 60);
  const secs = p.timeSeconds % 60;
  const tiles: { label: string; value: string; sub: string }[] = [
    { label: 'Accuracy', value: `${accuracy}%`, sub: `${p.score}/${p.total}` },
    { label: 'Time', value: `${mins}:${secs.toString().padStart(2, '0')}`, sub: 'total' },
    { label: 'Speed', value: `${avgSec}s`, sub: 'per Q avg' },
  ];
  const tileW = (cardW - 100) / 3;
  const tileY = cardY + 640;
  tiles.forEach((t, i) => {
    const tx = cardX + 50 + i * tileW;
    roundRect(ctx, tx, tileY, tileW - 20, 180, 20);
    ctx.fillStyle = '#FFFBEA';
    ctx.fill();
    ctx.strokeStyle = 'rgba(184,134,11,0.25)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#7a5a00';
    ctx.font = '600 22px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(t.label, tx + (tileW - 20) / 2, tileY + 40);
    ctx.fillStyle = '#1a1a1a';
    ctx.font = 'bold 50px Inter, system-ui, sans-serif';
    ctx.fillText(t.value, tx + (tileW - 20) / 2, tileY + 100);
    ctx.fillStyle = '#9a8550';
    ctx.font = '500 20px Inter, system-ui, sans-serif';
    ctx.fillText(t.sub, tx + (tileW - 20) / 2, tileY + 140);
  });

  // mode + student
  ctx.textAlign = 'center';
  ctx.fillStyle = '#5a5a5a';
  ctx.font = '500 22px Inter, system-ui, sans-serif';
  const meta = [p.studentName, p.mode === 'cbt' ? 'CBT Simulation' : 'Practice Mode']
    .filter(Boolean).join('  •  ');
  ctx.fillText(meta, W / 2, cardY + 880);

  // Footer
  ctx.textAlign = 'center';
  ctx.fillStyle = '#1a1a1a';
  ctx.font = 'bold 30px Inter, system-ui, sans-serif';
  ctx.fillText('overraprepai.com', W / 2, cardY + cardH - 35);
  ctx.font = '500 22px Inter, system-ui, sans-serif';
  ctx.fillStyle = '#7a5a00';
  ctx.fillText('Built for FUTA Students 🏆', W / 2, H - 50);

  return new Promise((res) => c.toBlob((b) => res(b!), 'image/png', 0.95));
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function QuizResultShareCard(props: QuizResultCardProps) {
  const [busy, setBusy] = useState<'share' | 'dl' | null>(null);
  const blobRef = useRef<Blob | null>(null);

  const make = async () => {
    if (blobRef.current) return blobRef.current;
    const b = await renderCard(props);
    blobRef.current = b;
    return b;
  };

  const download = async () => {
    setBusy('dl');
    try {
      const blob = await make();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `overraprep-${(props.quizTitle || 'result').replace(/\s+/g, '-').toLowerCase()}.png`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Result image downloaded');
    } catch (e: any) {
      toast.error('Could not generate image');
    } finally { setBusy(null); }
  };

  const share = async () => {
    setBusy('share');
    try {
      const blob = await make();
      const file = new File([blob], 'overraprep-result.png', { type: 'image/png' });
      if ((navigator as any).canShare?.({ files: [file] })) {
        await (navigator as any).share({
          files: [file],
          title: 'My OverraPrep result',
          text: `I scored ${Math.round((props.score / props.total) * 100)}% on ${props.quizTitle}!`,
        });
      } else {
        await download();
      }
    } catch (e: any) {
      if (e?.name !== 'AbortError') toast.error('Could not share');
    } finally { setBusy(null); }
  };

  return (
    <div className="flex gap-2 w-full">
      <Button onClick={download} disabled={!!busy} className="flex-1 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-white border-0">
        {busy === 'dl' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
        Download Result Image
      </Button>
      <Button onClick={share} disabled={!!busy} variant="outline" className="border-amber-500/40 text-amber-700 hover:bg-amber-50">
        {busy === 'share' ? <Loader2 className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
      </Button>
    </div>
  );
}
