import { ShieldCheck, Lock } from "lucide-react";
import { HashDisplay } from "./HashDisplay";
import { ArtifactExportMenu } from "./ArtifactExportMenu";
import type { CertifiedExecutionResult } from "@/certified/engine";
import type { ArtifactBundle } from "@/types/artifactBundle";

interface CertifiedResultHeaderProps {
  result: CertifiedExecutionResult;
  bundle?: ArtifactBundle | null;
}

export function CertifiedResultHeader({ result, bundle }: CertifiedResultHeaderProps) {
  return (
    <div className="p-4 rounded-md bg-verified/5 border-2 border-verified/30">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-verified/20 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6 text-verified" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold">Certified Execution</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded bg-verified/15 text-verified border border-verified/30">
                <Lock className="w-3 h-3" />
                Sealed
              </span>
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              Artifact ID: <code className="font-mono text-hash">{result.artifactId}</code>
            </div>
          </div>
        </div>
        
        {/* Export Menu */}
        <ArtifactExportMenu bundle={bundle ?? null} variant="compact" />
      </div>

      <div className="mt-4 pt-4 border-t border-verified/20 space-y-2">
        <div>
          <span className="text-xs text-muted-foreground uppercase tracking-wider">
            Verification Hash
          </span>
          <HashDisplay 
            hash={result.verificationHash} 
            truncate={false}
            className="mt-1"
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-verified/10">
          <div>
            <span className="text-xs text-muted-foreground">Seed</span>
            <code className="block font-mono text-sm text-hash mt-0.5">
              {result.executionManifest.seed}
            </code>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Timestamp</span>
            <code className="block font-mono text-sm text-muted-foreground mt-0.5">
              {new Date(result.executionManifest.timestamp).toISOString()}
            </code>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-verified/10">
          <span className="text-xs text-muted-foreground">Replay Command</span>
          <code className="block font-mono text-xs text-hash bg-background/50 p-2 rounded mt-1">
            {bundle ? `node scripts/replay-artifact.ts --bundle ./${result.artifactId}-bundle.json` : result.replayCommand}
          </code>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-verified/20 text-xs text-muted-foreground">
        <span className="text-verified font-medium">Immutable:</span> This result cannot be altered. 
        Anyone can independently verify by replaying with the same inputs.
      </div>
    </div>
  );
}
