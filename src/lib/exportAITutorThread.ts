import { sanitizeAIText } from "@/lib/sanitizeAI";
import { applyPdfWatermark, buildWatermark } from "@/lib/watermark";

export interface ExportableMessage {
  role: "user" | "assistant";
  content: string;
  created_at?: string;
}

export interface ExportableThread {
  id: string;
  title: string;
  persona: string;
  created_at?: string;
  updated_at?: string;
}

export interface ExportPdfOptions {
  studentName?: string | null;
}

const safeFilename = (s: string) =>
  s.replace(/[^a-z0-9-_]+/gi, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "chat";

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportThreadAsJSON(thread: ExportableThread, messages: ExportableMessage[]) {
  const payload = {
    exported_at: new Date().toISOString(),
    source: "OverraPrep AI Tutor",
    thread,
    messages: messages.map((m) => ({
      role: m.role,
      content: m.content,
      created_at: m.created_at,
    })),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  download(blob, `${safeFilename(thread.title)}-${new Date().toISOString().slice(0, 10)}.json`);
}

const PERSONA_LABEL: Record<string, string> = {
  tutor: "AI Tutor",
  exam: "Exam Strategist",
  coach: "Study Coach",
  career: "Career Mentor",
};

function fmtTime(iso?: string) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      month: "short", day: "numeric", year: "numeric",
      hour: "numeric", minute: "2-digit",
    });
  } catch { return ""; }
}

export async function exportThreadAsPDF(
  thread: ExportableThread,
  messages: ExportableMessage[],
  options: ExportPdfOptions = {},
) {
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 54;
  const usableW = pageW - margin * 2;
  const personaLabel = PERSONA_LABEL[thread.persona] ?? "AI Tutor";

  // ─── Cover header ─────────────────────────────────────────────
  // Gold accent bar
  doc.setFillColor(212, 175, 55);
  doc.rect(0, 0, pageW, 6, "F");

  let y = margin + 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(150, 115, 20);
  doc.text("OVERRAPREP · AI TUTOR TRANSCRIPT", margin, y);
  y += 22;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(20, 20, 20);
  const titleLines = doc.splitTextToSize(thread.title || "AI Tutor Chat", usableW);
  doc.text(titleLines, margin, y);
  y += titleLines.length * 24;

  // Meta line: persona · message count · date range
  const firstAt = messages[0]?.created_at;
  const lastAt = messages[messages.length - 1]?.created_at;
  const rangeBits: string[] = [personaLabel, `${messages.length} message${messages.length === 1 ? "" : "s"}`];
  if (firstAt && lastAt) {
    rangeBits.push(`${fmtTime(firstAt)} → ${fmtTime(lastAt)}`);
  } else {
    rangeBits.push(`Exported ${new Date().toLocaleString()}`);
  }
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(110);
  doc.text(rangeBits.join("  ·  "), margin, y);
  y += 16;

  // Divider
  doc.setDrawColor(212, 175, 55);
  doc.setLineWidth(1);
  doc.line(margin, y, pageW - margin, y);
  y += 22;

  // ─── Messages ─────────────────────────────────────────────────
  const ensureSpace = (need: number) => {
    if (y + need > pageH - margin - 28) {
      doc.addPage();
      y = margin + 6;
    }
  };

  const writeFormattedBody = (body: string) => {
    const text = sanitizeAIText(body) || "";
    const rawLines = text.split("\n");
    for (const raw of rawLines) {
      const line = raw.replace(/\s+$/, "");
      if (!line.trim()) { y += 6; continue; }

      // Headings
      const h = /^(#{1,3})\s+(.*)$/.exec(line);
      if (h) {
        const level = h[1].length;
        const size = level === 1 ? 14 : level === 2 ? 12 : 11;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(size);
        doc.setTextColor(25, 25, 25);
        const wrapped = doc.splitTextToSize(h[2], usableW);
        ensureSpace(wrapped.length * (size + 4) + 6);
        y += 4;
        doc.text(wrapped, margin, y);
        y += wrapped.length * (size + 4) + 2;
        continue;
      }

      // Bullets
      const b = /^\s*[-*•]\s+(.*)$/.exec(line);
      if (b) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
        doc.setTextColor(40);
        const wrapped = doc.splitTextToSize(b[1], usableW - 16);
        ensureSpace(wrapped.length * 14 + 2);
        doc.setTextColor(180, 140, 40);
        doc.text("•", margin + 4, y);
        doc.setTextColor(40);
        doc.text(wrapped, margin + 16, y);
        y += wrapped.length * 14 + 2;
        continue;
      }

      // Numbered list
      const n = /^\s*(\d+)\.\s+(.*)$/.exec(line);
      if (n) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
        const wrapped = doc.splitTextToSize(n[2], usableW - 22);
        ensureSpace(wrapped.length * 14 + 2);
        doc.setTextColor(180, 140, 40);
        doc.text(`${n[1]}.`, margin + 2, y);
        doc.setTextColor(40);
        doc.text(wrapped, margin + 22, y);
        y += wrapped.length * 14 + 2;
        continue;
      }

      // Paragraph
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(35);
      const wrapped = doc.splitTextToSize(line, usableW);
      ensureSpace(wrapped.length * 14 + 4);
      doc.text(wrapped, margin, y);
      y += wrapped.length * 14 + 4;
    }
  };

  for (const m of messages) {
    const isUser = m.role === "user";
    const label = isUser ? "You" : `Overra · ${personaLabel}`;
    const ts = fmtTime(m.created_at);

    ensureSpace(40);

    // Role label row
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    if (isUser) doc.setTextColor(40, 90, 200);
    else doc.setTextColor(170, 130, 30);
    doc.text(label.toUpperCase(), margin, y);
    if (ts) {
      doc.setFont("helvetica", "normal");
      doc.setTextColor(150);
      doc.text(ts, pageW - margin, y, { align: "right" });
    }
    y += 6;

    // Accent rule under label
    if (isUser) doc.setDrawColor(40, 90, 200);
    else doc.setDrawColor(212, 175, 55);
    doc.setLineWidth(0.6);
    doc.line(margin, y, margin + 32, y);
    y += 12;

    writeFormattedBody(m.content);
    y += 14;
  }

  // ─── Watermark + footers on every page ────────────────────────
  applyPdfWatermark(doc, buildWatermark({ fullName: options.studentName ?? null, suffix: "OverraPrep AI Tutor" }));

  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    // Top gold bar on every page
    doc.setFillColor(212, 175, 55);
    doc.rect(0, 0, pageW, 4, "F");
    // Page number (right) — watermark helper already drew centered footer
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`${i} / ${pageCount}`, pageW - margin, pageH - 20, { align: "right" });
  }

  doc.save(`${safeFilename(thread.title)}-${new Date().toISOString().slice(0, 10)}.pdf`);
}