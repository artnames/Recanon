import { Check, Loader2, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ExecutionStep } from "@/types/backtest";
import { HashDisplay } from "./HashDisplay";

interface ExecutionStepsProps {
  steps: ExecutionStep[];
}

export function ExecutionSteps({ steps }: ExecutionStepsProps) {
  return (
    <div className="space-y-1">
      {steps.map((step, index) => (
        <div key={step.id} className="execution-step">
          <div className={cn(
            "execution-step-icon",
            step.status === 'completed' && "completed",
            step.status === 'active' && "active"
          )}>
            {step.status === 'completed' ? (
              <Check className="w-3.5 h-3.5" />
            ) : step.status === 'active' ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <span>{index + 1}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className={cn(
                "text-sm font-medium",
                step.status === 'pending' && "text-muted-foreground"
              )}>
                {step.label}
              </span>
              {step.timestamp && (
                <span className="text-xs text-muted-foreground font-mono">
                  {step.timestamp}
                </span>
              )}
            </div>
            {step.hash && (
              <HashDisplay hash={step.hash} className="mt-1" />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
