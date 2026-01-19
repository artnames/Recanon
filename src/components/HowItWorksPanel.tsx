import { BookOpen, Play, ShieldCheck, RotateCcw, FileCode, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

export function HowItWorksPanel() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">How Recanon Works</h1>
        <p className="text-muted-foreground">
          Recanon produces cryptographically verifiable backtest results. 
          Any result can be independently replayed and verified without trusting the original author.
        </p>
      </div>

      {/* Core Concepts */}
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
              <h4 className="font-medium">Certified Result</h4>
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
                <p className="text-sm text-muted-foreground">Run a strategy in Draft (fast, not verifiable) or Certified (deterministic, verifiable) mode.</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-3 rounded-md bg-muted/50">
              <ShieldCheck className="w-4 h-4 mt-0.5 text-muted-foreground" />
              <div>
                <span className="font-medium">Artifacts</span>
                <p className="text-sm text-muted-foreground">View saved certified results. Export bundles to share or archive.</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-3 rounded-md bg-muted/50">
              <RotateCcw className="w-4 h-4 mt-0.5 text-muted-foreground" />
              <div>
                <span className="font-medium">Verify & Test</span>
                <p className="text-sm text-muted-foreground">Re-run any bundle to confirm hashes match. Test tamper detection.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Static vs Loop */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Static vs Loop Outputs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <h4 className="font-medium">Static Mode</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Single PNG image</li>
                <li>• One hash to verify</li>
                <li>• Faster execution</li>
                <li>• Best for: snapshots, charts</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Loop Mode</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• MP4 animation + poster</li>
                <li>• Two hashes to verify</li>
                <li>• Requires draw() function</li>
                <li>• Best for: equity curves, time series</li>
              </ul>
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
              <span>Go to <strong>Execute</strong> → Select a strategy → Switch to <strong>Certified</strong> mode → Click <strong>Execute</strong></span>
            </li>
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium shrink-0">2</span>
              <span>View your result in <strong>Artifacts</strong> → Click <strong>Export Bundle</strong></span>
            </li>
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium shrink-0">3</span>
              <span>Go to <strong>Verify & Test</strong> → Paste the bundle JSON → Click <strong>Verify Bundle</strong></span>
            </li>
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium shrink-0">4</span>
              <span>Confirm status shows <strong>VERIFIED</strong> — the hash matched.</span>
            </li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
