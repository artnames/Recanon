import { Shield, FileEdit, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ExecutionMode } from "@/certified/engine";

interface ExecutionModeToggleProps {
  mode: ExecutionMode;
  onModeChange: (mode: ExecutionMode) => void;
  disabled?: boolean;
}

export function ExecutionModeToggle({ mode, onModeChange, disabled }: ExecutionModeToggleProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="section-header">Execution Mode</div>
      <div className="flex gap-2">
        {/* Draft Mode */}
        <button
          onClick={() => onModeChange('draft')}
          disabled={disabled}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-md border text-sm font-medium transition-all",
            mode === 'draft'
              ? "bg-warning/10 border-warning/40 text-warning"
              : "bg-card border-border text-muted-foreground hover:border-muted-foreground/50",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          <FileEdit className="w-4 h-4" />
          Draft
        </button>

        {/* Certified Mode */}
        <button
          onClick={() => onModeChange('certified')}
          disabled={disabled}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-md border text-sm font-medium transition-all",
            mode === 'certified'
              ? "bg-verified/10 border-verified/40 text-verified"
              : "bg-card border-border text-muted-foreground hover:border-muted-foreground/50",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          <Shield className="w-4 h-4" />
          Certified
        </button>
      </div>

      {/* Mode Description */}
      <div className={cn(
        "p-3 rounded-md text-xs",
        mode === 'certified' 
          ? "bg-verified/5 border border-verified/20" 
          : "bg-warning/5 border border-warning/20"
      )}>
        {mode === 'certified' ? (
          <div className="space-y-1">
            <div className="font-medium text-verified">Certified Mode</div>
            <div className="text-muted-foreground">
              Deterministic • Replayable • Immutable • Verifiable
            </div>
            <div className="text-muted-foreground mt-2">
              Execution will be sealed via NexArt. Results cannot be altered after execution.
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 font-medium text-warning">
              <AlertTriangle className="w-3.5 h-3.5" />
              Draft Mode
            </div>
            <div className="text-muted-foreground">
              Fast • Editable • Not Verifiable
            </div>
            <div className="text-muted-foreground mt-2">
              Results are for testing only. No verification hash will be generated.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
