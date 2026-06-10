import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useStudentLevel, LEVEL_OPTIONS } from "@/hooks/useStudentLevel";
import { Check, GraduationCap } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function ChangeLevelSheet({ open, onOpenChange }: Props) {
  const { level, setLevel } = useStudentLevel();

  const pick = async (next: string) => {
    await setLevel(next);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl border-amber-100 max-h-[85vh]">
        <SheetHeader className="text-left">
          <div className="inline-flex items-center gap-2 text-amber-700">
            <GraduationCap className="w-4 h-4" />
            <span className="text-[11px] font-bold uppercase tracking-wider">Academic level</span>
          </div>
          <SheetTitle className="font-display text-xl">Choose your level</SheetTitle>
          <SheetDescription>
            Your courses, recommendations and Today's Focus all follow this level.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-5 grid grid-cols-2 gap-2.5 pb-6">
          {LEVEL_OPTIONS.map((opt) => {
            const active = level === opt.value;
            return (
              <Button
                key={opt.value}
                variant="outline"
                onClick={() => pick(opt.value)}
                className={`h-14 justify-between rounded-2xl text-left border-2 ${
                  active
                    ? "border-amber-500 bg-amber-50 text-amber-900"
                    : "border-amber-100 hover:border-amber-300 hover:bg-amber-50/50"
                }`}
              >
                <span className="font-display font-bold text-sm">{opt.label}</span>
                {active && <Check className="w-4 h-4 text-amber-600" />}
              </Button>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default ChangeLevelSheet;
