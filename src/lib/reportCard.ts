/**
 * Premium, print-ready terminal report card generator.
 * Designed to look like a real West-African secondary-school broadsheet:
 * serif title, school logo, brand-colour rule, watermark, position in class,
 * grading key, signature lines, verification ID. No emojis, no childish glyphs.
 */
// jsPDF, jspdf-autotable, and qrcode are dynamically imported inside
// generateReportCards() so they aren't included in the main bundle.
import type { jsPDF as JsPDFType } from "jspdf";
type JsPDFInstance = InstanceType<typeof JsPDFType>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let jsPDF: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let autoTable: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let QRCode: any;
async function loadReportDeps() {
  if (jsPDF && autoTable && QRCode) return;
  const [jsPDFMod, autoTableMod, qrMod] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
    import("qrcode"),
  ]);
  jsPDF = jsPDFMod.default;
  autoTable = autoTableMod.default;
  QRCode = qrMod.default;
}

export type ReportSchool = {
  id: string;
  name: string;
  motto?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  logo_url?: string | null;
  brand_color?: string | null;
  report_footer?: string | null;
  principal_name?: string | null;
};

export type ReportTerm = {
  session: string; // e.g. "2025/2026"
  term: number; // 1, 2, 3
};

export type ReportClass = {
  level: string; // e.g. "JSS 2"
  arm: string; // e.g. "A"
};

export type ReportSubjectRow = {
  subject: string;
  ca1: number;
  ca2: number;
  exam: number;
  total: number;
  grade: string;
  remark: string;
};

export type ReportStudent = {
  id: string;
  full_name: string;
  admission_no?: string | null;
  gender?: string | null;
  date_of_birth?: string | null;
  position?: number | null; // 1-based
  classSize: number;
  rows: ReportSubjectRow[];
};

const remarkFor = (g: string) =>
  g === "A" ? "Excellent" :
  g === "B" ? "Very Good" :
  g === "C" ? "Good" :
  g === "D" ? "Fair" :
  g === "E" ? "Pass" :
  "Fail";

export const gradeFor = (t: number) =>
  t >= 75 ? "A" : t >= 65 ? "B" : t >= 55 ? "C" : t >= 45 ? "D" : t >= 40 ? "E" : "F";

const ordinal = (n: number) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

const hexToRgb = (hex: string): [number, number, number] => {
  const h = hex.replace("#", "");
  const v = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(v, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

async function loadImage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { mode: "cors" });
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const r = new FileReader();
      r.onloadend = () => resolve(r.result as string);
      r.onerror = () => resolve(null);
      r.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function drawHeader(doc: JsPDFInstance, school: ReportSchool, term: ReportTerm, logoData: string | null, brand: [number, number, number]) {
  const W = doc.internal.pageSize.getWidth();
  const M = 14;

  // Logo
  if (logoData) {
    try { doc.addImage(logoData, "PNG", M, 12, 22, 22); } catch { /* ignore */ }
  } else {
    doc.setDrawColor(...brand);
    doc.setLineWidth(0.6);
    doc.roundedRect(M, 12, 22, 22, 2, 2);
  }

  // School name (serif)
  doc.setFont("times", "bold");
  doc.setTextColor(...brand);
  doc.setFontSize(20);
  doc.text(school.name.toUpperCase(), M + 28, 19);

  doc.setFont("times", "italic");
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(9.5);
  if (school.motto) doc.text(`"${school.motto}"`, M + 28, 25);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(90, 90, 90);
  const contact = [school.address, school.phone, school.email].filter(Boolean).join("  ·  ");
  if (contact) doc.text(contact, M + 28, 30);

  // Brand-colour rule
  doc.setDrawColor(...brand);
  doc.setLineWidth(1.2);
  doc.line(M, 38, W - M, 38);
  doc.setLineWidth(0.3);
  doc.line(M, 39.5, W - M, 39.5);

  // Document title
  doc.setFont("times", "bold");
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(13);
  const title = `STUDENT TERMINAL REPORT  ·  ${term.session}  ·  TERM ${term.term}`;
  doc.text(title, W / 2, 48, { align: "center" });
}

function drawWatermark(doc: JsPDFInstance, school: ReportSchool) {
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const txt = school.name.toUpperCase();
  doc.saveGraphicsState();
  (doc as any).setGState(new (doc as any).GState({ opacity: 0.06 }));
  doc.setFont("times", "bold");
  doc.setFontSize(70);
  doc.setTextColor(0, 0, 0);
  doc.text(txt, W / 2, H / 2, { align: "center", angle: 30 });
  doc.restoreGraphicsState();
}

function drawStudentBlock(doc: JsPDFInstance, student: ReportStudent, klass: ReportClass) {
  const M = 14;
  const yStart = 56;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(40, 40, 40);
  doc.setFontSize(10);

  const rows: [string, string, string, string][] = [
    ["Name", student.full_name.toUpperCase(), "Class", `${klass.level} ${klass.arm}`],
    ["Admission No.", student.admission_no || "—", "Sex", student.gender || "—"],
    [
      "Position in class",
      student.position ? `${ordinal(student.position)} of ${student.classSize}` : "—",
      "No. in class",
      String(student.classSize),
    ],
  ];

  rows.forEach((r, i) => {
    const y = yStart + i * 6;
    doc.setFont("helvetica", "bold");
    doc.text(`${r[0]}:`, M, y);
    doc.setFont("helvetica", "normal");
    doc.text(r[1], M + 32, y);
    doc.setFont("helvetica", "bold");
    doc.text(`${r[2]}:`, M + 110, y);
    doc.setFont("helvetica", "normal");
    doc.text(r[3], M + 138, y);
  });
}

function drawScoresTable(doc: JsPDFInstance, student: ReportStudent, brand: [number, number, number]) {
  const totals = student.rows.reduce((a, r) => a + r.total, 0);
  const max = student.rows.length * 100;
  const avg = student.rows.length ? totals / student.rows.length : 0;

  autoTable(doc, {
    startY: 78,
    head: [["Subject", "CA 1\n/20", "CA 2\n/20", "Exam\n/60", "Total\n/100", "Grade", "Remark"]],
    body: student.rows.map((r) => [
      r.subject,
      String(r.ca1),
      String(r.ca2),
      String(r.exam),
      String(r.total),
      r.grade,
      r.remark,
    ]),
    foot: [[
      { content: "TOTAL / AVERAGE / OVERALL", colSpan: 4, styles: { halign: "right", fontStyle: "bold" } },
      { content: `${totals} / ${max}`, styles: { fontStyle: "bold" } },
      { content: gradeFor(avg), styles: { fontStyle: "bold" } },
      { content: `Avg ${avg.toFixed(1)}`, styles: { fontStyle: "bold" } },
    ]],
    theme: "grid",
    styles: { font: "helvetica", fontSize: 9.5, cellPadding: 2.2, lineColor: [180, 180, 180], lineWidth: 0.2, textColor: [40, 40, 40] },
    headStyles: { fillColor: brand, textColor: 255, fontStyle: "bold", halign: "center", valign: "middle", fontSize: 9 },
    columnStyles: {
      0: { cellWidth: "auto", fontStyle: "bold" },
      1: { halign: "center", cellWidth: 14 },
      2: { halign: "center", cellWidth: 14 },
      3: { halign: "center", cellWidth: 14 },
      4: { halign: "center", cellWidth: 16, fontStyle: "bold" },
      5: { halign: "center", cellWidth: 14, fontStyle: "bold" },
      6: { halign: "left", cellWidth: 26 },
    },
    footStyles: { fillColor: [245, 245, 245], textColor: [30, 30, 30] },
    margin: { left: 14, right: 14 },
  });
}

async function drawFooter(doc: JsPDFInstance, school: ReportSchool, term: ReportTerm, student: ReportStudent, brand: [number, number, number]) {
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 14;
  const lastY = (doc as any).lastAutoTable?.finalY || 180;
  let y = Math.min(lastY + 8, H - 70);

  // Grading key
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(30, 30, 30);
  doc.text("GRADING KEY", M, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text("A  75–100   ·   B  65–74   ·   C  55–64   ·   D  45–54   ·   E  40–44   ·   F  0–39", M, y + 5);

  y += 14;
  // Remarks
  doc.setFont("helvetica", "bold"); doc.setFontSize(9);
  doc.text("Class Teacher's Remark:", M, y);
  doc.setDrawColor(180); doc.setLineWidth(0.2);
  doc.line(M + 50, y, W - M, y);
  doc.line(M, y + 6, W - M, y + 6);

  y += 12;
  doc.text("Principal's Remark:", M, y);
  doc.line(M + 42, y, W - M, y);
  doc.line(M, y + 6, W - M, y + 6);

  // Signatures
  y += 22;
  doc.setDrawColor(80); doc.setLineWidth(0.4);
  doc.line(M, y, M + 60, y);
  doc.line(W - M - 60, y, W - M, y);
  doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(60, 60, 60);
  doc.text("Class Teacher", M + 30, y + 4, { align: "center" });
  doc.text(school.principal_name || "Principal", W - M - 30, y + 4, { align: "center" });

  // Verification line + QR code
  const issued = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  const verifyId = `${(school.name.replace(/[^A-Z]/gi, "").slice(0, 3) || "SCH").toUpperCase()}-${term.term}T-${student.id.slice(-4).toUpperCase()}`;
  const verifyUrl = `${typeof window !== "undefined" ? window.location.origin : "https://overraprep.com"}/verify/${verifyId}`;

  try {
    const qrData = await QRCode.toDataURL(verifyUrl, { margin: 0, width: 160, color: { dark: "#1a1a1a", light: "#ffffff" } });
    doc.addImage(qrData, "PNG", W - M - 22, H - 32, 18, 18);
    doc.setFont("helvetica", "normal"); doc.setFontSize(6.5); doc.setTextColor(110, 110, 110);
    doc.text("Scan to verify", W - M - 13, H - 12, { align: "center" });
  } catch (_) { /* QR optional */ }

  doc.setFont("helvetica", "italic"); doc.setFontSize(7.5); doc.setTextColor(120, 120, 120);
  const footer = school.report_footer ? ` · ${school.report_footer}` : "";
  doc.text(`Issued ${issued}  ·  Verification ID: ${verifyId}${footer}`, W / 2, H - 10, { align: "center" });

  // Brand stripe at bottom
  doc.setFillColor(...brand);
  doc.rect(0, H - 4, W, 4, "F");
}

async function renderOne(doc: JsPDFInstance, school: ReportSchool, term: ReportTerm, klass: ReportClass, student: ReportStudent, logoData: string | null) {
  const brand = hexToRgb(school.brand_color || "#1e3a8a");
  drawWatermark(doc, school);
  drawHeader(doc, school, term, logoData, brand);
  drawStudentBlock(doc, student, klass);
  drawScoresTable(doc, student, brand);
  await drawFooter(doc, school, term, student, brand);
}

/** Generate one report card per student in a single PDF (one page each). */
export async function generateReportCards(opts: {
  school: ReportSchool;
  term: ReportTerm;
  klass: ReportClass;
  students: ReportStudent[];
}): Promise<Blob> {
  const { school, term, klass, students } = opts;
  await loadReportDeps();
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const logoData = school.logo_url ? await loadImage(school.logo_url) : null;

  for (let i = 0; i < students.length; i++) {
    if (i > 0) doc.addPage();
    await renderOne(doc, school, term, klass, students[i], logoData);
  }
  return doc.output("blob");
}

export { remarkFor };
