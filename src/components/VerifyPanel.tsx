import { useState } from "react";
import { Search, ShieldCheck, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "./ui/button";
import { HashDisplay } from "./HashDisplay";

interface VerificationResult {
  status: 'verified' | 'mismatch' | 'not_found';
  originalHash?: string;
  computedHash?: string;
  matchDetails?: {
    strategyMatch: boolean;
    datasetMatch: boolean;
    parametersMatch: boolean;
    outputMatch: boolean;
  };
}

export function VerifyPanel() {
  const [artifactId, setArtifactId] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);

  const handleVerify = async () => {
    setIsVerifying(true);
    // Simulate verification process
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Mock result
    setResult({
      status: 'verified',
      originalHash: 'a7c9e3f2d8b4a1e6c5f9d2b8a3e7f4c1d9b5a2e8f6c3d7b1a4e9f5c2d8b3a6e7',
      computedHash: 'a7c9e3f2d8b4a1e6c5f9d2b8a3e7f4c1d9b5a2e8f6c3d7b1a4e9f5c2d8b3a6e7',
      matchDetails: {
        strategyMatch: true,
        datasetMatch: true,
        parametersMatch: true,
        outputMatch: true
      }
    });
    setIsVerifying(false);
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">Verify Artifact</h2>
        <p className="text-sm text-muted-foreground">
          Enter a Certified Backtest ID to independently verify its authenticity and reproducibility.
        </p>
      </div>

      {/* Input */}
      <div>
        <label className="section-header">Artifact ID or Verification Hash</label>
        <div className="flex gap-2 mt-2">
          <input
            type="text"
            value={artifactId}
            onChange={(e) => setArtifactId(e.target.value)}
            placeholder="e.g., CBT-2024-001 or a7c9e3f2..."
            className="flex-1 px-3 py-2 rounded-md bg-input border border-border text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <Button 
            variant="default" 
            onClick={handleVerify}
            disabled={!artifactId || isVerifying}
          >
            <Search className="w-4 h-4 mr-2" />
            {isVerifying ? "Verifying..." : "Verify"}
          </Button>
        </div>
      </div>

      {/* Result */}
      {result && (
        <div className={`p-6 rounded-lg border-2 ${
          result.status === 'verified' 
            ? 'border-verified/40 bg-verified/5' 
            : 'border-destructive/40 bg-destructive/5'
        }`}>
          <div className="flex items-center gap-3 mb-4">
            {result.status === 'verified' ? (
              <>
                <ShieldCheck className="w-8 h-8 text-verified" />
                <div>
                  <div className="text-lg font-semibold text-verified">Verification Passed</div>
                  <div className="text-sm text-muted-foreground">All checks completed successfully</div>
                </div>
              </>
            ) : (
              <>
                <AlertTriangle className="w-8 h-8 text-destructive" />
                <div>
                  <div className="text-lg font-semibold text-destructive">Verification Failed</div>
                  <div className="text-sm text-muted-foreground">Hash mismatch detected</div>
                </div>
              </>
            )}
          </div>

          {result.matchDetails && (
            <div className="space-y-3 mt-4 pt-4 border-t border-border">
              <h4 className="section-header">Verification Details</h4>
              {Object.entries(result.matchDetails).map(([key, match]) => (
                <div key={key} className="flex items-center justify-between text-sm">
                  <span className="capitalize">{key.replace('Match', ' Hash')}</span>
                  <span className={match ? 'text-verified' : 'text-destructive'}>
                    {match ? (
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" /> Match
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <AlertTriangle className="w-4 h-4" /> Mismatch
                      </span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}

          {result.originalHash && result.computedHash && (
            <div className="space-y-2 mt-4 pt-4 border-t border-border">
              <div>
                <span className="text-xs text-muted-foreground">Original Hash</span>
                <HashDisplay hash={result.originalHash} truncate={false} className="mt-1" />
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Computed Hash</span>
                <HashDisplay hash={result.computedHash} truncate={false} className="mt-1" />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Instructions */}
      <div className="p-4 rounded-md bg-card border border-border">
        <h4 className="font-medium text-sm mb-2">How Verification Works</h4>
        <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
          <li>The system retrieves the original execution manifest</li>
          <li>It re-executes the strategy with identical inputs and seed</li>
          <li>Output hashes are computed and compared</li>
          <li>Any discrepancy fails verification</li>
        </ol>
        <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-border">
          No authentication required. Anyone can verify any certified artifact.
        </p>
      </div>
    </div>
  );
}
