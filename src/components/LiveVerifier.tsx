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
  CheckCircle2,
  Circle,
  Clipboard,
} from "lucide-react";
import { Button } from "./ui/button";
import { Switch } from "./ui/switch";
import { Label } from "./ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./ui/collapsible";
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
  expectedHash?: string;
  computedHash?: string;
  posterVerified?: boolean;
  expectedPosterHash?: string;
  computedPosterHash?: string;
  animationVerified?: boolean;
  expectedAnimationHash?: string;
  computedAnimationHash?: string;
  error?: string;
  errorTitle?: string;
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

// Parse and humanize error messages
function parseError(error: string): { title: string; body: string } {
  if (error.includes('INVALID_CODE') || error.includes('non-empty string')) {
    return {
      title: "Sealing blocked",
      body: "snapshot.code must be a non-empty string.",
    };
  }
  if (error.includes('createCanvas') || error.includes('PROTOCOL_VIOLATION')) {
    return {
      title: "Sealing blocked",
      body: "Canvas is fixed at 1950×2400. Remove createCanvas() from your code.",
    };
  }
  if (error.includes('poster') && error.includes('animation')) {
    return {
      title: "Check failed",
      body: "Loop mode needs both poster + animation hashes. Click 'Seal Baseline' first.",
    };
  }
  if (error.includes('baseline') || error.includes('expected')) {
    return {
      title: "No baseline yet",
      body: "Click 'Seal Baseline' first to capture the expected hash.",
    };
  }
  return {
    title: "Error",
    body: error,
  };
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
  const [tamperOpen, setTamperOpen] = useState(false);

  const hasBaseline = !!expectedHash;
  const hasFullLoopBaseline = isLoopMode ? (!!expectedHash && !!expectedAnimationHash) : !!expectedHash;

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

  // Seal baseline by rendering current snapshot
  const handleSealBaseline = useCallback(async () => {
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
          title: "Baseline sealed",
          description: `Hash captured in ${latencyMs}ms`,
        });
      } else {
        const { title, body } = parseError(renderResult.error || "Unknown error");
        setResult({
          status: 'error',
          mode: isLoopMode ? 'loop' : 'static',
          rendererUrl: getCanonicalUrl(),
          errorTitle: title,
          error: body,
        });
      }
    } catch (e) {
      const { title, body } = parseError(e instanceof Error ? e.message : "Failed to render");
      setResult({
        status: 'error',
        mode: isLoopMode ? 'loop' : 'static',
        rendererUrl: getCanonicalUrl(),
        errorTitle: title,
        error: body,
      });
    }

    setIsRendering(false);
  }, [snapshotJson, jsonError, isLoopMode]);

  // Check against baseline
  const handleCheckAgainstBaseline = useCallback(async () => {
    if (jsonError) return;

    // Block if no baseline
    if (!expectedHash) {
      setResult({
        status: 'error',
        mode: isLoopMode ? 'loop' : 'static',
        rendererUrl: getCanonicalUrl(),
        errorTitle: "No baseline yet",
        error: "Click 'Seal Baseline' first to capture the expected hash.",
      });
      return;
    }

    if (isLoopMode && !expectedAnimationHash) {
      setResult({
        status: 'error',
        mode: 'loop',
        rendererUrl: getCanonicalUrl(),
        errorTitle: "Incomplete baseline",
        error: "Loop mode needs both poster + animation hashes. Click 'Seal Baseline' first.",
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
        const { title, body } = parseError(verifyResult.error);
        setResult({
          status: 'error',
          mode: verifyResult.mode,
          latencyMs,
          rendererUrl: getCanonicalUrl(),
          errorTitle: title,
          error: body,
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
      const { title, body } = parseError(e instanceof Error ? e.message : 'Verification failed');
      setResult({
        status: 'error',
        mode: isLoopMode ? 'loop' : 'static',
        rendererUrl: getCanonicalUrl(),
        errorTitle: title,
        error: body,
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

  const handleCopyJson = () => {
    try {
      const fillableBundle = buildFillableBundle();
      navigator.clipboard.writeText(JSON.stringify(fillableBundle, null, 2));
      toast({ title: "Copied", description: "JSON copied to clipboard" });
    } catch {
      toast({ title: "Error", description: "Invalid JSON snapshot", variant: "destructive" });
    }
  };

  // Build fillable bundle structure
  const buildFillableBundle = () => {
    const snapshot = JSON.parse(snapshotJson);
    const timestamp = new Date().toISOString();
    
    return {
      bundleVersion: "recanon.event.v1",
      createdAt: timestamp,
      mode: isLoopMode ? "loop" : "static",
      claim: {
        title: "",
        statement: "",
        eventDate: "",
        subject: "",
        notes: ""
      },
      sources: [
        { label: "", url: "", retrievedAt: "", selectorOrEvidence: "" }
      ],
      canonical: {
        via: "proxy",
        proxyUrl: getCanonicalUrl(),
        renderer: "hidden",
        protocol: "nexart",
        protocolVersion: "1.0",
        sdkVersion: "1.6.0"
      },
      snapshot,
      baseline: isLoopMode ? {
        posterHash: expectedHash || "",
        animationHash: expectedAnimationHash || ""
      } : {
        posterHash: expectedHash || "",
        animationHash: null
      },
      check: {
        lastCheckedAt: result?.status === 'verified' || result?.status === 'failed' ? timestamp : "",
        result: result?.status === 'verified' ? "VERIFIED" : result?.status === 'failed' ? "FAILED" : ""
      }
    };
  };

  // Download fillable bundle
  const handleDownloadFillable = () => {
    try {
      const fillableBundle = buildFillableBundle();
      const ts = Date.now();
      downloadJson(`recanon-bundle-${ts}.json`, fillableBundle);
      toast({ title: "Downloaded", description: "Fillable bundle saved" });
    } catch {
      toast({ title: "Error", description: "Invalid JSON snapshot", variant: "destructive" });
    }
  };

  // Download snapshot-only
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
      {/* Inline Stepper */}
      <div className="flex items-center gap-2 p-3 rounded-lg border border-border bg-muted/30">
        <div className={cn(
          "flex items-center gap-1.5 text-xs",
          hasBaseline ? "text-verified" : "text-foreground"
        )}>
          {hasBaseline ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <Circle className="w-4 h-4" />
          )}
          <span className="font-medium">1. Seal baseline</span>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Circle className="w-4 h-4" />
          <span>2. Edit something</span>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
        <div className={cn(
          "flex items-center gap-1.5 text-xs",
          result?.status ? (result.status === 'verified' ? "text-verified" : result.status === 'failed' ? "text-destructive" : "text-warning") : "text-muted-foreground"
        )}>
          {result?.status === 'verified' ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : result?.status === 'failed' ? (
            <AlertTriangle className="w-4 h-4" />
          ) : (
            <Circle className="w-4 h-4" />
          )}
          <span>3. Check</span>
        </div>
      </div>

      {/* Status Pills */}
      <div className="flex flex-wrap items-center gap-2">
        <span className={cn(
          "text-xs px-2 py-1 rounded-full border font-mono",
          hasFullLoopBaseline 
            ? "border-verified/50 bg-verified/10 text-verified" 
            : "border-muted-foreground/30 bg-muted/50 text-muted-foreground"
        )}>
          Baseline: {hasFullLoopBaseline ? "Ready" : "Not set"}
        </span>
        <span className="text-xs px-2 py-1 rounded-full border border-primary/50 bg-primary/10 text-primary font-mono">
          Mode: {isLoopMode ? "Loop" : "Static"}
        </span>
        <span className="text-xs px-2 py-1 rounded-full border border-muted-foreground/30 bg-muted/50 text-muted-foreground font-mono">
          Renderer: via proxy
        </span>
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
                "w-full flex-1 min-h-[380px] px-3 py-2 rounded-md bg-input border text-[11px] leading-relaxed font-mono focus:outline-none focus:ring-1 resize-none",
                jsonError ? "border-destructive focus:ring-destructive" : "border-border focus:ring-primary"
              )}
              spellCheck={false}
            />

            {/* Expected Hash Display */}
            {(expectedHash || (isLoopMode && expectedAnimationHash)) && (
              <div className="mt-3 p-3 rounded-md bg-verified/5 border border-verified/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-verified">Baseline (sealed)</span>
                </div>
                {expectedHash && (
                  <div className="flex items-center justify-between gap-2">
                    <code className="text-[10px] font-mono text-foreground truncate flex-1">
                      {isLoopMode ? "poster: " : ""}{truncateHash(expectedHash, 16, 8)}
                    </code>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-5 px-1.5 shrink-0"
                      onClick={() => handleCopyHash(expectedHash)}
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                )}
                {isLoopMode && expectedAnimationHash && (
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-verified/20">
                    <code className="text-[10px] font-mono text-foreground truncate flex-1">
                      animation: {truncateHash(expectedAnimationHash, 16, 8)}
                    </code>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-5 px-1.5 shrink-0"
                      onClick={() => handleCopyHash(expectedAnimationHash)}
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Card Footer - Controls */}
          <div className="px-4 py-3 border-t border-border bg-muted/20">
            {/* Main Actions */}
            <div className="flex items-center justify-between gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSealBaseline}
                disabled={isRendering || !!jsonError}
              >
                {isRendering ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Hash className="w-4 h-4 mr-2" />
                )}
                Seal Baseline
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleCheckAgainstBaseline}
                  disabled={isVerifying || !!jsonError}
                >
                  {isVerifying ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4 mr-2" />
                  )}
                  Check Against Baseline
                </Button>

                {/* Export Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="px-2">
                      <Download className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleCopyJson}>
                      <Clipboard className="w-4 h-4 mr-2" />
                      Copy JSON
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleDownloadFillable}>
                      <FileJson className="w-4 h-4 mr-2" />
                      Download JSON (fillable)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleDownloadSnapshot}>
                      <Code className="w-4 h-4 mr-2" />
                      Download Snapshot Only
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Collapsible Tamper Actions */}
            <Collapsible open={tamperOpen} onOpenChange={setTamperOpen} className="mt-3">
              <CollapsibleTrigger className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                {tamperOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                <span>Try tampering (flip VERIFIED → FAILED)</span>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="flex flex-wrap items-center gap-2 mt-2 pt-2 border-t border-border">
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
              </CollapsibleContent>
            </Collapsible>
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
              <div className="flex-1 flex items-center justify-center rounded-md bg-muted/30 border border-dashed border-border text-muted-foreground min-h-[380px]">
                <div className="text-center p-6 max-w-xs">
                  <ShieldCheck className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" />
                  <p className="text-sm font-medium">No result yet</p>
                  <p className="text-xs mt-2">
                    1. Click <strong>"Seal Baseline"</strong> to capture the expected hash<br/>
                    2. Optionally modify the snapshot<br/>
                    3. Click <strong>"Check Against Baseline"</strong>
                  </p>
                </div>
              </div>
            )}

            {isVerifying && (
              <div className="flex-1 flex items-center justify-center rounded-md bg-muted/30 border border-border min-h-[380px]">
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
                      <div className="w-12 h-12 rounded-full bg-verified/20 flex items-center justify-center">
                        <ShieldCheck className="w-7 h-7 text-verified" />
                      </div>
                      <div>
                        <div className="text-xl font-bold text-verified font-mono tracking-tight">VERIFIED</div>
                        <div className="text-sm text-muted-foreground">All hashes match</div>
                      </div>
                    </>
                  ) : result.status === 'error' ? (
                    <>
                      <div className="w-12 h-12 rounded-full bg-warning/20 flex items-center justify-center">
                        <AlertTriangle className="w-7 h-7 text-warning" />
                      </div>
                      <div>
                        <div className="text-xl font-bold text-warning font-mono tracking-tight">
                          {result.errorTitle || "ERROR"}
                        </div>
                        <div className="text-sm text-muted-foreground max-w-xs">{result.error}</div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-12 h-12 rounded-full bg-destructive/20 flex items-center justify-center">
                        <AlertTriangle className="w-7 h-7 text-destructive" />
                      </div>
                      <div>
                        <div className="text-xl font-bold text-destructive font-mono tracking-tight">FAILED</div>
                        <div className="text-sm text-muted-foreground">Hash mismatch — determinism broken</div>
                      </div>
                    </>
                  )}
                </div>

                {/* Metadata Row */}
                {(result.mode || result.latencyMs !== undefined) && (
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs pt-3 border-t border-border">
                    <span className="text-muted-foreground">Mode: <span className="font-mono text-foreground">{result.mode}</span></span>
                    {result.latencyMs !== undefined && (
                      <span className="text-muted-foreground">Latency: <span className="font-mono text-foreground">{result.latencyMs}ms</span></span>
                    )}
                  </div>
                )}

                {/* Hash Comparison Block - Static */}
                {result.mode === 'static' && result.status !== 'error' && (result.expectedHash || result.computedHash) && (
                  <div className="p-3 rounded-md bg-muted/30 border border-border space-y-2">
                    {result.expectedHash && (
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-muted-foreground shrink-0">Expected:</span>
                        <code className="text-[10px] font-mono truncate">{truncateHash(result.expectedHash, 20, 10)}</code>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-5 px-1 shrink-0"
                          onClick={() => handleCopyHash(result.expectedHash!)}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                    {result.computedHash && (
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-muted-foreground shrink-0">Computed:</span>
                        <code className={cn(
                          "text-[10px] font-mono truncate",
                          result.status === 'verified' ? "text-verified" : "text-destructive"
                        )}>{truncateHash(result.computedHash, 20, 10)}</code>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-5 px-1 shrink-0"
                          onClick={() => handleCopyHash(result.computedHash!)}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {/* Hash Comparison Block - Loop */}
                {result.mode === 'loop' && result.status !== 'error' && (
                  <div className="p-3 rounded-md bg-muted/30 border border-border space-y-3">
                    {/* Poster */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium">Poster</span>
                        <span className={cn(
                          "text-xs font-mono",
                          result.posterVerified ? "text-verified" : "text-destructive"
                        )}>
                          {result.posterVerified ? '✓' : '✗'}
                        </span>
                      </div>
                      {result.expectedPosterHash && (
                        <code className="text-[10px] font-mono text-muted-foreground block truncate">
                          exp: {truncateHash(result.expectedPosterHash, 14, 6)}
                        </code>
                      )}
                      {result.computedPosterHash && (
                        <code className={cn(
                          "text-[10px] font-mono block truncate",
                          result.posterVerified ? "text-verified" : "text-destructive"
                        )}>
                          got: {truncateHash(result.computedPosterHash, 14, 6)}
                        </code>
                      )}
                    </div>

                    {/* Animation */}
                    <div className="space-y-1 pt-2 border-t border-border">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium">Animation</span>
                        <span className={cn(
                          "text-xs font-mono",
                          result.animationVerified ? "text-verified" : "text-destructive"
                        )}>
                          {result.animationVerified ? '✓' : '✗'}
                        </span>
                      </div>
                      {result.expectedAnimationHash && (
                        <code className="text-[10px] font-mono text-muted-foreground block truncate">
                          exp: {truncateHash(result.expectedAnimationHash, 14, 6)}
                        </code>
                      )}
                      {result.computedAnimationHash && (
                        <code className={cn(
                          "text-[10px] font-mono block truncate",
                          result.animationVerified ? "text-verified" : "text-destructive"
                        )}>
                          got: {truncateHash(result.computedAnimationHash, 14, 6)}
                        </code>
                      )}
                    </div>
                  </div>
                )}

                {/* View Raw JSON (Collapsed) */}
                {result.rawResponse && (
                  <Collapsible open={showRawResponse} onOpenChange={setShowRawResponse}>
                    <CollapsibleTrigger className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                      {showRawResponse ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                      <span>View raw JSON</span>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <pre className="mt-2 p-3 rounded bg-muted/50 text-[10px] font-mono overflow-auto max-h-40 border border-border">
                        {JSON.stringify(result.rawResponse, null, 2)}
                      </pre>
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
