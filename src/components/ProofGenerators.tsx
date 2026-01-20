import { useState } from "react";
import { ShieldCheck, AlertTriangle, Loader2, Video, Image } from "lucide-react";
import { Button } from "./ui/button";
import { 
  renderCertified, 
  getCanonicalUrl,
  type CanonicalSnapshot 
} from "@/certified/canonicalClient";

interface ProofGeneratorsProps {
  onBundleGenerated: (bundleJson: string) => void;
}

// Deterministic static Code Mode program - simple geometric shapes
// NOTE: Canvas is provided by Canonical Renderer (1950x2400) - do NOT call createCanvas()
// Seed is provided via snapshot.seed - random() is seeded automatically
const STATIC_PROOF_CODE = `
// Deterministic Static Proof Program
// Canvas: 1950x2400 (provided by runtime)
// Seed is provided via snapshot.seed - random() is seeded automatically

function setup() {
  // Canvas is provided by the Canonical Renderer
  noLoop();
}

function draw() {
  background(20, 24, 30);
  
  // Draw grid of deterministic shapes
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
      
      if ((i + j) % 3 === 0) {
        ellipse(x, y, size, size);
      } else if ((i + j) % 3 === 1) {
        rectMode(CENTER);
        rect(x, y, size, size);
      } else {
        triangle(
          x, y - size/2,
          x - size/2, y + size/2,
          x + size/2, y + size/2
        );
      }
    }
  }
  
  fill(255);
  textSize(24);
  textFont('monospace');
  text('Sealed Execution', 20, height - 20);
}
`;

// Deterministic loop Code Mode program - animated shapes
// NOTE: Canvas is provided by Canonical Renderer (1950x2400) - do NOT call createCanvas()
// Seed is provided via snapshot.seed - random() is seeded automatically
const LOOP_PROOF_CODE = `
// Deterministic Loop Proof Program
// Canvas: 1950x2400 (provided by runtime)
// Seed is provided via snapshot.seed - random() is seeded automatically

function setup() {
  // Canvas is provided by the Canonical Renderer
  frameRate(30);
}

function draw() {
  background(20, 24, 30);
  
  const t = frameCount / 60; // Normalized time (0-1 over 60 frames)
  const cols = 6;
  const rows = 4;
  const cellW = width / cols;
  const cellH = height / rows;
  
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      const x = i * cellW + cellW / 2;
      const y = j * cellH + cellH / 2;
      
      const baseSize = map(VAR[0], 0, 100, 40, 120);
      const animOffset = sin(t * TWO_PI + i * 0.5 + j * 0.3) * 20;
      const size = baseSize + animOffset;
      
      const hue = map(VAR[1], 0, 100, 100, 220);
      const alpha = map(sin(t * TWO_PI * 2 + i + j), -1, 1, 100, 255);
      
      fill(hue, 180, 200, alpha);
      noStroke();
      
      push();
      translate(x, y);
      rotate(t * TWO_PI * 0.5 + random() * 0.1);
      
      if ((i + j) % 2 === 0) {
        ellipse(0, 0, size, size);
      } else {
        rectMode(CENTER);
        rect(0, 0, size * 0.8, size * 0.8);
      }
      pop();
    }
  }
  
  // Frame counter
  fill(255);
  textSize(24);
  textFont('monospace');
  text('FRAME: ' + frameCount + '/60', 20, height - 20);
  
  if (frameCount >= 60) {
    noLoop();
  }
}
`;

interface GeneratedBundle {
  mode: 'static' | 'loop';
  json: string;
  imageHash?: string;
  animationHash?: string;
}

export function ProofGenerators({ onBundleGenerated }: ProofGeneratorsProps) {
  const [isGenerating, setIsGenerating] = useState<'static' | 'loop' | 'failed' | null>(null);
  const [lastGeneratedBundle, setLastGeneratedBundle] = useState<GeneratedBundle | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generateStaticProof = async () => {
    setIsGenerating('static');
    setError(null);

    try {
      const snapshot: CanonicalSnapshot = {
        code: STATIC_PROOF_CODE,
        seed: 42,
        vars: [50, 55, 30, 20, 10, 15, 5, 25, 40, 60],
        execution: {
          frames: 1,
          loop: false,
        },
      };

      const result = await renderCertified(snapshot);

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Render failed');
      }

      const data = result.data;
      const artifactId = `SEALED-${data.imageHash.slice(0, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

      const bundle = {
        runtime: 'nexart-canonical-renderer',
        artifactId,
        snapshot,
        expectedImageHash: data.imageHash,
        verificationRequirements: 'static-single-hash' as const,
        canonical: {
          url: getCanonicalUrl(),
          rendererVersion: data.metadata.rendererVersion,
          protocolVersion: data.metadata.protocolVersion,
        },
        output: {
          mimeType: data.mime,
          base64: data.outputBase64,
        },
        metadata: data.metadata,
        createdAt: new Date().toISOString(),
      };

      const bundleJson = JSON.stringify(bundle, null, 2);
      
      setLastGeneratedBundle({
        mode: 'static',
        json: bundleJson,
        imageHash: result.data.imageHash,
      });
      
      onBundleGenerated(bundleJson);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }

    setIsGenerating(null);
  };

  const generateLoopProof = async () => {
    setIsGenerating('loop');
    setError(null);

    try {
      const snapshot: CanonicalSnapshot = {
        code: LOOP_PROOF_CODE,
        seed: 42,
        vars: [50, 55, 30, 20, 10, 15, 5, 25, 40, 60],
        execution: {
          frames: 60,
          loop: true,
        },
      };

      const result = await renderCertified(snapshot);

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Render failed');
      }

      const data = result.data;
      const artifactId = `SEALED-${data.imageHash.slice(0, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

      const bundle = {
        runtime: 'nexart-canonical-renderer',
        artifactId,
        snapshot,
        expectedImageHash: data.imageHash, // Poster hash
        expectedAnimationHash: data.animationHash,
        verificationRequirements: 'loop-requires-both-hashes' as const,
        canonical: {
          url: getCanonicalUrl(),
          rendererVersion: data.metadata.rendererVersion,
          protocolVersion: data.metadata.protocolVersion,
        },
        output: {
          mimeType: data.mime,
          posterBase64: data.outputBase64,
          animationBase64: data.animationBase64,
        },
        metadata: data.metadata,
        createdAt: new Date().toISOString(),
      };

      const bundleJson = JSON.stringify(bundle, null, 2);
      
      setLastGeneratedBundle({
        mode: 'loop',
        json: bundleJson,
        imageHash: result.data.imageHash,
        animationHash: result.data.animationHash,
      });
      
      onBundleGenerated(bundleJson);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }

    setIsGenerating(null);
  };

  const generateFailedProof = () => {
    if (!lastGeneratedBundle) {
      setError('Generate a valid proof first, then use this to create a tampered version.');
      return;
    }

    setIsGenerating('failed');
    setError(null);

    try {
      const bundle = JSON.parse(lastGeneratedBundle.json);
      
      // Tamper with the hash by flipping first character
      if (bundle.expectedImageHash) {
        const hash = bundle.expectedImageHash;
        const firstChar = hash.charAt(0);
        const newFirstChar = firstChar === 'a' ? 'b' : 'a';
        bundle.expectedImageHash = newFirstChar + hash.slice(1);
      }
      
      if (bundle.expectedAnimationHash) {
        const hash = bundle.expectedAnimationHash;
        const firstChar = hash.charAt(0);
        const newFirstChar = firstChar === 'a' ? 'b' : 'a';
        bundle.expectedAnimationHash = newFirstChar + hash.slice(1);
      }

      // Mark as tampered for clarity
      bundle._tampered = true;
      bundle._tamperedAt = new Date().toISOString();

      const bundleJson = JSON.stringify(bundle, null, 2);
      onBundleGenerated(bundleJson);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to tamper bundle');
    }

    setIsGenerating(null);
  };

  return (
    <div className="space-y-4">
      <h3 className="section-header">One-Click Proof Generators</h3>
      <p className="text-xs text-muted-foreground">
        Generate real certified bundles via the canonical renderer. No mocks, no browser SDK.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Static Proof */}
        <Button
          variant="outline"
          className="h-auto py-4 flex flex-col items-center gap-2 border-verified/30 hover:border-verified/50 hover:bg-verified/5"
          onClick={generateStaticProof}
          disabled={isGenerating !== null}
        >
          {isGenerating === 'static' ? (
            <Loader2 className="w-5 h-5 animate-spin text-verified" />
          ) : (
            <Image className="w-5 h-5 text-verified" />
          )}
          <span className="font-medium">Generate VERIFIED Static</span>
          <span className="text-xs text-muted-foreground">PNG • Single Hash</span>
        </Button>

        {/* Loop Proof */}
        <Button
          variant="outline"
          className="h-auto py-4 flex flex-col items-center gap-2 border-verified/30 hover:border-verified/50 hover:bg-verified/5"
          onClick={generateLoopProof}
          disabled={isGenerating !== null}
        >
          {isGenerating === 'loop' ? (
            <Loader2 className="w-5 h-5 animate-spin text-verified" />
          ) : (
            <Video className="w-5 h-5 text-verified" />
          )}
          <span className="font-medium">Generate VERIFIED Loop</span>
          <span className="text-xs text-muted-foreground">MP4 • Poster + Animation Hashes</span>
        </Button>

        {/* Failed Proof */}
        <Button
          variant="outline"
          className="h-auto py-4 flex flex-col items-center gap-2 border-destructive/30 hover:border-destructive/50 hover:bg-destructive/5"
          onClick={generateFailedProof}
          disabled={isGenerating !== null || !lastGeneratedBundle}
        >
          {isGenerating === 'failed' ? (
            <Loader2 className="w-5 h-5 animate-spin text-destructive" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-destructive" />
          )}
          <span className="font-medium">Generate FAILED Proof</span>
          <span className="text-xs text-muted-foreground">
            {lastGeneratedBundle ? 'Tampers last bundle' : 'Generate proof first'}
          </span>
        </Button>
      </div>

      {error && (
        <div className="p-3 rounded-md border border-destructive/30 bg-destructive/10 text-sm text-destructive">
          {error}
        </div>
      )}

      {lastGeneratedBundle && !error && (
        <div className="p-3 rounded-md border border-verified/30 bg-verified/5 text-sm">
          <div className="flex items-center gap-2 text-verified">
            <ShieldCheck className="w-4 h-4" />
            <span>Last generated: {lastGeneratedBundle.mode} proof</span>
          </div>
          {lastGeneratedBundle.imageHash && (
            <div className="mt-2 text-xs text-muted-foreground font-mono truncate">
              imageHash: {lastGeneratedBundle.imageHash}
            </div>
          )}
          {lastGeneratedBundle.animationHash && (
            <div className="text-xs text-muted-foreground font-mono truncate">
              animationHash: {lastGeneratedBundle.animationHash}
            </div>
          )}
        </div>
      )}
    </div>
  );
}