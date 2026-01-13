import { ShieldCheck, ChevronRight } from "lucide-react";
import type { CertifiedArtifact } from "@/types/backtest";
import { HashDisplay } from "./HashDisplay";
import { VerifiedBadge } from "./VerifiedBadge";

interface ArtifactsListProps {
  artifacts: CertifiedArtifact[];
  onSelect: (artifact: CertifiedArtifact) => void;
  selectedId?: string;
}

export function ArtifactsList({ artifacts, onSelect, selectedId }: ArtifactsListProps) {
  return (
    <div className="space-y-2">
      {artifacts.map((artifact) => (
        <button
          key={artifact.id}
          onClick={() => onSelect(artifact)}
          className={`w-full text-left p-4 rounded-md border transition-all ${
            selectedId === artifact.id
              ? "border-primary bg-primary/5"
              : "border-border bg-card hover:border-muted-foreground/30"
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-verified" />
              <span className="font-mono font-medium">{artifact.id}</span>
              <VerifiedBadge status={artifact.status} />
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </div>
          
          <div className="mt-3 grid grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-xs text-muted-foreground">Return</div>
              <div className={artifact.metrics.totalReturn >= 0 ? "text-verified" : "text-destructive"}>
                {artifact.metrics.totalReturn >= 0 ? "+" : ""}{artifact.metrics.totalReturn.toFixed(2)}%
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Sharpe</div>
              <div>{artifact.metrics.sharpeRatio.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Max DD</div>
              <div className="text-destructive">{artifact.metrics.maxDrawdown.toFixed(2)}%</div>
            </div>
          </div>
          
          <div className="mt-3">
            <HashDisplay hash={artifact.verificationHash} />
          </div>
          
          <div className="mt-2 text-xs text-muted-foreground">
            Executed {new Date(artifact.executedAt).toLocaleString()}
          </div>
        </button>
      ))}
    </div>
  );
}
