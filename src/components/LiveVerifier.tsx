import { useState, useCallback } from "react";
import { 
  ShieldCheck, 
  AlertTriangle, 
  Loader2, 
  RotateCcw,
  Shuffle,
  Hash,
  Code,
  Play,
  Copy,
  ChevronDown,
  ChevronRight,
  Info
} from "lucide-react";
import { Button } from "./ui/button";
import { HashDisplay } from "./HashDisplay";
import { Switch } from "./ui/switch";
import { Label } from "./ui/label";
import { 
  renderCertified,
  verifyCertifiedStatic,
  verifyCertifiedLoop,
  getCanonicalUrl,
  type CanonicalSnapshot,
} from "@/certified/canonicalClient";
import { generateBacktestCodeModeProgram, DEFAULT_VARS, varsToArray } from "@/certified/codeModeProgram";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// Create a valid snapshot that will pass verification
const createVerifiedSnapshot = (isLoop: boolean): { snapshot: CanonicalSnapshot; expectedHash: string; expectedAnimationHash?: string } => {
  return {
    snapshot: {
      code: generateBacktestCodeModeProgram(),
      seed: 42,
      vars: varsToArray(DEFAULT_VARS),
      execution: isLoop ? { frames: 60, loop: true } : { frames: 1, loop: false },
    },
    expectedHash: "PENDING_RENDER", // Will be populated by initial render
    expectedAnimationHash: isLoop ? "PENDING_RENDER" : undefined,
  };
};

interface VerificationResult {
  status: 'verified' | 'failed' | 'error';
  mode: 'static' | 'loop';
  latencyMs?: number;
  rendererUrl?: string;
  // Static mode
  expectedHash?: string;
  computedHash?: string;
  // Loop mode
  posterVerified?: boolean;
  expectedPosterHash?: string;
  computedPosterHash?: string;
  animationVerified?: boolean;
  expectedAnimationHash?: string;
  computedAnimationHash?: string;
  // Error
  error?: string;
  // Raw response for debugging
  rawResponse?: unknown;
}

export function LiveVerifier() {
  const [isLoopMode, setIsLoopMode] = useState(false);
  const [snapshotJson, setSnapshotJson] = useState(() => {
    const initial = createVerifiedSnapshot(false);
    return JSON.stringify(initial.snapshot, null, 2);
  });
  const [expectedHash, setExpectedHash] = useState<string | null>(null);
  const [expectedAnimationHash, setExpectedAnimationHash] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [showRawResponse, setShowRawResponse] = useState(false);

  // Validate JSON on change
  const handleSnapshotChange = (value: string) => {
    setSnapshotJson(value);
    try {
      JSON.parse(value);
      setJsonError(null);
    } catch (e) {
      setJsonError(e instanceof Error ? e.message : 'Invalid JSON');
    }
    // Clear result when editing
    setResult(null);
  };

  // Get a verified baseline by rendering current snapshot
  const handleRenderBaseline = useCallback(async () => {
    if (jsonError) return;

    setIsRendering(true);
    setResult(null);

    try {
      const snapshot: CanonicalSnapshot = JSON.parse(snapshotJson);
      const start = performance.now();
      const renderResult = await renderCertified(snapshot);
      const latencyMs = Math.round(performance.now() - start);

      if (renderResult.success && renderResult.data?.imageHash) {
        setExpectedHash(renderResult.data.imageHash);
        if (isLoopMode && renderResult.data.animationHash) {
          setExpectedAnimationHash(renderResult.data.animationHash);
        }
        toast({
          title: "Baseline rendered",
          description: `Hash: ${renderResult.data.imageHash.slice(0, 16)}... (${latencyMs}ms)`,
        });
      } else {
        toast({
          title: "Render failed",
          description: renderResult.error || "Unknown error",
          variant: "destructive",
        });
      }
    } catch (e) {
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "Failed to render",
        variant: "destructive",
      });
    }

    setIsRendering(false);
  }, [snapshotJson, jsonError, isLoopMode]);

  // Verify current snapshot against expected hash
  const handleVerify = useCallback(async () => {
    if (jsonError || !expectedHash) return;

    setIsVerifying(true);

    try {
      const snapshot: CanonicalSnapshot = JSON.parse(snapshotJson);
      const start = performance.now();
      
      let verifyResult;
      if (isLoopMode && expectedAnimationHash) {
        verifyResult = await verifyCertifiedLoop(snapshot, expectedHash, expectedAnimationHash);
      } else {
        verifyResult = await verifyCertifiedStatic(snapshot, expectedHash);
      }
      
      const latencyMs = Math.round(performance.now() - start);

      if (verifyResult.error) {
        setResult({
          status: 'error',
          mode: verifyResult.mode,
          latencyMs,
          rendererUrl: getCanonicalUrl(),
          error: verifyResult.error,
          rawResponse: verifyResult,
        });
      } else if (verifyResult.verified) {
        setResult({
          status: 'verified',
          mode: verifyResult.mode,
          latencyMs,
          rendererUrl: getCanonicalUrl(),
          expectedHash: verifyResult.data?.originalHash,
          computedHash: verifyResult.data?.computedHash,
          posterVerified: verifyResult.data?.posterVerified,
          expectedPosterHash: verifyResult.data?.expectedPosterHash,
          computedPosterHash: verifyResult.data?.computedPosterHash,
          animationVerified: verifyResult.data?.animationVerified,
          expectedAnimationHash: verifyResult.data?.expectedAnimationHash,
          computedAnimationHash: verifyResult.data?.computedAnimationHash,
          rawResponse: verifyResult,
        });
      } else {
        setResult({
          status: 'failed',
          mode: verifyResult.mode,
          latencyMs,
          rendererUrl: getCanonicalUrl(),
          expectedHash: verifyResult.data?.originalHash || expectedHash,
          computedHash: verifyResult.data?.computedHash,
          posterVerified: verifyResult.data?.posterVerified,
          expectedPosterHash: verifyResult.data?.expectedPosterHash,
          computedPosterHash: verifyResult.data?.computedPosterHash,
          animationVerified: verifyResult.data?.animationVerified,
          expectedAnimationHash: verifyResult.data?.expectedAnimationHash,
          computedAnimationHash: verifyResult.data?.computedAnimationHash,
          rawResponse: verifyResult,
        });
      }
    } catch (e) {
      setResult({
        status: 'error',
        mode: isLoopMode ? 'loop' : 'static',
        rendererUrl: getCanonicalUrl(),
        error: e instanceof Error ? e.message : 'Verification failed',
      });
    }

    setIsVerifying(false);
  }, [snapshotJson, jsonError, expectedHash, expectedAnimationHash, isLoopMode]);

  // Tamper: increment seed
  const handleTamperSeed = () => {
    try {
      const snapshot = JSON.parse(snapshotJson);
      snapshot.seed = (snapshot.seed || 0) + 1;
      setSnapshotJson(JSON.stringify(snapshot, null, 2));
      setResult(null);
    } catch (e) {
      // Invalid JSON, ignore
    }
  };

  // Tamper: modify VAR[0]
  const handleTamperVar = () => {
    try {
      const snapshot = JSON.parse(snapshotJson);
      if (Array.isArray(snapshot.vars) && snapshot.vars.length > 0) {
        snapshot.vars[0] = Math.min(100, (snapshot.vars[0] || 0) + 1);
      }
      setSnapshotJson(JSON.stringify(snapshot, null, 2));
      setResult(null);
    } catch (e) {
      // Invalid JSON, ignore
    }
  };

  // Tamper: append whitespace comment to code
  const handleTamperCode = () => {
    try {
      const snapshot = JSON.parse(snapshotJson);
      snapshot.code = (snapshot.code || '') + '\n// tampered';
      setSnapshotJson(JSON.stringify(snapshot, null, 2));
      setResult(null);
    } catch (e) {
      // Invalid JSON, ignore
    }
  };

  // Reset to verified baseline
  const handleReset = () => {
    const initial = createVerifiedSnapshot(isLoopMode);
    setSnapshotJson(JSON.stringify(initial.snapshot, null, 2));
    setExpectedHash(null);
    setExpectedAnimationHash(null);
    setResult(null);
    setJsonError(null);
  };

  // Toggle mode
  const handleModeChange = (loop: boolean) => {
    setIsLoopMode(loop);
    const initial = createVerifiedSnapshot(loop);
    setSnapshotJson(JSON.stringify(initial.snapshot, null, 2));
    setExpectedHash(null);
    setExpectedAnimationHash(null);
    setResult(null);
    setJsonError(null);
  };

  // Copy computed hash
  const handleCopyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    toast({ title: "Copied", description: "Hash copied to clipboard" });
  };

  return (
    <div className="space-y-4">
      {/* Educational Copy */}
      <div className="flex items-start gap-3 p-4 rounded-md bg-muted/50 border border-border">
        <Info className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
        <div className="text-sm text-muted-foreground">
          <p className="font-medium text-foreground mb-1">Live Verifier (Try to Break It)</p>
          <p>
            This verifier re-executes the snapshot on the Canonical Renderer.{" "}
            <span className="text-foreground">Any change to code, seed, or VAR values must change the output hash.</span>
          </p>
        </div>
      </div>

      {/* Mode Toggle */}
      <div className="flex items-center gap-3">
        <Switch
          id="loop-mode"
          checked={isLoopMode}
          onCheckedChange={handleModeChange}
        />
        <Label htmlFor="loop-mode" className="text-sm">
          Loop Mode (requires both poster + animation hashes)
        </Label>
      </div>

      {/* Split Panel Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left Panel - Snapshot Editor */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="section-header">Snapshot Editor</span>
            {jsonError && (
              <span className="text-xs text-destructive">{jsonError}</span>
            )}
          </div>
          <textarea
            value={snapshotJson}
            onChange={(e) => handleSnapshotChange(e.target.value)}
            className={cn(
              "w-full h-80 px-3 py-2 rounded-md bg-input border text-sm font-mono focus:outline-none focus:ring-1 resize-none",
              jsonError ? "border-destructive focus:ring-destructive" : "border-border focus:ring-primary"
            )}
            spellCheck={false}
          />

          {/* Expected Hash Display */}
          {expectedHash && (
            <div className="p-3 rounded-md bg-card border border-border space-y-2">
              <div className="text-xs text-muted-foreground">Expected Hash (baseline)</div>
              <HashDisplay hash={expectedHash} truncate={false} />
              {isLoopMode && expectedAnimationHash && (
                <>
                  <div className="text-xs text-muted-foreground mt-2">Expected Animation Hash</div>
                  <HashDisplay hash={expectedAnimationHash} truncate={false} />
                </>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRenderBaseline}
              disabled={isRendering || !!jsonError}
            >
              {isRendering ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Hash className="w-4 h-4 mr-2" />
              )}
              Get Baseline Hash
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleVerify}
              disabled={isVerifying || !!jsonError || !expectedHash}
            >
              {isVerifying ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Play className="w-4 h-4 mr-2" />
              )}
              Verify Snapshot
            </Button>
          </div>

          {/* Tamper Buttons */}
          <div className="pt-2 border-t border-border">
            <span className="text-xs text-muted-foreground mb-2 block">Tamper Actions (flip VERIFIED → FAILED)</span>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={handleTamperSeed}>
                <Shuffle className="w-3.5 h-3.5 mr-1.5" />
                Tamper: +1 Seed
              </Button>
              <Button variant="outline" size="sm" onClick={handleTamperVar}>
                <Shuffle className="w-3.5 h-3.5 mr-1.5" />
                Tamper: +1 VAR[0]
              </Button>
              <Button variant="outline" size="sm" onClick={handleTamperCode}>
                <Code className="w-3.5 h-3.5 mr-1.5" />
                Tamper: Edit Code
              </Button>
              <Button variant="ghost" size="sm" onClick={handleReset}>
                <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                Reset
              </Button>
            </div>
          </div>
        </div>

        {/* Right Panel - Verification Result */}
        <div className="space-y-3">
          <span className="section-header">Verification Result</span>
          
          {!result && !isVerifying && (
            <div className="h-80 flex items-center justify-center rounded-md bg-card border border-border text-muted-foreground text-sm">
              <div className="text-center">
                <p>No verification result yet.</p>
                <p className="text-xs mt-1">Click "Get Baseline Hash" then "Verify Snapshot"</p>
              </div>
            </div>
          )}

          {isVerifying && (
            <div className="h-80 flex items-center justify-center rounded-md bg-card border border-border">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground mt-3">Verifying via Canonical Renderer...</p>
              </div>
            </div>
          )}

          {result && !isVerifying && (
            <div className={cn(
              "rounded-md border-2 p-4 space-y-4",
              result.status === 'verified' 
                ? "border-verified/40 bg-verified/5" 
                : result.status === 'error'
                ? "border-warning/40 bg-warning/5"
                : "border-destructive/40 bg-destructive/5"
            )}>
              {/* Status Badge */}
              <div className="flex items-center gap-3">
                {result.status === 'verified' ? (
                  <>
                    <ShieldCheck className="w-8 h-8 text-verified" />
                    <div>
                      <div className="text-lg font-semibold text-verified font-mono">VERIFIED</div>
                      <div className="text-sm text-muted-foreground">All hashes match</div>
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
                      <div className="text-sm text-muted-foreground">Hash mismatch — determinism broken</div>
                    </div>
                  </>
                )}
              </div>

              {/* Metadata */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground">Mode:</span>
                  <span className="ml-2 font-mono">{result.mode}</span>
                </div>
                {result.latencyMs !== undefined && (
                  <div>
                    <span className="text-muted-foreground">Latency:</span>
                    <span className="ml-2 font-mono">{result.latencyMs}ms</span>
                  </div>
                )}
                {result.rendererUrl && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Renderer:</span>
                    <span className="ml-2 font-mono text-xs break-all">{result.rendererUrl}</span>
                  </div>
                )}
              </div>

              {/* Static Mode Hashes */}
              {result.mode === 'static' && (result.expectedHash || result.computedHash) && (
                <div className="space-y-2 pt-2 border-t border-border">
                  {result.expectedHash && (
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Expected Hash</div>
                      <HashDisplay hash={result.expectedHash} truncate={false} />
                    </div>
                  )}
                  {result.computedHash && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-muted-foreground">Computed Hash</span>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-5 px-1.5"
                          onClick={() => handleCopyHash(result.computedHash!)}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                      <HashDisplay hash={result.computedHash} truncate={false} />
                    </div>
                  )}
                </div>
              )}

              {/* Loop Mode Details */}
              {result.mode === 'loop' && (
                <div className="space-y-3 pt-2 border-t border-border">
                  {/* Poster */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span>Poster</span>
                      <span className={result.posterVerified ? 'text-verified' : 'text-destructive'}>
                        {result.posterVerified ? '✓ Verified' : '✗ Failed'}
                      </span>
                    </div>
                    {result.expectedPosterHash && (
                      <div className="text-xs">
                        <span className="text-muted-foreground">Expected: </span>
                        <span className="font-mono">{result.expectedPosterHash.slice(0, 24)}...</span>
                      </div>
                    )}
                    {result.computedPosterHash && (
                      <div className="text-xs">
                        <span className="text-muted-foreground">Computed: </span>
                        <span className="font-mono">{result.computedPosterHash.slice(0, 24)}...</span>
                      </div>
                    )}
                  </div>

                  {/* Animation */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span>Animation</span>
                      <span className={result.animationVerified ? 'text-verified' : 'text-destructive'}>
                        {result.animationVerified ? '✓ Verified' : '✗ Failed'}
                      </span>
                    </div>
                    {result.expectedAnimationHash && (
                      <div className="text-xs">
                        <span className="text-muted-foreground">Expected: </span>
                        <span className="font-mono">{result.expectedAnimationHash.slice(0, 24)}...</span>
                      </div>
                    )}
                    {result.computedAnimationHash && (
                      <div className="text-xs">
                        <span className="text-muted-foreground">Computed: </span>
                        <span className="font-mono">{result.computedAnimationHash.slice(0, 24)}...</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Raw Response (Collapsible) */}
              {result.rawResponse && (
                <div className="pt-2 border-t border-border">
                  <button
                    onClick={() => setShowRawResponse(!showRawResponse)}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                  >
                    {showRawResponse ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                    Raw Response JSON
                  </button>
                  {showRawResponse && (
                    <pre className="mt-2 p-2 rounded bg-input text-xs font-mono overflow-auto max-h-40">
                      {JSON.stringify(result.rawResponse, null, 2)}
                    </pre>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
