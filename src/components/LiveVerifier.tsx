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
  Download,
  FileJson,
} from "lucide-react";
import { Button } from "./ui/button";
import { HashDisplay } from "./HashDisplay";
import { Switch } from "./ui/switch";
import { Label } from "./ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
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
    expectedHash: "PENDING_RENDER",
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

// Utility to download JSON files
function downloadJson(filename: string, obj: object) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Truncate hash for display (start...end)
function truncateHash(hash: string, startLen = 12, endLen = 8): string {
  if (hash.length <= startLen + endLen + 3) return hash;
  return `${hash.slice(0, startLen)}...${hash.slice(-endLen)}`;
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

      if (renderResult.success && renderResult.data) {
        const data = renderResult.data;
        setExpectedHash(data.imageHash);
        if (isLoopMode && data.animationHash) {
          setExpectedAnimationHash(data.animationHash);
        }
        toast({
          title: "Baseline captured",
          description: `Hash: ${data.imageHash.slice(0, 16)}... (${latencyMs}ms)`,
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
    if (jsonError) return;

    // Check for missing hashes and provide actionable feedback
    if (!expectedHash) {
      setResult({
        status: 'error',
        mode: isLoopMode ? 'loop' : 'static',
        rendererUrl: getCanonicalUrl(),
        error: isLoopMode 
          ? 'Missing expected hashes. Click "Get Baseline Hash" first to capture the baseline.'
          : 'Missing expectedImageHash. Click "Get Baseline Hash" first to capture the baseline.',
      });
      return;
    }

    if (isLoopMode && !expectedAnimationHash) {
      setResult({
        status: 'error',
        mode: 'loop',
        rendererUrl: getCanonicalUrl(),
        error: 'Loop mode requires BOTH poster and animation hashes. Click "Get Baseline Hash" first.',
      });
      return;
    }

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
          expectedHash: verifyResult.expectedHash,
          computedHash: verifyResult.computedHash,
          posterVerified: verifyResult.posterVerified,
          expectedPosterHash: verifyResult.expectedPosterHash,
          computedPosterHash: verifyResult.computedPosterHash,
          animationVerified: verifyResult.animationVerified,
          expectedAnimationHash: verifyResult.expectedAnimationHash,
          computedAnimationHash: verifyResult.computedAnimationHash,
          rawResponse: verifyResult,
        });
      } else {
        setResult({
          status: 'failed',
          mode: verifyResult.mode,
          latencyMs,
          rendererUrl: getCanonicalUrl(),
          expectedHash: verifyResult.expectedHash || expectedHash,
          computedHash: verifyResult.computedHash,
          posterVerified: verifyResult.posterVerified,
          expectedPosterHash: verifyResult.expectedPosterHash,
          computedPosterHash: verifyResult.computedPosterHash,
          animationVerified: verifyResult.animationVerified,
          expectedAnimationHash: verifyResult.expectedAnimationHash,
          computedAnimationHash: verifyResult.computedAnimationHash,
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

  // Tamper actions
  const handleTamperSeed = () => {
    try {
      const snapshot = JSON.parse(snapshotJson);
      snapshot.seed = (snapshot.seed || 0) + 1;
      setSnapshotJson(JSON.stringify(snapshot, null, 2));
      setResult(null);
    } catch {
      // Invalid JSON, ignore
    }
  };

  const handleTamperVar = () => {
    try {
      const snapshot = JSON.parse(snapshotJson);
      if (Array.isArray(snapshot.vars) && snapshot.vars.length > 0) {
        snapshot.vars[0] = Math.min(100, (snapshot.vars[0] || 0) + 1);
      }
      setSnapshotJson(JSON.stringify(snapshot, null, 2));
      setResult(null);
    } catch {
      // Invalid JSON, ignore
    }
  };

  const handleTamperCode = () => {
    try {
      const snapshot = JSON.parse(snapshotJson);
      snapshot.code = (snapshot.code || '') + '\n// tampered';
      setSnapshotJson(JSON.stringify(snapshot, null, 2));
      setResult(null);
    } catch {
      // Invalid JSON, ignore
    }
  };

  const handleReset = () => {
    const initial = createVerifiedSnapshot(isLoopMode);
    setSnapshotJson(JSON.stringify(initial.snapshot, null, 2));
    setExpectedHash(null);
    setExpectedAnimationHash(null);
    setResult(null);
    setJsonError(null);
  };

  const handleModeChange = (loop: boolean) => {
    setIsLoopMode(loop);
    const initial = createVerifiedSnapshot(loop);
    setSnapshotJson(JSON.stringify(initial.snapshot, null, 2));
    setExpectedHash(null);
    setExpectedAnimationHash(null);
    setResult(null);
    setJsonError(null);
  };

  const handleCopyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    toast({ title: "Copied", description: "Hash copied to clipboard" });
  };

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast({ title: "Copied", description: "URL copied to clipboard" });
  };

  // Download bundle template JSON
  const handleDownloadBundle = () => {
    try {
      const snapshot = JSON.parse(snapshotJson);
      const bundle: Record<string, unknown> = {
        bundleVersion: "2.0.0",
        canonicalUrl: getCanonicalUrl(),
        snapshot,
        timestamp: new Date().toISOString(),
      };

      if (isLoopMode) {
        bundle.verificationRequirements = "loop-requires-both-hashes";
        bundle.expectedPosterHash = expectedHash || "sha256:___FILL_ME___";
        bundle.expectedAnimationHash = expectedAnimationHash || "sha256:___FILL_ME___";
      } else {
        bundle.verificationRequirements = "static-single-hash";
        bundle.expectedImageHash = expectedHash || "sha256:___FILL_ME___";
      }

      downloadJson('recanon-bundle-template.json', bundle);
      toast({ title: "Downloaded", description: "Bundle template saved" });
    } catch {
      toast({ title: "Error", description: "Invalid JSON snapshot", variant: "destructive" });
    }
  };

  // Download snapshot-only JSON
  const handleDownloadSnapshot = () => {
    try {
      const snapshot = JSON.parse(snapshotJson);
      downloadJson('recanon-snapshot.json', snapshot);
      toast({ title: "Downloaded", description: "Snapshot saved" });
    } catch {
      toast({ title: "Error", description: "Invalid JSON snapshot", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-5">
      {/* Guided Flow Header */}
      <div className="p-4 rounded-lg border border-primary/20 bg-primary/5">
        <h3 className="text-sm font-semibold text-foreground mb-2">How to use the Live Verifier</h3>
        <ol className="text-sm text-muted-foreground space-y-1">
          <li className="flex items-start gap-2">
            <span className="font-mono text-primary text-xs bg-primary/10 px-1.5 py-0.5 rounded">1</span>
            <span>Paste or edit snapshot JSON on the left</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-mono text-primary text-xs bg-primary/10 px-1.5 py-0.5 rounded">2</span>
            <span>Click <strong>Get Baseline Hash</strong> to capture expected hash</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-mono text-primary text-xs bg-primary/10 px-1.5 py-0.5 rounded">3</span>
            <span>Click <strong>Check Snapshot</strong> to verify</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-mono text-muted-foreground text-xs bg-muted px-1.5 py-0.5 rounded">4</span>
            <span className="text-muted-foreground">Optional: Use tamper actions to see it fail</span>
          </li>
        </ol>
      </div>

      {/* 2-Column Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left Panel - Snapshot Editor Card */}
        <div className="rounded-lg border border-border bg-card flex flex-col">
          {/* Card Header */}
          <div className="px-4 py-3 border-b border-border">
            <div className="flex items-center justify-between mb-1">
              <h4 className="text-sm font-semibold">Snapshot</h4>
              {jsonError && (
                <span className="text-xs text-destructive font-mono">{jsonError}</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              This JSON is executed on the Canonical Renderer. Any change to code/seed/VAR changes the hash.
            </p>
          </div>

          {/* Mode Toggle */}
          <div className="px-4 py-2.5 border-b border-border bg-muted/30">
            <div className="flex items-center gap-2.5">
              <Label htmlFor="mode-toggle" className="text-xs text-muted-foreground">Mode:</Label>
              <Switch
                id="mode-toggle"
                checked={isLoopMode}
                onCheckedChange={handleModeChange}
                className="scale-90"
              />
              <span className="text-xs font-mono">
                {isLoopMode ? (
                  <span className="text-primary">Loop (poster + animation)</span>
                ) : (
                  <span>Static (single hash)</span>
                )}
              </span>
            </div>
          </div>

          {/* Editor Body */}
          <div className="p-4 flex-1 flex flex-col">
            <textarea
              value={snapshotJson}
              onChange={(e) => handleSnapshotChange(e.target.value)}
              className={cn(
                "w-full flex-1 min-h-[420px] px-3 py-2 rounded-md bg-input border text-xs font-mono focus:outline-none focus:ring-1 resize-none",
                jsonError ? "border-destructive focus:ring-destructive" : "border-border focus:ring-primary"
              )}
              spellCheck={false}
            />

            {/* Expected Hash Display */}
            {expectedHash && (
              <div className="mt-3 p-3 rounded-md bg-muted/50 border border-border space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Expected Hash (baseline)</span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-5 px-1.5"
                    onClick={() => handleCopyHash(expectedHash)}
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
                <code className="text-xs font-mono text-foreground block break-all">{expectedHash}</code>
                {isLoopMode && expectedAnimationHash && (
                  <>
                    <div className="flex items-center justify-between pt-2 border-t border-border">
                      <span className="text-xs text-muted-foreground">Expected Animation Hash</span>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-5 px-1.5"
                        onClick={() => handleCopyHash(expectedAnimationHash)}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                    <code className="text-xs font-mono text-foreground block break-all">{expectedAnimationHash}</code>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Card Footer - Sticky Controls */}
          <div className="px-4 py-3 border-t border-border bg-muted/20">
            <div className="flex items-center justify-between gap-3">
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
              <div className="flex items-center gap-2">
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleVerify}
                  disabled={isVerifying || !!jsonError}
                >
                  {isVerifying ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4 mr-2" />
                  )}
                  Check Snapshot
                </Button>

                {/* Download Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="px-2">
                      <Download className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleDownloadBundle}>
                      <FileJson className="w-4 h-4 mr-2" />
                      Download JSON (Bundle Template)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleDownloadSnapshot}>
                      <Code className="w-4 h-4 mr-2" />
                      Download Snapshot
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Tamper Actions */}
            <div className="mt-3 pt-3 border-t border-border">
              <span className="text-xs text-muted-foreground block mb-2">Tamper (flip VERIFIED → FAILED)</span>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleTamperSeed}>
                  <Shuffle className="w-3 h-3 mr-1" />
                  +1 Seed
                </Button>
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleTamperVar}>
                  <Shuffle className="w-3 h-3 mr-1" />
                  +1 VAR[0]
                </Button>
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleTamperCode}>
                  <Code className="w-3 h-3 mr-1" />
                  Edit Code
                </Button>
                <div className="flex-1" />
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleReset}>
                  <RotateCcw className="w-3 h-3 mr-1" />
                  Reset
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Result Card */}
        <div className="rounded-lg border border-border bg-card flex flex-col">
          {/* Card Header */}
          <div className="px-4 py-3 border-b border-border">
            <h4 className="text-sm font-semibold">Verification Result</h4>
          </div>

          {/* Result Body */}
          <div className="p-4 flex-1 flex flex-col">
            {!result && !isVerifying && (
              <div className="flex-1 flex items-center justify-center rounded-md bg-muted/30 border border-dashed border-border text-muted-foreground min-h-[420px]">
                <div className="text-center p-6">
                  <ShieldCheck className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" />
                  <p className="text-sm font-medium">No result yet</p>
                  <p className="text-xs mt-1">
                    Click "Get Baseline Hash" then "Check Snapshot"
                  </p>
                </div>
              </div>
            )}

            {isVerifying && (
              <div className="flex-1 flex items-center justify-center rounded-md bg-muted/30 border border-border min-h-[420px]">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                  <p className="text-sm text-muted-foreground mt-3">Checking via Canonical Renderer...</p>
                </div>
              </div>
            )}

            {result && !isVerifying && (
              <div className={cn(
                "flex-1 rounded-md border-2 p-5 space-y-4",
                result.status === 'verified' 
                  ? "border-verified/50 bg-verified/5" 
                  : result.status === 'error'
                  ? "border-warning/50 bg-warning/5"
                  : "border-destructive/50 bg-destructive/5"
              )}>
                {/* Big Status Badge */}
                <div className="flex items-center gap-4">
                  {result.status === 'verified' ? (
                    <>
                      <div className="w-14 h-14 rounded-full bg-verified/20 flex items-center justify-center">
                        <ShieldCheck className="w-8 h-8 text-verified" />
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-verified font-mono tracking-tight">VERIFIED</div>
                        <div className="text-sm text-muted-foreground">All hashes match</div>
                      </div>
                    </>
                  ) : result.status === 'error' ? (
                    <>
                      <div className="w-14 h-14 rounded-full bg-warning/20 flex items-center justify-center">
                        <AlertTriangle className="w-8 h-8 text-warning" />
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-warning font-mono tracking-tight">ERROR</div>
                        <div className="text-sm text-muted-foreground max-w-xs">{result.error}</div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-14 h-14 rounded-full bg-destructive/20 flex items-center justify-center">
                        <AlertTriangle className="w-8 h-8 text-destructive" />
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-destructive font-mono tracking-tight">FAILED</div>
                        <div className="text-sm text-muted-foreground">Hash mismatch — determinism broken</div>
                      </div>
                    </>
                  )}
                </div>

                {/* Metadata Row */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs pt-3 border-t border-border">
                  <div>
                    <span className="text-muted-foreground">Mode:</span>
                    <span className="ml-1.5 font-mono">{result.mode}</span>
                  </div>
                  {result.latencyMs !== undefined && (
                    <div>
                      <span className="text-muted-foreground">Latency:</span>
                      <span className="ml-1.5 font-mono">{result.latencyMs}ms</span>
                    </div>
                  )}
                  {result.rendererUrl && (
                    <div className="flex items-center gap-1">
                      <span className="text-muted-foreground">Renderer:</span>
                      <span className="font-mono">{truncateHash(result.rendererUrl, 20, 0)}</span>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-4 w-4 p-0"
                        onClick={() => handleCopyUrl(result.rendererUrl!)}
                      >
                        <Copy className="w-2.5 h-2.5" />
                      </Button>
                    </div>
                  )}
                </div>

                {/* Static Mode Hashes */}
                {result.mode === 'static' && result.status !== 'error' && (
                  <div className="space-y-3 pt-3 border-t border-border">
                    {result.expectedHash && (
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-muted-foreground">Expected</span>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-5 px-1.5"
                            onClick={() => handleCopyHash(result.expectedHash!)}
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                        <code className="text-xs font-mono break-all block">{truncateHash(result.expectedHash, 24, 12)}</code>
                      </div>
                    )}
                    {result.computedHash && (
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-muted-foreground">Computed</span>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-5 px-1.5"
                            onClick={() => handleCopyHash(result.computedHash!)}
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                        <code className={cn(
                          "text-xs font-mono break-all block",
                          result.status === 'verified' ? "text-verified" : "text-destructive"
                        )}>{truncateHash(result.computedHash, 24, 12)}</code>
                      </div>
                    )}
                  </div>
                )}

                {/* Loop Mode Details */}
                {result.mode === 'loop' && result.status !== 'error' && (
                  <div className="space-y-4 pt-3 border-t border-border">
                    {/* Poster */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium">Poster Hash</span>
                        <span className={cn(
                          "text-xs font-mono",
                          result.posterVerified ? "text-verified" : "text-destructive"
                        )}>
                          {result.posterVerified ? '✓ Match' : '✗ Mismatch'}
                        </span>
                      </div>
                      {result.expectedPosterHash && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Expected:</span>
                          <code className="font-mono">{truncateHash(result.expectedPosterHash, 12, 8)}</code>
                        </div>
                      )}
                      {result.computedPosterHash && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Computed:</span>
                          <code className={cn(
                            "font-mono",
                            result.posterVerified ? "text-verified" : "text-destructive"
                          )}>{truncateHash(result.computedPosterHash, 12, 8)}</code>
                        </div>
                      )}
                    </div>

                    {/* Animation */}
                    <div className="space-y-2 pt-3 border-t border-border">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium">Animation Hash</span>
                        <span className={cn(
                          "text-xs font-mono",
                          result.animationVerified ? "text-verified" : "text-destructive"
                        )}>
                          {result.animationVerified ? '✓ Match' : '✗ Mismatch'}
                        </span>
                      </div>
                      {result.expectedAnimationHash && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Expected:</span>
                          <code className="font-mono">{truncateHash(result.expectedAnimationHash, 12, 8)}</code>
                        </div>
                      )}
                      {result.computedAnimationHash && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Computed:</span>
                          <code className={cn(
                            "font-mono",
                            result.animationVerified ? "text-verified" : "text-destructive"
                          )}>{truncateHash(result.computedAnimationHash, 12, 8)}</code>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Raw Response (Collapsed by default) */}
                {result.rawResponse && (
                  <div className="pt-3 border-t border-border">
                    <button
                      onClick={() => setShowRawResponse(!showRawResponse)}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showRawResponse ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                      <span>Raw Response JSON</span>
                    </button>
                    {showRawResponse && (
                      <pre className="mt-2 p-3 rounded bg-muted/50 text-xs font-mono overflow-auto max-h-48 border border-border">
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
    </div>
  );
}
