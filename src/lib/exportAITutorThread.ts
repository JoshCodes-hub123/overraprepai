import { sanitizeAIText } from "@/lib/sanitizeAI";

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

export async function exportThreadAsPDF(thread: ExportableThread, messages: ExportableMessage[]) {
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 48;
  const usableW = pageW - margin * 2;

  // Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(20, 20, 20);
  doc.text(thread.title || "AI Tutor Chat", margin, margin);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text(
    `OverraPrep · ${thread.persona ?? "tutor"} · exported ${new Date().toLocaleString()}`,
    margin,
    margin + 16
  );
  doc.setDrawColor(220);
  doc.line(margin, margin + 24, pageW - margin, margin + 24);

  let y = margin + 44;

  const writeBlock = (label: string, body: string, labelColor: [number, number, number]) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...labelColor);
    doc.text(label.toUpperCase(), margin, y);
    y += 14;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(30, 30, 30);
    const lines = doc.splitTextToSize(sanitizeAIText(body) || "", usableW);
    for (const line of lines) {
      if (y > pageH - margin) {
        doc.addPage();
        y = margin;
      }
      doc.text(line, margin, y);
      y += 15;
    }
    y += 12;
  };

  for (const m of messages) {
    if (y > pageH - margin - 40) {
      doc.addPage();
      y = margin;
    }
    if (m.role === "user") writeBlock("You", m.content, [30, 80, 200]);
    else writeBlock("Overra AI", m.content, [180, 130, 30]);
  }

  // Footer page numbers
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(150);
    doc.text(`${i} / ${pageCount}`, pageW - margin, pageH - 20, { align: "right" });
    doc.text("OverraPrep — Study Smart, Not Hard.", margin, pageH - 20);
  }

  doc.save(`${safeFilename(thread.title)}-${new Date().toISOString().slice(0, 10)}.pdf`);
}