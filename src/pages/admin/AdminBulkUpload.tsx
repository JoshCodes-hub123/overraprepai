import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Upload, FileSpreadsheet, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/seo/SEO";
import { BulkQuizImport } from "@/components/tutor/BulkQuizImport";
import { QuizUploadTemplates } from "@/components/tutor/quiz-upload/QuizUploadTemplates";
import { GNS106GermanTemplate } from "@/components/admin/GNS106GermanTemplate";
import { AdminImportHistory } from "@/components/admin/AdminImportHistory";
import { useAdminEnvironment } from "@/hooks/useAdminEnvironment";
import { AdminPersistentHeader } from "@/components/admin/AdminPersistentHeader";
import { QuickResourceUpload } from "@/components/admin/QuickResourceUpload";

/**
 * Unified 1-Screen Material, Note & CBT Question Studio (/admin/bulk-upload)
 * Places the 1-Screen Uploader + Current Materials Manager Table front and center.
 */
const AdminBulkUpload = () => {
  const navigate = useNavigate();
  const adminEnv = useAdminEnvironment();
  const [open, setOpen] = useState(false);
  const [historyKey, setHistoryKey] = useState(0);

  return (
    <>
      <SEO title="Admin · 1-Screen Material & CBT Upload Studio" noindex />
      <div className="min-h-screen bg-[#FAF8F5] text-[#18181B]">
        <div className="container mx-auto px-4 py-6 max-w-5xl space-y-6">
          <div className="flex items-center justify-between gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/admin/dashboard")}
              className="text-xs font-bold text-[#52525B] hover:text-[#18181B]"
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Admin Dashboard
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => setOpen(true)}
              className="h-9 px-3.5 rounded-xl border-[#D4AF37] bg-white hover:bg-[#FAF0D6] text-xs font-bold text-[#18181B] cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5 text-[#9A7B1C]" />
              Advanced Excel / Word Importer
            </Button>
          </div>

          <AdminPersistentHeader showNavStrip={true} />

          <div className="flex items-start gap-4">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#18181B] text-[#D4AF37] shadow-xs shrink-0">
              <Upload className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-[#18181B]">
                Material, Notes &amp; CBT Upload Studio
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-[#52525B]">
                Upload PDFs, paste summary notes &amp; formulas, import CBT questions, and manage all existing database materials in one screen.
              </p>
            </div>
          </div>

          {/* Primary 1-Screen Uploader + Current Materials Manager Table */}
          <QuickResourceUpload />

          {/* Additional Bulk Templates & Import History */}
          <div className="pt-4 border-t border-[#E6E0D4] space-y-4">
            <GNS106GermanTemplate />

            <div className="flex items-center gap-2 pt-2">
              <FileDown className="w-4 h-4 text-[#71717A]" />
              <h2 className="text-xs font-extrabold text-[#71717A] uppercase tracking-wider">
                Spreadsheet Templates &amp; Column Guide
              </h2>
            </div>
            <QuizUploadTemplates />

            <AdminImportHistory refreshKey={historyKey} onRetry={() => setOpen(true)} />
          </div>
        </div>
      </div>

      <BulkQuizImport
        open={open}
        onOpenChange={setOpen}
        onSuccess={() => {
          setOpen(false);
          setHistoryKey((k) => k + 1);
        }}
        adminScope
        targetEnvironment={adminEnv.current.env}
        targetUniversity={adminEnv.current.institution}
      />
    </>
  );
};

export default AdminBulkUpload;
