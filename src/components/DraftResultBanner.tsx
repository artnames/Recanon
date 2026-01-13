import { AlertTriangle } from "lucide-react";

export function DraftResultBanner() {
  return (
    <div className="flex items-start gap-3 p-4 rounded-md bg-warning/10 border border-warning/30">
      <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
      <div>
        <div className="font-medium text-warning">Draft Result — Not Verifiable</div>
        <p className="text-sm text-muted-foreground mt-1">
          This result was executed in Draft mode. It cannot be independently verified 
          or replayed. For auditable results, use Certified mode.
        </p>
      </div>
    </div>
  );
}
