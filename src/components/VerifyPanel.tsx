import { useState } from "react";
import { Search, ShieldCheck, AlertTriangle, CheckCircle2, Loader2, Upload } from "lucide-react";
import { Button } from "./ui/button";
import { HashDisplay } from "./HashDisplay";
import { 
  verifyCertified, 
  verifyBundleViaCanonical,
  getCanonicalRendererInfo,
  type CanonicalSnapshot 
} from "@/certified/canonicalClient";

interface VerificationResult {
  status: 'verified' | 'mismatch' | 'not_found' | 'error';
  originalHash?: string;
  computedHash?: string;
  matchDetails?: {
    codeMatch: boolean;
    seedMatch: boolean;
    varsMatch: boolean;
    outputMatch: boolean;
  };
  error?: string;
  rendererVersion?: string;
  nodeVersion?: string;
}

export function VerifyPanel() {
  const [bundleJson, setBundleJson] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);

  const rendererInfo = getCanonicalRendererInfo();

  const handleVerifyBundle = async () => {
    if (!bundleJson.trim()) return;
    
    setIsVerifying(true);
    setResult(null);

    try {
      const bundle = JSON.parse(bundleJson);
      
      // Handle both new and legacy bundle formats
      let snapshot: CanonicalSnapshot;
      let expectedHash: string;
      
      if (bundle.snapshot && bundle.snapshot.code) {
        // New Code Mode bundle format
        snapshot = bundle.snapshot;
        expectedHash = bundle.expectedImageHash || bundle.verification?.imageHash;
      } else if (bundle.params && bundle.strategy) {
        // Legacy bundle format - not supported for Code Mode verification
        setResult({
          status: 'error',
          error: 'Legacy bundle format detected. Please use a Code Mode artifact bundle.',
        });
        setIsVerifying(false);
        return;
      } else {
        setResult({
          status: 'error',
          error: 'Invalid bundle format. Expected Code Mode snapshot with code, seed, and vars.',
        });
        setIsVerifying(false);
        return;
      }

      if (!expectedHash) {
        setResult({
          status: 'error',
          error: 'Bundle missing expectedImageHash field.',
        });
        setIsVerifying(false);
        return;
      }

      // Verify via Canonical Renderer
      const verifyResult = await verifyCertified(snapshot, expectedHash);

      if (verifyResult.error) {
        setResult({
          status: 'error',
          error: verifyResult.error,
        });
      } else if (verifyResult.verified && verifyResult.data) {
        setResult({
          status: 'verified',
          originalHash: verifyResult.data.originalHash,
          computedHash: verifyResult.data.computedHash,
          matchDetails: verifyResult.data.matchDetails,
          rendererVersion: verifyResult.data.rendererVersion,
          nodeVersion: verifyResult.data.nodeVersion,
        });
      } else if (verifyResult.data) {
        setResult({
          status: 'mismatch',
          originalHash: verifyResult.data.originalHash,
          computedHash: verifyResult.data.computedHash,
          matchDetails: verifyResult.data.matchDetails,
          rendererVersion: verifyResult.data.rendererVersion,
          nodeVersion: verifyResult.data.nodeVersion,
        });
      } else {
        setResult({
          status: 'error',
          error: 'Unknown verification error',
        });
      }
    } catch (error) {
      setResult({
        status: 'error',
        error: error instanceof Error ? error.message : 'Failed to parse bundle JSON',
      });
    }

    setIsVerifying(false);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setBundleJson(content);
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">Verify Certified Artifact</h2>
        <p className="text-sm text-muted-foreground">
          Upload or paste a Certified Artifact bundle to verify it via the Canonical Renderer.
          No fallback. No mock. Server-side execution only.
        </p>
      </div>

      {/* Renderer Info */}
      <div className="p-3 rounded-md bg-card border border-border">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Canonical Renderer:</span>
          <code className="font-mono text-xs bg-muted px-2 py-1 rounded">
            {rendererInfo.url}
          </code>
        </div>
        <div className="flex items-center justify-between text-sm mt-1">
          <span className="text-muted-foreground">Status:</span>
          <span className={rendererInfo.configured ? 'text-verified' : 'text-warning'}>
            {rendererInfo.configured ? 'Configured' : 'Using default (localhost)'}
          </span>
        </div>
      </div>

      {/* Bundle Input */}
      <div>
        <label className="section-header">Artifact Bundle JSON</label>
        <div className="mt-2 space-y-2">
          <div className="flex gap-2">
            <label className="flex-1">
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button variant="outline" className="w-full" asChild>
                <span>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Bundle JSON
                </span>
              </Button>
            </label>
          </div>
          <textarea
            value={bundleJson}
            onChange={(e) => setBundleJson(e.target.value)}
            placeholder='Paste artifact bundle JSON here or upload a file...'
            className="w-full h-48 px-3 py-2 rounded-md bg-input border border-border text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary resize-none"
          />
        </div>
        <Button 
          variant="default" 
          onClick={handleVerifyBundle}
          disabled={!bundleJson.trim() || isVerifying}
          className="mt-3"
        >
          {isVerifying ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Verifying via Canonical Renderer...
            </>
          ) : (
            <>
              <Search className="w-4 h-4 mr-2" />
              Verify Bundle
            </>
          )}
        </Button>
      </div>

      {/* Result */}
      {result && (
        <div className={`p-6 rounded-md border-2 ${
          result.status === 'verified' 
            ? 'border-verified/40 bg-verified/5' 
            : result.status === 'error'
            ? 'border-warning/40 bg-warning/5'
            : 'border-destructive/40 bg-destructive/5'
        }`}>
          <div className="flex items-center gap-3 mb-4">
            {result.status === 'verified' ? (
              <>
                <ShieldCheck className="w-8 h-8 text-verified" />
                <div>
                  <div className="text-lg font-semibold text-verified font-mono">VERIFIED</div>
                  <div className="text-sm text-muted-foreground">
                    All checks passed via Canonical Renderer
                    {result.rendererVersion && ` (v${result.rendererVersion})`}
                  </div>
                </div>
              </>
            ) : result.status === 'error' ? (
              <>
                <AlertTriangle className="w-8 h-8 text-warning" />
                <div>
                  <div className="text-lg font-semibold text-warning font-mono">ERROR</div>
                  <div className="text-sm text-muted-foreground">{result.error}</div>
                </div>
              </>
            ) : (
              <>
                <AlertTriangle className="w-8 h-8 text-destructive" />
                <div>
                  <div className="text-lg font-semibold text-destructive font-mono">FAILED</div>
                  <div className="text-sm text-muted-foreground">Hash mismatch detected</div>
                </div>
              </>
            )}
          </div>

          {result.matchDetails && (
            <div className="space-y-3 mt-4 pt-4 border-t border-border">
              <h4 className="section-header">Verification Details</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center justify-between">
                  <span>Code</span>
                  <span className={result.matchDetails.codeMatch ? 'text-verified' : 'text-destructive'}>
                    {result.matchDetails.codeMatch ? (
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
                <div className="flex items-center justify-between">
                  <span>Seed</span>
                  <span className={result.matchDetails.seedMatch ? 'text-verified' : 'text-destructive'}>
                    {result.matchDetails.seedMatch ? (
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
                <div className="flex items-center justify-between">
                  <span>VAR[0-9]</span>
                  <span className={result.matchDetails.varsMatch ? 'text-verified' : 'text-destructive'}>
                    {result.matchDetails.varsMatch ? (
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
                <div className="flex items-center justify-between">
                  <span>Output</span>
                  <span className={result.matchDetails.outputMatch ? 'text-verified' : 'text-destructive'}>
                    {result.matchDetails.outputMatch ? (
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
              </div>
            </div>
          )}

          {result.originalHash && result.computedHash && (
            <div className="space-y-2 mt-4 pt-4 border-t border-border">
              <div>
                <span className="text-xs text-muted-foreground">Expected Hash</span>
                <HashDisplay hash={result.originalHash} truncate={false} className="mt-1" />
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Computed Hash</span>
                <HashDisplay hash={result.computedHash} truncate={false} className="mt-1" />
              </div>
              {result.nodeVersion && (
                <div className="mt-2 text-xs text-muted-foreground">
                  Node: {result.nodeVersion}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Instructions */}
      <div className="p-4 rounded-md bg-card border border-border">
        <h4 className="font-medium text-sm mb-2">How Verification Works</h4>
        <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
          <li>Upload or paste a certified artifact bundle JSON</li>
          <li>Bundle is sent to Canonical Renderer at <code className="font-mono text-xs">/verify</code></li>
          <li>Renderer re-executes Code Mode program with identical seed &amp; VAR[0-9]</li>
          <li>Output image hash is computed and compared</li>
          <li>Any discrepancy = FAILED (no fallback)</li>
        </ol>
        <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-border">
          No authentication required. Anyone can verify any certified artifact.
          <br />
          No browser SDK. No PRNG mirror. Server-side determinism only.
        </p>
      </div>
    </div>
  );
}
