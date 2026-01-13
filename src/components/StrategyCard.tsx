import { Lock, FileCode } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Strategy } from "@/types/backtest";
import { HashDisplay } from "./HashDisplay";

interface StrategyCardProps {
  strategy: Strategy;
  selected?: boolean;
  onSelect?: () => void;
}

export function StrategyCard({ strategy, selected, onSelect }: StrategyCardProps) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        "w-full text-left p-4 rounded-md border transition-all",
        "bg-card hover:bg-accent/50",
        selected 
          ? "border-primary ring-1 ring-primary/20" 
          : "border-border hover:border-muted-foreground/30"
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <FileCode className="w-4 h-4 text-muted-foreground" />
          <span className="font-medium">{strategy.name}</span>
        </div>
        {strategy.locked && (
          <Lock className="w-3.5 h-3.5 text-verified" />
        )}
      </div>
      <HashDisplay 
        hash={strategy.codeHash} 
        className="mt-2" 
      />
      <div className="mt-2 text-xs text-muted-foreground">
        Registered {new Date(strategy.registeredAt).toLocaleDateString()}
      </div>
    </button>
  );
}
