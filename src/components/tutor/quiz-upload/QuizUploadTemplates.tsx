import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileSpreadsheet, FileDown, FileText, Info } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

const SAMPLE_ROWS = [
  {
    question_text: "What is the capital of France?",
    option_a: "London",
    option_b: "Paris",
    option_c: "Berlin",
    option_d: "Madrid",
    correct_option: "B",
    explanation: "Paris is the capital and largest city of France.",
    difficulty: "easy",
    year: "",
  },
  {
    question_text: "Solve: 2x + 5 = 13, find x.",
    option_a: "3",
    option_b: "4",
    option_c: "5",
    option_d: "6",
    correct_option: "B",
    explanation: "2x = 8 ⇒ x = 4.",
    difficulty: "medium",
    year: "2022",
  },
];

const COLUMNS: Array<{
  name: string;
  required: boolean;
  description: string;
  example: string;
}> = [
  { name: "question_text", required: true, description: "The question itself.", example: "What is …?" },
  { name: "option_a", required: true, description: "Option A text.", example: "London" },
  { name: "option_b", required: true, description: "Option B text.", example: "Paris" },
  { name: "option_c", required: true, description: "Option C text.", example: "Berlin" },
  { name: "option_d", required: true, description: "Option D text.", example: "Madrid" },
  { name: "correct_option", required: true, description: "Letter of correct option: A, B, C or D.", example: "B" },
  { name: "explanation", required: false, description: "Short reasoning shown after answering.", example: "Paris is the capital…" },
  { name: "difficulty", required: false, description: "easy | medium | hard (defaults to medium).", example: "easy" },
  { name: "year", required: false, description: "Past-question year (optional).", example: "2022" },
];

function downloadBlob(content: BlobPart, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function toCsv(rows: Record<string, any>[]) {
  const headers = COLUMNS.map((c) => c.name);
  const esc = (v: any) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => esc(r[h])).join(",")),
  ].join("\n");
}

export function QuizUploadTemplates() {
  const downloadCsv = () => {
    downloadBlob(toCsv(SAMPLE_ROWS), "quiz_template.csv", "text/csv;charset=utf-8");
    toast.success("CSV template downloaded");
  };

  const downloadXlsx = () => {
    const ws = XLSX.utils.json_to_sheet(SAMPLE_ROWS, { header: COLUMNS.map((c) => c.name) });
    ws["!cols"] = [
      { wch: 50 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 },
      { wch: 14 }, { wch: 50 }, { wch: 12 }, { wch: 8 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Questions");
    XLSX.writeFile(wb, "quiz_template.xlsx");
    toast.success("Excel template downloaded");
  };

  const downloadDocx = () => {
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Quiz Template</title>
    <style>body{font-family:Arial;margin:24px}table{border-collapse:collapse;width:100%}
    th,td{border:1px solid #999;padding:6px;text-align:left;font-size:12px}th{background:#f3f3f3}</style></head>
    <body><h2>Quiz upload template</h2>
    <p>Fill one question per row. Keep the column headers exactly as below.</p>
    <table><tr>${COLUMNS.map((c) => `<th>${c.name}</th>`).join("")}</tr>
    ${SAMPLE_ROWS.map((r) => `<tr>${COLUMNS.map((c) => `<td>${(r as any)[c.name] ?? ""}</td>`).join("")}</tr>`).join("")}
    </table></body></html>`;
    downloadBlob(html, "quiz_template.doc", "application/msword");
    toast.success("Word template downloaded");
  };

  return (
    <Card className="p-3 space-y-3 border-amber-200/60 bg-amber-50/40 dark:bg-amber-500/5">
      <div className="flex items-start gap-2">
        <Info className="w-4 h-4 mt-0.5 text-amber-600 shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-semibold">Templates &amp; column guide</p>
          <p className="text-xs text-muted-foreground">
            Download a ready-to-fill template, keep the headers exactly as named, then upload it under
            <span className="font-medium"> Upload / Paste</span>.
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={downloadCsv}>
          <FileText className="w-3.5 h-3.5 mr-1.5" /> CSV
        </Button>
        <Button size="sm" variant="outline" onClick={downloadXlsx}>
          <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5" /> Excel
        </Button>
        <Button size="sm" variant="outline" onClick={downloadDocx}>
          <FileDown className="w-3.5 h-3.5 mr-1.5" /> Word
        </Button>
      </div>
      <div className="rounded-md border bg-background/70 overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-muted/60 text-left">
            <tr>
              <th className="px-2 py-1.5 font-medium">Column</th>
              <th className="px-2 py-1.5 font-medium">Required</th>
              <th className="px-2 py-1.5 font-medium hidden sm:table-cell">Example</th>
              <th className="px-2 py-1.5 font-medium">What to put</th>
            </tr>
          </thead>
          <tbody>
            {COLUMNS.map((c) => (
              <tr key={c.name} className="border-t">
                <td className="px-2 py-1.5 font-mono">{c.name}</td>
                <td className="px-2 py-1.5">
                  {c.required ? (
                    <Badge className="bg-amber-500 text-white">Required</Badge>
                  ) : (
                    <Badge variant="secondary">Optional</Badge>
                  )}
                </td>
                <td className="px-2 py-1.5 text-muted-foreground hidden sm:table-cell">{c.example}</td>
                <td className="px-2 py-1.5 text-muted-foreground">{c.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export default QuizUploadTemplates;