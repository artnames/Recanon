import { BookOpen, Play, ShieldCheck, RotateCcw, FileCode, CheckCircle2, AlertTriangle, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { StartHereCard } from "./StartHereCard";
import { useState } from "react";

export function HowItWorksPanel() {
  const [generatedBundle, setGeneratedBundle] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">Start Here</h1>
        <p className="text-muted-foreground">
          Recanon produces cryptographically sealed execution results. 
          Any result can be independently checked without trusting the original author.
        </p>
      </div>

      {/* Quick Actions - Primary CTA */}
      <StartHereCard onBundleGenerated={(json, type) => setGeneratedBundle(json)} />

      {/* Execution Rules */}
      <Card className="border-warning/30 bg-warning/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-warning" />
            Execution Rules
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-warning font-bold mt-0.5">•</span>
              <span><strong className="text-foreground">Canvas is provided</strong> — The Canonical Renderer provides a 1950×2400 canvas. Do not call <code className="font-mono text-xs bg-muted px-1 rounded">createCanvas()</code>.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-warning font-bold mt-0.5">•</span>
              <span><strong className="text-foreground">Inputs must match</strong> — Identical code, seed, and vars reproduce identical outputs.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-warning font-bold mt-0.5">•</span>
              <span><strong className="text-foreground">Static = 1 hash</strong> — A single output image produces one hash.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-warning font-bold mt-0.5">•</span>
              <span><strong className="text-foreground">Loop = 2 hashes</strong> — Animation outputs require both poster hash and animation hash.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold mt-0.5">•</span>
              <span><strong className="text-foreground">Seed drives randomness</strong> — <code className="font-mono text-xs bg-muted px-1 rounded">snapshot.seed</code> seeds <code className="font-mono text-xs bg-muted px-1 rounded">random()</code> / <code className="font-mono text-xs bg-muted px-1 rounded">noise()</code>. The <code className="font-mono text-xs bg-muted px-1 rounded">SEED</code> global is optional.</span>
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* 3 Core Concepts */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">3 Core Concepts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <FileCode className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h4 className="font-medium">Strategy</h4>
              <p className="text-sm text-muted-foreground">
                A sealed, immutable piece of code that defines how a backtest runs. 
                Strategies are registered once and cannot be changed.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h4 className="font-medium">Sealed Result</h4>
              <p className="text-sm text-muted-foreground">
                The output of running a strategy through the Canonical Renderer. 
                Includes the visual result (image or video) plus a cryptographic hash.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Play className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h4 className="font-medium">Canonical Renderer</h4>
              <p className="text-sm text-muted-foreground">
                A deterministic remote service that executes strategy code identically every time. 
                Same inputs always produce the same hash.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* What Each Page Does */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">What Each Page Does</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 rounded-md bg-muted/50">
              <FileCode className="w-4 h-4 mt-0.5 text-muted-foreground" />
              <div>
                <span className="font-medium">Strategies</span>
                <p className="text-sm text-muted-foreground">Browse registered strategies. Each has locked code and a content hash.</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-3 rounded-md bg-muted/50">
              <Play className="w-4 h-4 mt-0.5 text-muted-foreground" />
              <div>
                <span className="font-medium">Execute</span>
                <p className="text-sm text-muted-foreground">Run a strategy in Draft (fast, not checkable) or Sealed (deterministic, checkable) mode.</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-3 rounded-md bg-muted/50">
              <ShieldCheck className="w-4 h-4 mt-0.5 text-muted-foreground" />
              <div>
                <span className="font-medium">Sealed Results</span>
                <p className="text-sm text-muted-foreground">View saved sealed results. Export bundles to share or archive.</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-3 rounded-md bg-muted/50">
              <RotateCcw className="w-4 h-4 mt-0.5 text-muted-foreground" />
              <div>
                <span className="font-medium">Check & Test</span>
                <p className="text-sm text-muted-foreground">Re-run any bundle to confirm hashes match. Test tamper detection.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Try This First */}
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-primary" />
            Try This First
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3 text-sm">
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium shrink-0">1</span>
              <span>Click <strong>"Create Result (Static)"</strong> above to generate a sealed result</span>
            </li>
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium shrink-0">2</span>
              <span>Go to <strong>Check & Test</strong> → The bundle JSON is pre-filled</span>
            </li>
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium shrink-0">3</span>
              <span>Click <strong>"Check Result"</strong> to confirm the hash matches</span>
            </li>
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium shrink-0">4</span>
              <span>Try <strong>"Create Failed (Tampered)"</strong> to see how tampering is detected</span>
            </li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
