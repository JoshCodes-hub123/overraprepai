import { AlertTriangle, RefreshCw, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  title: string;
  message?: string;
  onRetry?: () => void;
}

export const StateError = ({ title, message, onRetry }: Props) => (
  <div className="text-center py-8 px-4">
    <div className="mx-auto mb-3 w-10 h-10 rounded-full bg-red-50 grid place-items-center">
      <AlertTriangle className="w-5 h-5 text-red-600" />
    </div>
    <p className="font-semibold text-sm text-foreground">{title}</p>
    {message && (
      <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
        {message}
      </p>
    )}
    {onRetry && (
      <Button
        size="sm"
        variant="outline"
        onClick={onRetry}
        className="mt-3 border-amber-200 text-amber-800 hover:bg-amber-50"
      >
        <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Try again
      </Button>
    )}
  </div>
);

export const StateEmpty = ({
  title,
  message,
}: {
  title: string;
  message?: string;
}) => (
  <div className="text-center py-8 px-4">
    <div className="mx-auto mb-3 w-10 h-10 rounded-full bg-amber-50 grid place-items-center">
      <Inbox className="w-5 h-5 text-amber-600" />
    </div>
    <p className="font-semibold text-sm text-foreground">{title}</p>
    {message && (
      <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
        {message}
      </p>
    )}
  </div>
);
