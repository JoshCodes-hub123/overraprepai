/**
 * Render a branded "OverraPrep AI" summary PDF from markdown-ish text.
 * Diagonal watermark on every page + footer + cover header.
 * Lazy-loads jsPDF to keep the main bundle slim.
 */
export async function exportSummaryPdf(opts: {
  title: string;
  subtitle?: string;
  bodyMarkdown: string;
  authorLabel?: string;
  filename?: string;
  logoDataUrl?: string;
  studentName?: string;
  verified?: boolean;
  matricNo?: string;
  style?: string;
  /** "download" saves the file (default). "view" opens the PDF in a new browser tab. */
  mode?: "download" | "view";
}): Promise<void> {
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 56;
  const maxW = pageW - margin * 2;

  const drawChrome = (pageIdx: number, totalPages: number) => {
    // ── Center watermark (spot 2): logo + brand text, faded
    doc.saveGraphicsState?.();
    doc.setTextColor(212, 175, 55);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(64);
    (doc as any).setGState?.(new (doc as any).GState({ opacity: 0.08 }));
    if (opts.logoDataUrl) {
      try {
        const wmSize = 140;
        doc.addImage(
          opts.logoDataUrl,
          "PNG",
          pageW / 2 - wmSize / 2,
          pageH / 2 - wmSize - 10,
          wmSize,
          wmSize,
        );
      } catch {
        /* ignore */
      }
    }
    doc.text("OverraPrep AI", pageW / 2, pageH / 2, {
      angle: -28,
      align: "center",
    });
    (doc as any).setGState?.(new (doc as any).GState({ opacity: 1 }));
    doc.restoreGraphicsState?.();

    // ── Header (spot 1): gold accent bar + small logo + brand label on EVERY page
    doc.setFillColor(212, 175, 55);
    doc.rect(0, 0, pageW, 6, "F");
    if (opts.logoDataUrl) {
      try {
        doc.addImage(opts.logoDataUrl, "PNG", margin, 16, 22, 22);
      } catch {
        /* ignore */
      }
    }
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.setFont("helvetica", "bold");
    doc.text("OVERRAPREP AI", margin + (opts.logoDataUrl ? 28 : 0), 32);

    // ── Footer (spot 3): tiny logo + caption + page x/y
    if (opts.logoDataUrl) {
      try {
        doc.addImage(opts.logoDataUrl, "PNG", margin, pageH - 32, 14, 14);
      } catch {
        /* ignore */
      }
    }
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.setFont("helvetica", "normal");
    doc.text(
      "Generated with OverraPrep AI",
      margin + (opts.logoDataUrl ? 18 : 0),
      pageH - 22,
    );
    doc.text(`Page ${pageIdx + 1} of ${totalPages}`, pageW - margin, pageH - 22, { align: "right" });
  };

  // Cover header
  let y = margin + 24;
  doc.setTextColor(20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("OVERRAPREP AI · STUDY NOTES", margin, y);
  y += 22;

  doc.setFontSize(22);
  const titleLines = doc.splitTextToSize(opts.title || "Untitled", maxW);
  doc.text(titleLines, margin, y);
  y += titleLines.length * 24 + 4;

  if (opts.subtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(110);
    const sub = doc.splitTextToSize(opts.subtitle, maxW);
    doc.text(sub, margin, y);
    y += sub.length * 14 + 8;
  }

  // Prepared-for block — the personalised + verification line
  if (opts.studentName || opts.style) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(60);
    if (opts.style) {
      doc.text(`Style: ${opts.style}`, margin, y);
      y += 14;
    }
    if (opts.studentName) {
      const verifiedMark = opts.verified ? "  \u2713 Verified Student" : "";
      doc.setFont("helvetica", "bold");
      doc.text(`Prepared for: ${opts.studentName}${verifiedMark}`, margin, y);
      doc.setFont("helvetica", "normal");
      y += 14;
    }
    const metaBits = [
      opts.matricNo ? `Matric: ${opts.matricNo}` : null,
      new Date().toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      }),
    ].filter(Boolean);
    if (metaBits.length) {
      doc.setTextColor(120);
      doc.text(metaBits.join("  ·  "), margin, y);
      y += 14;
    }
    y += 4;
  }

  doc.setDrawColor(212, 175, 55);
  doc.setLineWidth(1);
  doc.line(margin, y, pageW - margin, y);
  y += 18;

  doc.setTextColor(35);

  const ensureSpace = (need: number) => {
    if (y + need > pageH - margin - 16) {
      doc.addPage();
      y = margin;
    }
  };

  const lines = (opts.bodyMarkdown || "").split("\n");
  for (const raw of lines) {
    const line = raw.replace(/\s+$/, "");
    if (!line.trim()) { y += 8; continue; }

    // Headings
    const h = /^(#{1,3})\s+(.*)$/.exec(line);
    if (h) {
      const level = h[1].length;
      const size = level === 1 ? 18 : level === 2 ? 14 : 12;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(size);
      doc.setTextColor(20);
      const wrapped = doc.splitTextToSize(h[2], maxW);
      ensureSpace(wrapped.length * (size + 4) + 8);
      y += level === 1 ? 6 : 4;
      doc.text(wrapped, margin, y);
      y += wrapped.length * (size + 4) + 4;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(35);
      continue;
    }

    // Bullets
    const b = /^\s*[-*•]\s+(.*)$/.exec(line);
    if (b) {
      doc.setFontSize(11);
      const wrapped = doc.splitTextToSize(b[1], maxW - 14);
      ensureSpace(wrapped.length * 14 + 2);
      doc.setTextColor(212, 175, 55);
      doc.text("•", margin, y);
      doc.setTextColor(35);
      doc.text(wrapped, margin + 14, y);
      y += wrapped.length * 14 + 2;
      continue;
    }

    // Paragraph
    doc.setFontSize(11);
    const wrapped = doc.splitTextToSize(line, maxW);
    ensureSpace(wrapped.length * 14 + 4);
    doc.text(wrapped, margin, y);
    y += wrapped.length * 14 + 4;
  }

  // Pass 2: footer/watermark on every page
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    drawChrome(i - 1, total);
  }

  const safe = (opts.filename || opts.title || "overraprep-notes")
    .replace(/[^\w.\-]+/g, "_")
    .slice(0, 80);

  if (opts.mode === "view") {
    // Open in a new tab — no download. Works on desktop + most mobile browsers.
    const blob: Blob = doc.output("blob");
    const url = URL.createObjectURL(blob);
    const win = window.open(url, "_blank", "noopener,noreferrer");
    if (!win) {
      // Popup blocked — fall back to same-tab navigation
      window.location.href = url;
    }
    // Revoke after a delay so the tab has time to load
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return;
  }

  doc.save(`${safe}.pdf`);
}