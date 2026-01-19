import { useState, useMemo } from "react";
import { Terminal, Copy, Check, ChevronDown } from "lucide-react";
import { Button } from "./ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./ui/collapsible";
import { cn } from "@/lib/utils";
import { getCanonicalUrl } from "@/certified/canonicalClient";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-6 w-6 absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
      onClick={handleCopy}
    >
      {copied ? (
        <Check className="w-3 h-3 text-verified" />
      ) : (
        <Copy className="w-3 h-3" />
      )}
    </Button>
  );
}

function CodeBlock({ code, language = 'bash' }: { code: string; language?: string }) {
  return (
    <div className="relative group">
      <pre className="p-3 rounded-md bg-muted/50 text-xs font-mono overflow-x-auto whitespace-pre-wrap break-all">
        <code>{code}</code>
      </pre>
      <CopyButton text={code} />
    </div>
  );
}

export function CLIExamples() {
  const [isOpen, setIsOpen] = useState(false);
  const canonicalUrl = useMemo(() => getCanonicalUrl(), []);

  const renderStaticCurl = `curl -X POST ${canonicalUrl}/render \\
  -H "Content-Type: application/json" \\
  -d '{
    "code": "function setup() { noLoop(); } function draw() { background(20); fill(100,200,150); ellipse(width/2,height/2,200,200); }",
    "seed": 42,
    "vars": [50,55,30,20,10,15,5,25,40,60],
    "execution": { "frames": 1, "loop": false }
  }'`;

  const verifyStaticCurl = `curl -X POST ${canonicalUrl}/verify \\
  -H "Content-Type: application/json" \\
  -d '{
    "code": "function setup() { noLoop(); } function draw() { background(20); fill(100,200,150); ellipse(width/2,height/2,200,200); }",
    "seed": 42,
    "vars": [50,55,30,20,10,15,5,25,40,60],
    "execution": { "frames": 1, "loop": false },
    "expectedHash": "sha256:YOUR_IMAGE_HASH_HERE"
  }'`;

  const renderLoopCurl = `curl -X POST ${canonicalUrl}/render \\
  -H "Content-Type: application/json" \\
  -d '{
    "code": "function setup() { frameRate(30); } function draw() { background(20); fill(100,200,150); ellipse(width/2+sin(frameCount*0.1)*100,height/2,100,100); if(frameCount>=60) noLoop(); }",
    "seed": 42,
    "vars": [50,55,30,20,10,15,5,25,40,60],
    "execution": { "frames": 60, "loop": true }
  }'`;

  const verifyLoopCurl = `curl -X POST ${canonicalUrl}/verify \\
  -H "Content-Type: application/json" \\
  -d '{
    "code": "function setup() { frameRate(30); } function draw() { background(20); fill(100,200,150); ellipse(width/2+sin(frameCount*0.1)*100,height/2,100,100); if(frameCount>=60) noLoop(); }",
    "seed": 42,
    "vars": [50,55,30,20,10,15,5,25,40,60],
    "execution": { "frames": 60, "loop": true },
    "expectedPosterHash": "sha256:YOUR_POSTER_HASH",
    "expectedAnimationHash": "sha256:YOUR_ANIMATION_HASH"
  }'`;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="w-full">
        <div className="flex items-center justify-between p-4 rounded-md border border-border bg-card hover:bg-accent/50 transition-colors">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-medium">CLI Examples (cURL)</h3>
          </div>
          <ChevronDown className={cn(
            "w-4 h-4 transition-transform",
            isOpen && "rotate-180"
          )} />
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-2 p-4 rounded-md border border-border bg-card space-y-6">
          <p className="text-xs text-muted-foreground">
            Using renderer at: <code className="font-mono bg-muted px-1 rounded">{canonicalUrl}</code>
          </p>

          {/* Render Static */}
          <div>
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
              <span className="px-2 py-0.5 text-xs rounded bg-primary/20 text-primary font-mono">POST</span>
              Render Static
            </h4>
            <CodeBlock code={renderStaticCurl} />
          </div>

          {/* Verify Static */}
          <div>
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
              <span className="px-2 py-0.5 text-xs rounded bg-primary/20 text-primary font-mono">POST</span>
              Verify Static
            </h4>
            <CodeBlock code={verifyStaticCurl} />
          </div>

          {/* Render Loop */}
          <div>
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
              <span className="px-2 py-0.5 text-xs rounded bg-verified/20 text-verified font-mono">POST</span>
              Render Loop (60 frames)
            </h4>
            <CodeBlock code={renderLoopCurl} />
          </div>

          {/* Verify Loop */}
          <div>
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
              <span className="px-2 py-0.5 text-xs rounded bg-verified/20 text-verified font-mono">POST</span>
              Verify Loop
            </h4>
            <p className="text-xs text-muted-foreground mb-2">
              Loop verification requires <strong>both</strong> posterHash and animationHash.
            </p>
            <CodeBlock code={verifyLoopCurl} />
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}