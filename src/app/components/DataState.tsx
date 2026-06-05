import { type ReactNode } from "react";
import { AlertCircle, CheckCircle2, RefreshCw } from "lucide-react";
import { Button } from "./ui/button";

interface DataErrorStateProps {
  title?: string;
  description: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

export function DataErrorState({
  title = "We could not load this section",
  description,
  onRetry,
  retryLabel = "Retry",
  className = "",
}: DataErrorStateProps) {
  return (
    <div
      className={[
        "rounded-xl border border-red-200/70 bg-red-50/70 px-5 py-4",
        "backdrop-blur-md",
        className,
      ].join(" ")}
      role="alert"
      aria-live="polite"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-full bg-red-100 p-1.5 text-red-600">
            <AlertCircle className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-red-900">{title}</p>
            <p className="text-sm text-red-800/90">{description}</p>
          </div>
        </div>

        {onRetry ? (
          <Button
            type="button"
            variant="outline"
            onClick={onRetry}
            className="border-red-200 bg-white/70 text-red-700 hover:bg-white"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            {retryLabel}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

interface ActionSuccessStateProps {
  message: string;
  action?: ReactNode;
  className?: string;
}

export function ActionSuccessState({ message, action, className = "" }: ActionSuccessStateProps) {
  return (
    <div
      className={[
        "rounded-xl border border-emerald-200/80 bg-emerald-50/75 px-4 py-3",
        "backdrop-blur-md",
        className,
      ].join(" ")}
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-emerald-800">
          <CheckCircle2 className="h-4 w-4" />
          <p className="text-sm font-medium">{message}</p>
        </div>
        {action}
      </div>
    </div>
  );
}
