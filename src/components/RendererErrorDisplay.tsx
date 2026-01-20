import { AlertTriangle, Info, XCircle, Lightbulb, ArrowRight } from "lucide-react";
import { getCanonicalUrl } from "@/certified/canonicalClient";
import { Button } from "./ui/button";

interface RendererErrorDisplayProps {
  error: string;
  httpStatus?: number;
  onLoadExample?: () => void;
}

interface ErrorInfo {
  title: string;
  subtitle: string;
  code: string | null;
  message: string;
  howToFix: string[];
  showLoadExample?: boolean;
}

function parseRendererError(error: string): ErrorInfo {
  // Try to extract error code from common patterns
  const codeMatch = error.match(/\b(INVALID_CODE|INVALID_REQUEST|LOOP_MODE_ERROR|RENDER_FAILED|TIMEOUT|UNREACHABLE|PROTOCOL_VIOLATION)\b/i);
  const code = codeMatch ? codeMatch[1].toUpperCase() : null;

  // Check for createCanvas violation
  if (error.toLowerCase().includes('createcanvas') || error.includes('PROTOCOL_VIOLATION')) {
    return {
      title: "Protocol Violation",
      subtitle: "Canvas is provided by the canonical runtime.",
      code: "PROTOCOL_VIOLATION",
      message: error,
      howToFix: [
        "Canvas is already provided (1950×2400). Remove createCanvas() from your code.",
        "Use a preset template which handles canvas correctly.",
        "Or click 'Load Example' below to start with working code.",
      ],
      showLoadExample: true,
    };
  }

  // Check for empty/missing code
  if (error.includes('INVALID_CODE') || error.toLowerCase().includes('missing') && error.toLowerCase().includes('code')) {
    return {
      title: "Snapshot Code Missing",
      subtitle: "Your snapshot code is empty or missing.",
      code: "INVALID_CODE",
      message: error,
      howToFix: [
        "Ensure the bundle includes snapshot.code with valid setup() and draw() functions.",
        "Use a preset (Sports, P&L, Generic) which auto-generates valid code.",
        "Or click 'Load Example' to start with pre-filled data.",
      ],
      showLoadExample: true,
    };
  }

  // Check for invalid request / missing fields
  if (error.includes('INVALID_REQUEST') || error.includes('missing')) {
    return {
      title: "Invalid Request",
      subtitle: "Required fields are missing from the bundle.",
      code: "INVALID_REQUEST",
      message: error,
      howToFix: [
        "Bundle must include a complete snapshot object.",
        "Required: snapshot.code, snapshot.seed, snapshot.vars",
        "For verification: include expectedImageHash (static) or both hashes (loop).",
      ],
    };
  }

  // Loop mode errors
  if (error.includes('LOOP_MODE') || error.includes('frames') || error.includes('animation')) {
    return {
      title: "Loop Mode Error",
      subtitle: "Animation requirements not met.",
      code: "LOOP_MODE_ERROR",
      message: error,
      howToFix: [
        "Loop mode requires execution.frames >= 2 (typically 60).",
        "Your draw() function must handle animation (use frameCount).",
        "Both posterHash and animationHash are required for loop verification.",
      ],
    };
  }

  // Timeout
  if (error.includes('timeout') || error.includes('TIMEOUT')) {
    return {
      title: "Execution Timeout",
      subtitle: "The render took too long to complete.",
      code: "TIMEOUT",
      message: error,
      howToFix: [
        "Simplify the execution code (reduce complexity).",
        "Reduce the number of frames for loop mode.",
        "Check for infinite loops in your code.",
      ],
    };
  }

  // Network / unreachable
  if (error.includes('fetch') || error.includes('network') || error.includes('Failed to connect') || error.includes('UNREACHABLE')) {
    return {
      title: "Renderer Unreachable",
      subtitle: "Cannot connect to the Canonical Renderer.",
      code: "UNREACHABLE",
      message: error,
      howToFix: [
        "Check your network connection.",
        "The Canonical Renderer may be temporarily unavailable.",
        "Try again in a few moments.",
      ],
    };
  }

  // 502 with upstream details
  if (error.includes('502') || error.includes('upstreamStatus') || error.includes('upstream')) {
    return {
      title: "Upstream Rejection",
      subtitle: "The canonical runtime rejected this execution.",
      code: "UPSTREAM_ERROR",
      message: error,
      howToFix: [
        "The canonical runtime rejected this execution. This is expected when rules are violated.",
        "Check that your code doesn't call createCanvas() or reference invalid globals.",
        "Use a preset template or load an example to ensure valid code.",
      ],
      showLoadExample: true,
    };
  }

  // Generic error
  return {
    title: "Sealed Execution Blocked",
    subtitle: "This request was rejected.",
    code,
    message: error,
    howToFix: [
      "Check that the bundle JSON is properly formatted.",
      "Ensure all required fields are present.",
      "Try loading an example from Claim Studio to start fresh.",
    ],
    showLoadExample: true,
  };
}

export function RendererErrorDisplay({ error, httpStatus, onLoadExample }: RendererErrorDisplayProps) {
  const errorInfo = parseRendererError(error);
  const rendererUrl = getCanonicalUrl();

  return (
    <div className="p-6 rounded-md border-2 border-destructive/40 bg-destructive/5 space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <XCircle className="w-8 h-8 text-destructive flex-shrink-0" />
        <div>
          <h3 className="text-lg font-semibold text-destructive">{errorInfo.title}</h3>
          <p className="text-sm text-muted-foreground mt-0.5">{errorInfo.subtitle}</p>
          {(httpStatus || errorInfo.code) && (
            <div className="flex items-center gap-2 mt-2">
              {httpStatus && (
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-destructive/20 text-destructive">
                  HTTP {httpStatus}
                </span>
              )}
              {errorInfo.code && (
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-destructive/20 text-destructive">
                  {errorInfo.code}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* How to fix */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-warning" />
          How to Fix
        </h4>
        <ul className="text-sm text-muted-foreground space-y-1 ml-6">
          {errorInfo.howToFix.map((fix, i) => (
            <li key={i} className="list-disc">{fix}</li>
          ))}
        </ul>
      </div>

      {/* Load Example Button */}
      {errorInfo.showLoadExample && onLoadExample && (
        <div className="pt-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onLoadExample}
            className="gap-2"
          >
            <ArrowRight className="w-4 h-4" />
            Go to Claim Studio with Example
          </Button>
        </div>
      )}

      {/* Technical details (collapsed) */}
      <details className="text-xs text-muted-foreground">
        <summary className="cursor-pointer hover:text-foreground">Technical details</summary>
        <div className="mt-2 p-3 rounded bg-card border border-border font-mono break-all">
          {errorInfo.message}
        </div>
        <div className="mt-2">
          Renderer: <code className="font-mono">{rendererUrl}</code>
        </div>
      </details>
    </div>
  );
}
