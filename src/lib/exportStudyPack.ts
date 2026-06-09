// jsPDF is loaded lazily inside exportStudyPackPdf()

export interface StudyPackMaterial {
  title: string;
  description?: string | null;
  summary?: string | null;
  keyPoints?: { point: string; importance: "high" | "medium" | "low" }[] | null;
  flashcards?: { question: string; answer: string; topic?: string }[] | null;
  likelyQuestions?: {
    question: string;
    type: "objective" | "theory";
    probability: "high" | "medium" | "low";
    reasoning: string;
  }[] | null;
}

export interface StudyPackInput {
  courseCode: string;
  courseName: string;
  materials: StudyPackMaterial[];
  include: {
    summary: boolean;
    keyPoints: boolean;
    flashcards: boolean;
    likelyQuestions: boolean;
  };
}

const dateStamp = () => new Date().toISOString().split("T")[0];

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// ---------- Markdown ----------
export function exportStudyPackMarkdown(input: StudyPackInput) {
  const { courseCode, courseName, materials, include } = input;
  const lines: string[] = [];
  lines.push(`# ${courseCode} — ${courseName}`);
  lines.push(`*OverraPrep AI · Study Pack · Generated ${new Date().toLocaleString()}*`);
  lines.push("");

  if (materials.length === 0) {
    lines.push("_No materials available._");
  }

  materials.forEach((m, i) => {
    lines.push(`---`);
    lines.push(`## ${i + 1}. ${m.title}`);
    if (m.description) lines.push(`> ${m.description}`);
    lines.push("");

    if (include.summary && m.summary) {
      lines.push(`### Summary`);
      lines.push(m.summary);
      lines.push("");
    }
    if (include.keyPoints && m.keyPoints?.length) {
      lines.push(`### Key Points`);
      m.keyPoints.forEach((p) => {
        lines.push(`- **[${p.importance.toUpperCase()}]** ${p.point}`);
      });
      lines.push("");
    }
    if (include.flashcards && m.flashcards?.length) {
      lines.push(`### Flashcards`);
      m.flashcards.forEach((c, idx) => {
        lines.push(`**${idx + 1}. Q:** ${c.question}`);
        lines.push(`   **A:** ${c.answer}`);
        if (c.topic) lines.push(`   _Topic: ${c.topic}_`);
        lines.push("");
      });
    }
    if (include.likelyQuestions && m.likelyQuestions?.length) {
      lines.push(`### Likely Exam Questions`);
      m.likelyQuestions.forEach((q, idx) => {
        lines.push(
          `${idx + 1}. _(${q.type} · ${q.probability} probability)_ ${q.question}`,
        );
        if (q.reasoning) lines.push(`   > ${q.reasoning}`);
        lines.push("");
      });
    }
  });

  const blob = new Blob([lines.join("\n")], { type: "text/markdown;charset=utf-8" });
  downloadBlob(blob, `${courseCode}-study-pack-${dateStamp()}.md`);
}

// ---------- PDF ----------
export async function exportStudyPackPdf(input: StudyPackInput) {
  const { courseCode, courseName, materials, include } = input;
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 48;
  const contentW = pageW - margin * 2;
  let y = margin;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageH - margin) {
      doc.addPage();
      y = margin;
    }
  };

  const writeWrapped = (text: string, fontSize: number, opts?: { bold?: boolean; color?: [number, number, number]; indent?: number }) => {
    const indent = opts?.indent ?? 0;
    doc.setFont("helvetica", opts?.bold ? "bold" : "normal");
    doc.setFontSize(fontSize);
    if (opts?.color) doc.setTextColor(...opts.color);
    else doc.setTextColor(30);
    const lines = doc.splitTextToSize(text, contentW - indent);
    const lineH = fontSize * 1.35;
    lines.forEach((ln: string) => {
      ensureSpace(lineH);
      doc.text(ln, margin + indent, y);
      y += lineH;
    });
  };

  const hr = () => {
    ensureSpace(14);
    doc.setDrawColor(220);
    doc.line(margin, y, pageW - margin, y);
    y += 12;
  };

  // Cover
  doc.setFillColor(212, 175, 55); // gold
  doc.rect(0, 0, pageW, 6, "F");
  y = margin + 8;
  writeWrapped(courseCode, 28, { bold: true, color: [20, 20, 20] });
  writeWrapped(courseName, 16, { color: [80, 80, 80] });
  y += 6;
  writeWrapped(
    `OverraPrep AI · Study Pack · Generated ${new Date().toLocaleString()}`,
    9,
    { color: [130, 130, 130] },
  );
  y += 10;
  hr();

  if (materials.length === 0) {
    writeWrapped("No materials available for this course.", 12, { color: [120, 120, 120] });
  }

  materials.forEach((m, i) => {
    ensureSpace(60);
    writeWrapped(`${i + 1}. ${m.title}`, 16, { bold: true });
    if (m.description) writeWrapped(m.description, 10, { color: [110, 110, 110] });
    y += 4;

    if (include.summary && m.summary) {
      writeWrapped("Summary", 13, { bold: true, color: [60, 60, 60] });
      writeWrapped(m.summary, 10);
      y += 6;
    }

    if (include.keyPoints && m.keyPoints?.length) {
      writeWrapped("Key Points", 13, { bold: true, color: [60, 60, 60] });
      m.keyPoints.forEach((p) => {
        writeWrapped(`• [${p.importance.toUpperCase()}] ${p.point}`, 10, { indent: 6 });
      });
      y += 6;
    }

    if (include.flashcards && m.flashcards?.length) {
      writeWrapped("Flashcards", 13, { bold: true, color: [60, 60, 60] });
      m.flashcards.forEach((c, idx) => {
        writeWrapped(`${idx + 1}. Q: ${c.question}`, 10, { bold: true, indent: 6 });
        writeWrapped(`A: ${c.answer}`, 10, { indent: 14 });
        if (c.topic) writeWrapped(`Topic: ${c.topic}`, 9, { color: [130, 130, 130], indent: 14 });
        y += 2;
      });
      y += 4;
    }

    if (include.likelyQuestions && m.likelyQuestions?.length) {
      writeWrapped("Likely Exam Questions", 13, { bold: true, color: [60, 60, 60] });
      m.likelyQuestions.forEach((q, idx) => {
        writeWrapped(
          `${idx + 1}. (${q.type} · ${q.probability} probability) ${q.question}`,
          10,
          { indent: 6 },
        );
        if (q.reasoning)
          writeWrapped(`↳ ${q.reasoning}`, 9, { color: [120, 120, 120], indent: 14 });
        y += 2;
      });
      y += 4;
    }

    if (i < materials.length - 1) hr();
  });

  // Footer page numbers
  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `OverraPrep AI — ${courseCode} Study Pack`,
      margin,
      pageH - 20,
    );
    doc.text(`Page ${p} / ${total}`, pageW - margin, pageH - 20, { align: "right" });
  }

  // View-only: open in a new browser tab using the native PDF viewer
  // (no auto-download — discourages re-sharing the file).
  const blobUrl = doc.output("bloburl");
  const win = window.open(blobUrl, "_blank", "noopener,noreferrer");
  if (!win) {
    // Popup blocked — fall back to a same-tab navigation so the user still sees it.
    window.location.href = String(blobUrl);
  }
}

