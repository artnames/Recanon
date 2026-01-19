import { useState, useMemo } from "react";
import { Search, ShieldCheck, AlertTriangle, CheckCircle2, Loader2, Upload, Info, BookOpen, Zap } from "lucide-react";
import { Button } from "./ui/button";
import { HashDisplay } from "./HashDisplay";
import { CanonicalRendererStatus } from "./CanonicalHealthBadge";
import { QuickGuide } from "./QuickGuide";
import { CLIExamples } from "./CLIExamples";
import { LiveVerifier } from "./LiveVerifier";
import { StartHereCard } from "./StartHereCard";
import { BundleValidator, validateBundle, EXAMPLE_STATIC_BUNDLE } from "./BundleValidator";
import { RendererErrorDisplay } from "./RendererErrorDisplay";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { 
  verifyCertifiedStatic,
  verifyCertifiedLoop,
  isLoopMode,
  type CanonicalSnapshot,
  type CanonicalVerifyResponse,
} from "@/certified/canonicalClient";

interface VerificationState {
  status: 'verified' | 'mismatch' | 'error';
  mode: 'static' | 'loop';
  // Static mode fields
  originalHash?: string;
  computedHash?: string;
  // Loop mode fields
  posterVerified?: boolean;
  expectedPosterHash?: string;
  computedPosterHash?: string;
  animationVerified?: boolean;
  expectedAnimationHash?: string;
  computedAnimationHash?: string;
  hashMatchType?: string;
  // Common fields
  matchDetails?: {
    codeMatch: boolean;
    seedMatch: boolean;
    varsMatch: boolean;
    outputMatch: boolean;
  };
  error?: string;
  rendererVersion?: string;
  nodeVersion?: string;
  httpStatus?: number;
}

export function VerifyPanel() {
  const [bundleJson, setBundleJson] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [result, setResult] = useState<VerificationState | null>(null);
  const [activeTab, setActiveTab] = useState('verify');

  // Validation state
  const validation = useMemo(() => validateBundle(bundleJson), [bundleJson]);
  const canVerify = validation.isValid && !isVerifying;

  const handleBundleGenerated = (json: string, type?: 'static' | 'loop' | 'failed') => {
    setBundleJson(json);
    setResult(null);
  };

  const handleLoadExample = () => {
    setBundleJson(JSON.stringify(EXAMPLE_STATIC_BUNDLE, null, 2));
    setResult(null);
  };

  const handleVerifyBundle = async () => {
    // Double-check validation before proceeding
    if (!validation.isValid) return;
    
    setIsVerifying(true);
    setResult(null);

    try {
      const bundle = JSON.parse(bundleJson);
      
      const snapshot: CanonicalSnapshot = bundle.snapshot;
      const isLoop = isLoopMode(snapshot);

      let verifyResult: CanonicalVerifyResponse;

      if (isLoop) {
        // Loop mode: MUST use both hashes
        const expectedPosterHash = bundle.expectedImageHash;
        const expectedAnimationHash = bundle.expectedAnimationHash;

        if (!expectedPosterHash || !expectedAnimationHash) {
          setResult({
            status: 'error',
            mode: 'loop',
            error: 'Loop verification requires both expectedImageHash (poster) and expectedAnimationHash. Cannot verify with only one hash.',
          });
          setIsVerifying(false);
          return;
        }

        verifyResult = await verifyCertifiedLoop(snapshot, expectedPosterHash, expectedAnimationHash);
      } else {
        // Static mode: use single hash
        const expectedHash = bundle.expectedImageHash || bundle.verification?.imageHash;

        if (!expectedHash) {
          setResult({
            status: 'error',
            mode: 'static',
            error: 'Bundle missing expectedImageHash field.',
          });
          setIsVerifying(false);
          return;
        }

        verifyResult = await verifyCertifiedStatic(snapshot, expectedHash);
      }

      if (verifyResult.error) {
        setResult({
          status: 'error',
          mode: verifyResult.mode,
          error: verifyResult.error,
        });
      } else if (verifyResult.verified) {
        setResult({
          status: 'verified',
          mode: verifyResult.mode,
          // Static fields
          originalHash: verifyResult.expectedHash,
          computedHash: verifyResult.computedHash,
          // Loop fields
          posterVerified: verifyResult.posterVerified,
          expectedPosterHash: verifyResult.expectedPosterHash,
          computedPosterHash: verifyResult.computedPosterHash,
          animationVerified: verifyResult.animationVerified,
          expectedAnimationHash: verifyResult.expectedAnimationHash,
          computedAnimationHash: verifyResult.computedAnimationHash,
          hashMatchType: verifyResult.hashMatchType,
          // Common
          matchDetails: {
            codeMatch: verifyResult.verified,
            seedMatch: verifyResult.verified,
            varsMatch: verifyResult.verified,
            outputMatch: verifyResult.verified,
          },
          rendererVersion: verifyResult.metadata?.rendererVersion,
          nodeVersion: verifyResult.metadata?.nodeVersion,
        });
      } else {
        setResult({
          status: 'mismatch',
          mode: verifyResult.mode,
          originalHash: verifyResult.expectedHash,
          computedHash: verifyResult.computedHash,
          posterVerified: verifyResult.posterVerified,
          expectedPosterHash: verifyResult.expectedPosterHash,
          computedPosterHash: verifyResult.computedPosterHash,
          animationVerified: verifyResult.animationVerified,
          expectedAnimationHash: verifyResult.expectedAnimationHash,
          computedAnimationHash: verifyResult.computedAnimationHash,
          hashMatchType: verifyResult.hashMatchType,
          matchDetails: {
            codeMatch: false,
            seedMatch: false,
            varsMatch: false,
            outputMatch: false,
          },
          rendererVersion: verifyResult.metadata?.rendererVersion,
          nodeVersion: verifyResult.metadata?.nodeVersion,
        });
      }
    } catch (error) {
      setResult({
        status: 'error',
        mode: 'static',
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
      setResult(null);
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold mb-2">Check & Test</h2>
          <p className="text-sm text-muted-foreground">
            Check sealed results, create proof bundles, and explore the CLI.
          </p>
        </div>
      </div>

      {/* Renderer Status with Health Badge */}
      <CanonicalRendererStatus />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="live" className="flex items-center gap-2">
            <Zap className="w-3.5 h-3.5" />
            Live Checker
          </TabsTrigger>
          <TabsTrigger value="verify">Check Bundle</TabsTrigger>
          <TabsTrigger value="guide" className="flex items-center gap-2">
            <BookOpen className="w-3.5 h-3.5" />
            Quick Guide
          </TabsTrigger>
        </TabsList>

        <TabsContent value="live" className="mt-6">
          <LiveVerifier />
        </TabsContent>

        <TabsContent value="guide" className="mt-6">
          <QuickGuide />
        </TabsContent>

        <TabsContent value="verify" className="mt-6 space-y-6">
          {/* Start Here Card - Primary Action */}
          <StartHereCard onBundleGenerated={handleBundleGenerated} />

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
                onChange={(e) => {
                  setBundleJson(e.target.value);
                  setResult(null);
                }}
                placeholder='Paste sealed result bundle JSON here or use "Create Result" above...'
                className="w-full h-48 px-3 py-2 rounded-md bg-input border border-border text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              />
            </div>

            {/* Validation Feedback */}
            <div className="mt-3">
              <BundleValidator bundleJson={bundleJson} onLoadExample={handleLoadExample} />
            </div>

            {/* Check Button */}
            <Button 
              variant="default" 
              onClick={handleVerifyBundle}
              disabled={!canVerify}
              className="mt-4"
            >
              {isVerifying ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Checking via Canonical Renderer...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  Check Result
                </>
              )}
            </Button>

            {/* Disabled reason hint */}
            {!canVerify && !isVerifying && bundleJson.trim() && (
              <p className="text-xs text-muted-foreground mt-2">
                Fix the validation errors above to enable checking.
              </p>
            )}
          </div>

          {/* Result */}
          {result && (
            <>
              {result.status === 'error' ? (
                <RendererErrorDisplay error={result.error || 'Unknown error'} httpStatus={result.httpStatus} />
              ) : (
                <div className={`p-6 rounded-md border-2 ${
                  result.status === 'verified' 
                    ? 'border-verified/40 bg-verified/5' 
                    : 'border-destructive/40 bg-destructive/5'
                }`}>
                  <div className="flex items-center gap-3 mb-4">
                    {result.status === 'verified' ? (
                      <>
                        <ShieldCheck className="w-8 h-8 text-verified" />
                        <div>
                          <div className="text-lg font-semibold text-verified font-mono">PASSED</div>
                          <div className="text-sm text-muted-foreground">
                            All checks passed via Canonical Renderer
                            {result.rendererVersion && ` (v${result.rendererVersion})`}
                          </div>
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

                  {/* Mode Badge */}
                  <div className="mb-4">
                    <span className="text-xs font-mono px-2 py-1 rounded bg-muted">
                      mode: {result.mode}
                    </span>
                    {result.hashMatchType && (
                      <span className="text-xs font-mono px-2 py-1 rounded bg-muted ml-2">
                        hashMatchType: {result.hashMatchType}
                      </span>
                    )}
                  </div>

                  {/* Loop Mode Details */}
                  {result.mode === 'loop' && (
                    <div className="space-y-4 mb-4 p-4 rounded-md bg-card border border-border">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Info className="w-4 h-4" />
                        <span>Loop verification requires both poster + animation hashes.</span>
                      </div>
                      
                      {/* Poster Verification */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Poster</span>
                          <span className={result.posterVerified ? 'text-verified' : 'text-destructive'}>
                            {result.posterVerified ? (
                              <span className="flex items-center gap-1">
                                <CheckCircle2 className="w-4 h-4" /> Verified
                              </span>
                            ) : (
                              <span className="flex items-center gap-1">
                                <AlertTriangle className="w-4 h-4" /> Failed
                              </span>
                            )}
                          </span>
                        </div>
                        {result.expectedPosterHash && (
                          <div>
                            <span className="text-xs text-muted-foreground">Expected Poster Hash</span>
                            <HashDisplay hash={result.expectedPosterHash} truncate={false} className="mt-1" />
                          </div>
                        )}
                        {result.computedPosterHash && (
                          <div>
                            <span className="text-xs text-muted-foreground">Computed Poster Hash</span>
                            <HashDisplay hash={result.computedPosterHash} truncate={false} className="mt-1" />
                          </div>
                        )}
                      </div>

                      {/* Animation Verification */}
                      <div className="space-y-2 pt-3 border-t border-border">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Animation</span>
                          <span className={result.animationVerified ? 'text-verified' : 'text-destructive'}>
                            {result.animationVerified ? (
                              <span className="flex items-center gap-1">
                                <CheckCircle2 className="w-4 h-4" /> Verified
                              </span>
                            ) : (
                              <span className="flex items-center gap-1">
                                <AlertTriangle className="w-4 h-4" /> Failed
                              </span>
                            )}
                          </span>
                        </div>
                        {result.expectedAnimationHash && (
                          <div>
                            <span className="text-xs text-muted-foreground">Expected Animation Hash</span>
                            <HashDisplay hash={result.expectedAnimationHash} truncate={false} className="mt-1" />
                          </div>
                        )}
                        {result.computedAnimationHash && (
                          <div>
                            <span className="text-xs text-muted-foreground">Computed Animation Hash</span>
                            <HashDisplay hash={result.computedAnimationHash} truncate={false} className="mt-1" />
                          </div>
                        )}
                      </div>
                    </div>
                  )}

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

                  {/* Static mode hash display */}
                  {result.mode === 'static' && result.originalHash && result.computedHash && (
                    <div className="space-y-2 mt-4 pt-4 border-t border-border">
                      <div>
                        <span className="text-xs text-muted-foreground">Expected Hash</span>
                        <HashDisplay hash={result.originalHash} truncate={false} className="mt-1" />
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground">Computed Hash</span>
                        <HashDisplay hash={result.computedHash} truncate={false} className="mt-1" />
                      </div>
                    </div>
                  )}

                  {result.nodeVersion && (
                    <div className="mt-4 pt-4 border-t border-border text-xs text-muted-foreground">
                      Node: {result.nodeVersion}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* CLI Examples */}
          <CLIExamples />

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
            <div className="mt-3 pt-3 border-t border-border">
              <div className="flex items-start gap-2 text-xs text-muted-foreground">
                <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                <span>
                  <strong>Loop mode:</strong> Verification requires both poster + animation hashes.
                  Static mode requires only the image hash.
                </span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-border">
              No authentication required. Anyone can verify any certified artifact.
              <br />
              No browser SDK. No PRNG mirror. Server-side determinism only.
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
