import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Upload, FileSpreadsheet, Sparkles, FileText, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SEO } from "@/components/seo/SEO";
import { BulkQuizImport } from "@/components/tutor/BulkQuizImport";
import { QuizUploadTemplates } from "@/components/tutor/quiz-upload/QuizUploadTemplates";
import { GNS106GermanTemplate } from "@/components/admin/GNS106GermanTemplate";
import { AdminImportHistory } from "@/components/admin/AdminImportHistory";

/**
 * Admin-only page for bulk-uploading quiz banks (Excel / CSV / Word).
 * Reuses the tutor BulkQuizImport dialog with `adminScope` enabled so
 * existing courses created by ANY user are matched (no duplicates).
 */
const AdminBulkUpload = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [historyKey, setHistoryKey] = useState(0);

  return (
    <>
      <SEO title="Admin · Bulk upload questions" noindex />
      <div className="min-h-screen bg-gradient-to-b from-amber-50/60 via-white to-white">
        <div className="container mx-auto px-4 py-6 max-w-5xl">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/admin/dashboard")}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to dashboard
          </Button>

          <div className="flex items-start gap-4 mb-6">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-amber-500 text-white shadow-md">
              <Upload className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                  Bulk upload questions
                </h1>
                <Badge className="bg-amber-500 text-white">Admin</Badge>
              </div>
              <p className="mt-1 text-sm sm:text-base text-muted-foreground">
                Import question banks from Excel, CSV, or Word. Columns are auto-mapped.
                Use this to push GNS 106 German and any other course in bulk.
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3 mb-6">
            <Card className="p-4 border-amber-200/60">
              <div className="flex items-center gap-2 mb-1">
                <FileSpreadsheet className="w-4 h-4 text-amber-600" />
                <p className="text-sm font-semibold">1. Download template</p>
              </div>
              <p className="text-xs text-muted-foreground">
                Grab the CSV / Excel / Word template below. Keep headers exactly as shown.
              </p>
            </Card>
            <Card className="p-4 border-amber-200/60">
              <div className="flex items-center gap-2 mb-1">
                <FileText className="w-4 h-4 text-amber-600" />
                <p className="text-sm font-semibold">2. Fill in your questions</p>
              </div>
              <p className="text-xs text-muted-foreground">
                One question per row. Set <code>quiz_title</code> + <code>course_code</code>{" "}
                so rows group automatically.
              </p>
            </Card>
            <Card className="p-4 border-amber-200/60">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <p className="text-sm font-semibold">3. Upload &amp; review</p>
              </div>
              <p className="text-xs text-muted-foreground">
                Preview every quiz before publishing. Rejected rows export to an error report.
              </p>
            </Card>
          </div>

          <Card className="p-5 mb-6 bg-gradient-to-br from-amber-50 to-white border-amber-300/60">
            <h2 className="font-semibold text-lg mb-1">Ready to import?</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Open the bulk uploader — supports .xlsx, .csv, and .docx. Existing courses
              are matched by code so you won't create duplicates.
            </p>
            <Button
              size="lg"
              onClick={() => setOpen(true)}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              <Upload className="w-4 h-4 mr-2" />
              Open bulk uploader
            </Button>
          </Card>

          <div className="mb-2 flex items-center gap-2">
            <FileDown className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Templates &amp; column guide
            </h2>
          </div>
          <QuizUploadTemplates />
        </div>
      </div>

      <BulkQuizImport
        open={open}
        onOpenChange={setOpen}
        onSuccess={() => setOpen(false)}
        adminScope
      />
    </>
  );
};

export default AdminBulkUpload;
