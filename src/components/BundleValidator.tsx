import { useMemo } from "react";
import { AlertCircle, CheckCircle2, XCircle, HelpCircle, FileText } from "lucide-react";
import { Button } from "./ui/button";

interface ValidationResult {
  isValid: boolean;
  isEmpty: boolean;
  parseError: string | null;
  missingFields: string[];
  mode: 'static' | 'loop' | 'unknown';
  warnings: string[];
}

interface BundleValidatorProps {
  bundleJson: string;
  onLoadExample: () => void;
}

// Example static bundle that works without network (for instant loading)
// NOTE: Canvas is provided by Canonical Renderer - do NOT call createCanvas()
export const EXAMPLE_STATIC_BUNDLE = {
  runtime: "nexart-canonical-renderer",
  artifactId: "example-static-001",
  snapshot: {
    code: `
// Deterministic Static Proof Program
// Canvas: 1950x2400 (provided by runtime)
function setup() {
  // Canvas is provided by the Canonical Renderer
  noLoop();
}

function draw() {
  background(20, 24, 30);
  randomSeed(SEED);
  
  const cols = 8;
  const rows = 6;
  const cellW = width / cols;
  const cellH = height / rows;
  
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      const x = i * cellW + cellW / 2;
      const y = j * cellH + cellH / 2;
      const size = map(VAR[0], 0, 100, 20, 80);
      const hue = map(VAR[1], 0, 100, 120, 200);
      
      fill(hue, 180, 200);
      noStroke();
      ellipse(x, y, size, size);
    }
  }
}
`,
    seed: 42,
    vars: [50, 55, 30, 20, 10, 15, 5, 25, 40, 60],
    execution: {
      frames: 1,
      loop: false
    }
  },
  expectedImageHash: "example_hash_must_be_replaced",
  verificationRequirements: "static-single-hash",
  _note: "Example bundle - create a real result using 'Create Result' buttons above"
};

export function validateBundle(bundleJson: string): ValidationResult {
  // Check empty
  if (!bundleJson.trim()) {
    return {
      isValid: false,
      isEmpty: true,
      parseError: null,
      missingFields: [],
      mode: 'unknown',
      warnings: [],
    };
  }

  // Try parse
  let bundle: any;
  try {
    bundle = JSON.parse(bundleJson);
  } catch (e) {
    return {
      isValid: false,
      isEmpty: false,
      parseError: e instanceof Error ? e.message : 'Invalid JSON',
      missingFields: [],
      mode: 'unknown',
      warnings: [],
    };
  }

  const missingFields: string[] = [];
  const warnings: string[] = [];

  // Check snapshot
  if (!bundle.snapshot) {
    missingFields.push('snapshot');
  } else {
    if (!bundle.snapshot.code || typeof bundle.snapshot.code !== 'string' || !bundle.snapshot.code.trim()) {
      missingFields.push('snapshot.code');
    }
    if (bundle.snapshot.seed === undefined || bundle.snapshot.seed === null) {
      missingFields.push('snapshot.seed');
    }
    if (!bundle.snapshot.vars || !Array.isArray(bundle.snapshot.vars) || bundle.snapshot.vars.length !== 10) {
      missingFields.push('snapshot.vars (array of 10)');
    }
  }

  // Determine mode
  const isLoop = bundle.snapshot?.execution?.loop === true || 
                 (bundle.snapshot?.execution?.frames && bundle.snapshot.execution.frames > 1);
  const mode: 'static' | 'loop' | 'unknown' = bundle.snapshot ? (isLoop ? 'loop' : 'static') : 'unknown';

  // Check hashes based on mode
  if (mode === 'loop') {
    if (!bundle.expectedImageHash && !bundle.expectedPosterHash) {
      missingFields.push('expectedImageHash or expectedPosterHash (poster hash for loop mode)');
    }
    if (!bundle.expectedAnimationHash) {
      missingFields.push('expectedAnimationHash (required for loop mode)');
    }
  } else if (mode === 'static') {
    if (!bundle.expectedImageHash) {
      missingFields.push('expectedImageHash');
    }
  }

  // Warnings
  if (bundle._tampered) {
    warnings.push('This bundle is marked as tampered — check is expected to fail');
  }
  if (bundle._note) {
    warnings.push('This is an example bundle — hashes may not be valid');
  }

  return {
    isValid: missingFields.length === 0,
    isEmpty: false,
    parseError: null,
    missingFields,
    mode,
    warnings,
  };
}

export function BundleValidator({ bundleJson, onLoadExample }: BundleValidatorProps) {
  const validation = useMemo(() => validateBundle(bundleJson), [bundleJson]);

  // Empty state
  if (validation.isEmpty) {
    return (
      <div className="p-4 rounded-md border border-muted bg-muted/30">
        <div className="flex items-start gap-3">
          <HelpCircle className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              <strong>What do I paste here?</strong>
            </p>
            <p className="text-sm text-muted-foreground">
              Paste the entire exported bundle JSON from Sealed Results, or use the <strong>Create Result</strong> buttons above to create a valid bundle.
            </p>
            <Button variant="outline" size="sm" onClick={onLoadExample} className="mt-2">
              <FileText className="w-4 h-4 mr-2" />
              Load Example Bundle
            </Button>
            <p className="text-xs text-muted-foreground italic mt-1">
              Example bundles have placeholder hashes — checking will fail until you create a real result.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Parse error
  if (validation.parseError) {
    return (
      <div className="p-4 rounded-md border border-destructive/30 bg-destructive/5">
        <div className="flex items-start gap-3">
          <XCircle className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-destructive">Invalid JSON</p>
            <p className="text-sm text-muted-foreground mt-1 font-mono">
              {validation.parseError}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Missing fields
  if (validation.missingFields.length > 0) {
    return (
      <div className="p-4 rounded-md border border-warning/30 bg-warning/5">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-warning mt-0.5 flex-shrink-0" />
          <div className="space-y-2">
            <p className="text-sm font-medium text-warning">
              Bundle is missing required fields
            </p>
            <ul className="text-sm text-muted-foreground space-y-1">
              {validation.missingFields.map((field) => (
                <li key={field} className="flex items-center gap-2">
                  <XCircle className="w-3 h-3 text-destructive" />
                  <code className="font-mono text-xs">{field}</code>
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground mt-2">
              Use the <strong>Create Result</strong> buttons above to create a complete bundle.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Valid with warnings
  if (validation.warnings.length > 0) {
    return (
      <div className="p-4 rounded-md border border-verified/30 bg-verified/5">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-verified mt-0.5 flex-shrink-0" />
          <div className="space-y-2">
            <p className="text-sm font-medium text-verified">
              Bundle is valid ({validation.mode} mode)
            </p>
            {validation.warnings.map((warning, i) => (
              <p key={i} className="text-xs text-warning flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {warning}
              </p>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Fully valid
  return (
    <div className="p-3 rounded-md border border-verified/30 bg-verified/5">
      <div className="flex items-center gap-2">
        <CheckCircle2 className="w-4 h-4 text-verified" />
        <p className="text-sm text-verified">
          Bundle is valid ({validation.mode} mode) — ready to check
        </p>
      </div>
    </div>
  );
}
