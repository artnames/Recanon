import { useState } from "react";
import { Image, Video, AlertTriangle, Loader2, Sparkles, Zap } from "lucide-react";
import { Button } from "./ui/button";
import { 
  renderCertified, 
  getCanonicalUrl,
  type CanonicalSnapshot 
} from "@/certified/canonicalClient";
import { toast } from "@/hooks/use-toast";

interface StartHereCardProps {
  onBundleGenerated: (bundleJson: string, type: 'static' | 'loop' | 'failed') => void;
}

// Deterministic static Code Mode program
const STATIC_PROOF_CODE = `
// Deterministic Static Proof Program
function setup() {
  createCanvas(800, 600);
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
      const size = map(VAR[0], 0, 100, 10, 40);
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
  textSize(12);
  textFont('monospace');
  text('SEED: ' + SEED, 10, height - 10);
}
`;

// Deterministic loop Code Mode program
const LOOP_PROOF_CODE = `
// Deterministic Loop Proof Program
function setup() {
  createCanvas(800, 600);
  frameRate(30);
}

function draw() {
  background(20, 24, 30);
  randomSeed(SEED);
  
  const t = frameCount / 60;
  const cols = 6;
  const rows = 4;
  const cellW = width / cols;
  const cellH = height / rows;
  
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      const x = i * cellW + cellW / 2;
      const y = j * cellH + cellH / 2;
      
      const baseSize = map(VAR[0], 0, 100, 20, 60);
      const animOffset = sin(t * TWO_PI + i * 0.5 + j * 0.3) * 10;
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
  
  fill(255);
  textSize(12);
  textFont('monospace');
  text('FRAME: ' + frameCount + '/60  SEED: ' + SEED, 10, height - 10);
  
  if (frameCount >= 60) {
    noLoop();
  }
}
`;

interface LastBundle {
  type: 'static' | 'loop';
  json: string;
}

export function StartHereCard({ onBundleGenerated }: StartHereCardProps) {
  const [isGenerating, setIsGenerating] = useState<'static' | 'loop' | 'failed' | null>(null);
  const [lastBundle, setLastBundle] = useState<LastBundle | null>(null);

  const generateStaticProof = async () => {
    setIsGenerating('static');

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

      const bundle = {
        runtime: 'nexart-canonical-renderer',
        artifactId: result.data.artifactId,
        snapshot,
        expectedImageHash: result.data.imageHash,
        verificationRequirements: 'static-single-hash' as const,
        canonical: {
          url: getCanonicalUrl(),
          rendererVersion: result.data.metadata.rendererVersion,
          protocolVersion: result.data.metadata.protocolVersion,
        },
        output: {
          mimeType: result.data.mimeType,
          base64: result.data.outputBase64,
        },
        metadata: result.data.metadata,
        createdAt: new Date().toISOString(),
      };

      const bundleJson = JSON.stringify(bundle, null, 2);
      setLastBundle({ type: 'static', json: bundleJson });
      onBundleGenerated(bundleJson, 'static');
      
      toast({
        title: "Static bundle generated",
        description: "Click 'Verify Bundle' to test verification.",
      });
    } catch (err) {
      toast({
        title: "Generation failed",
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: "destructive",
      });
    }

    setIsGenerating(null);
  };

  const generateLoopProof = async () => {
    setIsGenerating('loop');

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

      const bundle = {
        runtime: 'nexart-canonical-renderer',
        artifactId: result.data.artifactId,
        snapshot,
        expectedImageHash: result.data.imageHash,
        expectedAnimationHash: result.data.animationHash,
        verificationRequirements: 'loop-requires-both-hashes' as const,
        canonical: {
          url: getCanonicalUrl(),
          rendererVersion: result.data.metadata.rendererVersion,
          protocolVersion: result.data.metadata.protocolVersion,
        },
        output: {
          mimeType: result.data.mimeType,
          posterBase64: result.data.outputBase64,
          animationBase64: result.data.animationBase64,
        },
        metadata: result.data.metadata,
        createdAt: new Date().toISOString(),
      };

      const bundleJson = JSON.stringify(bundle, null, 2);
      setLastBundle({ type: 'loop', json: bundleJson });
      onBundleGenerated(bundleJson, 'loop');
      
      toast({
        title: "Loop bundle generated",
        description: "Click 'Verify Bundle' to test verification with both hashes.",
      });
    } catch (err) {
      toast({
        title: "Generation failed",
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: "destructive",
      });
    }

    setIsGenerating(null);
  };

  const generateFailedProof = () => {
    if (!lastBundle) {
      toast({
        title: "No bundle to tamper",
        description: "Generate a verified bundle first.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating('failed');

    try {
      const bundle = JSON.parse(lastBundle.json);
      
      // Tamper with hash by flipping first character
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

      bundle._tampered = true;
      bundle._tamperedAt = new Date().toISOString();

      const bundleJson = JSON.stringify(bundle, null, 2);
      onBundleGenerated(bundleJson, 'failed');
      
      toast({
        title: "Tampered bundle generated",
        description: "This bundle is expected to FAIL verification.",
        variant: "destructive",
      });
    } catch (err) {
      toast({
        title: "Tamper failed",
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: "destructive",
      });
    }

    setIsGenerating(null);
  };

  return (
    <div className="p-6 rounded-lg border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold">Start Here</h3>
      </div>
      
      <p className="text-sm text-muted-foreground mb-6">
        Generate a real certified bundle from the Canonical Renderer, then verify it. No setup required.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Generate Verified Static */}
        <Button
          variant="outline"
          className="h-auto py-5 flex flex-col items-center gap-3 border-verified/40 hover:border-verified hover:bg-verified/10 transition-all"
          onClick={generateStaticProof}
          disabled={isGenerating !== null}
        >
          {isGenerating === 'static' ? (
            <Loader2 className="w-6 h-6 animate-spin text-verified" />
          ) : (
            <Image className="w-6 h-6 text-verified" />
          )}
          <div className="text-center">
            <div className="font-semibold">Generate Verified</div>
            <div className="font-semibold text-verified">(Static)</div>
          </div>
          <div className="text-xs text-muted-foreground">
            PNG • Single Hash
          </div>
        </Button>

        {/* Generate Verified Loop */}
        <Button
          variant="outline"
          className="h-auto py-5 flex flex-col items-center gap-3 border-verified/40 hover:border-verified hover:bg-verified/10 transition-all"
          onClick={generateLoopProof}
          disabled={isGenerating !== null}
        >
          {isGenerating === 'loop' ? (
            <Loader2 className="w-6 h-6 animate-spin text-verified" />
          ) : (
            <Video className="w-6 h-6 text-verified" />
          )}
          <div className="text-center">
            <div className="font-semibold">Generate Verified</div>
            <div className="font-semibold text-verified">(Loop)</div>
          </div>
          <div className="text-xs text-muted-foreground">
            MP4 • Poster + Animation
          </div>
        </Button>

        {/* Generate Failed */}
        <Button
          variant="outline"
          className="h-auto py-5 flex flex-col items-center gap-3 border-destructive/40 hover:border-destructive hover:bg-destructive/10 transition-all"
          onClick={generateFailedProof}
          disabled={isGenerating !== null || !lastBundle}
        >
          {isGenerating === 'failed' ? (
            <Loader2 className="w-6 h-6 animate-spin text-destructive" />
          ) : (
            <AlertTriangle className="w-6 h-6 text-destructive" />
          )}
          <div className="text-center">
            <div className="font-semibold">Generate Failed</div>
            <div className="font-semibold text-destructive">(Tampered)</div>
          </div>
          <div className="text-xs text-muted-foreground">
            {lastBundle ? 'Flips hash to cause failure' : 'Generate proof first'}
          </div>
        </Button>
      </div>

      {isGenerating && (
        <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Rendering via Canonical Renderer...</span>
        </div>
      )}
    </div>
  );
}
