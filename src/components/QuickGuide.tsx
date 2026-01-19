import { 
  BookOpen, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Hash,
  Play,
  FileJson,
  Search,
  Info,
  ChevronDown
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./ui/collapsible";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function QuickGuide() {
  const [troubleshootingOpen, setTroubleshootingOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BookOpen className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-semibold">Quick Guide</h2>
      </div>

      {/* 6-Step Quickstart */}
      <div className="p-4 rounded-md border border-border bg-card">
        <h3 className="section-header">6-Step Quickstart</h3>
        <ol className="space-y-3 text-sm">
          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-semibold">1</span>
            <div>
              <span className="font-medium">Configure Canonical Renderer URL</span>
              <p className="text-muted-foreground text-xs mt-0.5">
                Set via environment variable or use the "Edit" button in Settings
              </p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-semibold">2</span>
            <div>
              <span className="font-medium">Check renderer health</span>
              <p className="text-muted-foreground text-xs mt-0.5">
                Green badge = ready. Red = unreachable.
              </p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-semibold">3</span>
            <div>
              <span className="font-medium">Create a sealed result</span>
              <p className="text-muted-foreground text-xs mt-0.5">
                Use "Create Result" buttons to generate sealed bundles via Canonical Renderer.
              </p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-semibold">4</span>
            <div>
              <span className="font-medium">Check the result</span>
              <p className="text-muted-foreground text-xs mt-0.5">
                Click "Check Result" — should return <span className="text-verified font-mono">PASSED</span>.
              </p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-semibold">5</span>
            <div>
              <span className="font-medium">Test tampering detection</span>
              <p className="text-muted-foreground text-xs mt-0.5">
                Use "Create Failed (Tampered)" to see hash mismatch in action.
              </p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-semibold">6</span>
            <div>
              <span className="font-medium">Export and share</span>
              <p className="text-muted-foreground text-xs mt-0.5">
                Download bundle JSON for third-party checking or CLI replay.
              </p>
            </div>
          </li>
        </ol>
      </div>

      {/* What is Checked */}
      <div className="p-4 rounded-md border border-border bg-card">
        <h3 className="section-header flex items-center gap-2">
          <ShieldCheck className="w-4 h-4" />
          What Gets Checked
        </h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-verified mt-0.5 flex-shrink-0" />
            <span><strong className="text-foreground">Code</strong> — The exact program source is re-executed.</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-verified mt-0.5 flex-shrink-0" />
            <span><strong className="text-foreground">Seed</strong> — Deterministic randomness from the original execution.</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-verified mt-0.5 flex-shrink-0" />
            <span><strong className="text-foreground">VAR[0-9]</strong> — All 10 parameters (0-100 range) are replayed exactly.</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-verified mt-0.5 flex-shrink-0" />
            <span><strong className="text-foreground">Output Hash</strong> — SHA-256 of rendered bytes must match.</span>
          </li>
        </ul>
      </div>

      {/* Execution Rules */}
      <div className="p-4 rounded-md border border-warning/30 bg-warning/5">
        <h3 className="section-header flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-warning" />
          Execution Rules
        </h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-start gap-2">
            <span className="text-warning font-bold">•</span>
            <span><strong className="text-foreground">Canvas is provided</strong> — The Canonical Renderer provides a 1950×2400 canvas. Do not call <code className="font-mono text-xs bg-muted px-1 rounded">createCanvas()</code>.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-warning font-bold">•</span>
            <span><strong className="text-foreground">Inputs must match</strong> — Identical code, seed, and vars reproduce identical outputs.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-warning font-bold">•</span>
            <span><strong className="text-foreground">Static = 1 hash</strong> — A single output image produces one hash.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-warning font-bold">•</span>
            <span><strong className="text-foreground">Loop = 2 hashes</strong> — Animation outputs require both poster hash and animation hash.</span>
          </li>
        </ul>
      </div>

      {/* Static vs Loop Hash Rules */}
      <div className="p-4 rounded-md border border-border bg-card">
        <h3 className="section-header flex items-center gap-2">
          <Hash className="w-4 h-4" />
          Hash Rules: Static vs Loop
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-3 rounded-md bg-muted/50">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-primary/20 text-primary">Static</span>
            </div>
            <ul className="text-xs space-y-1 text-muted-foreground">
              <li>• Single image output (PNG)</li>
              <li>• One hash: <code className="font-mono">imageHash</code></li>
              <li>• <code className="font-mono">verificationRequirements: "static-single-hash"</code></li>
            </ul>
          </div>
          <div className="p-3 rounded-md bg-muted/50">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-primary/20 text-primary">Loop</span>
            </div>
            <ul className="text-xs space-y-1 text-muted-foreground">
              <li>• Animation output (MP4) + poster (PNG)</li>
              <li>• Two hashes: <code className="font-mono">posterHash</code> + <code className="font-mono">animationHash</code></li>
              <li>• <code className="font-mono">verificationRequirements: "loop-requires-both-hashes"</code></li>
              <li className="text-warning">• Both hashes must pass for PASSED status</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Troubleshooting */}
      <Collapsible open={troubleshootingOpen} onOpenChange={setTroubleshootingOpen}>
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center justify-between p-4 rounded-md border border-border bg-card hover:bg-accent/50 transition-colors">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-warning" />
              <h3 className="text-sm font-medium">Troubleshooting</h3>
            </div>
            <ChevronDown className={cn(
              "w-4 h-4 transition-transform",
              troubleshootingOpen && "rotate-180"
            )} />
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-2 p-4 rounded-md border border-border bg-card space-y-4">
            <div>
              <h4 className="text-sm font-medium text-destructive flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-destructive" />
                Canonical Renderer Unreachable
              </h4>
              <ul className="mt-2 text-xs text-muted-foreground space-y-1 pl-4">
                <li>• Check your renderer URL configuration (use "Edit" in header)</li>
                <li>• In hosted preview, use a public HTTPS URL (not localhost)</li>
                <li>• Verify the canonical renderer server is running</li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-medium text-warning flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-warning" />
                CORS Errors
              </h4>
              <ul className="mt-2 text-xs text-muted-foreground space-y-1 pl-4">
                <li>• Canonical renderer must have CORS enabled for your origin</li>
                <li>• Check browser console for blocked requests</li>
                <li>• For local dev, both must be on localhost or use a proxy</li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-medium text-warning flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-warning" />
                Wrong Renderer URL
              </h4>
              <ul className="mt-2 text-xs text-muted-foreground space-y-1 pl-4">
                <li>• Bundles contain the renderer URL used during creation</li>
                <li>• Verify using the same renderer that created the bundle</li>
                <li>• Different renderers may have different versions</li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-medium flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-muted-foreground" />
                Hash Mismatch (FAILED)
              </h4>
              <ul className="mt-2 text-xs text-muted-foreground space-y-1 pl-4">
                <li>• Snapshot was modified after original execution</li>
                <li>• Hash was tampered with</li>
                <li>• Different renderer version (check metadata)</li>
                <li>• This is expected behavior — tampering is detected</li>
              </ul>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}