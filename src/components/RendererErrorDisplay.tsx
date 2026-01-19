import { AlertTriangle, Info, XCircle } from "lucide-react";
import { getCanonicalUrl } from "@/certified/canonicalClient";

interface RendererErrorDisplayProps {
  error: string;
  httpStatus?: number;
}

interface ErrorInfo {
  title: string;
  subtitle: string;
  code: string | null;
  message: string;
  howToFix: string[];
}

function parseRendererError(error: string): ErrorInfo {
  // Try to extract error code from common patterns
  const codeMatch = error.match(/\b(INVALID_CODE|INVALID_REQUEST|LOOP_MODE_ERROR|RENDER_FAILED|TIMEOUT|UNREACHABLE)\b/i);
  const code = codeMatch ? codeMatch[1].toUpperCase() : null;

  // Check for specific error patterns
  if (error.includes('INVALID_CODE') || error.toLowerCase().includes('code')) {
    return {
      title: "Sealed Execution Blocked",
      subtitle: "This request violates execution rules.",
      code: "INVALID_CODE",
      message: error,
      howToFix: [
        "Ensure the Result includes execution code (snapshot.code)",
        "Code must contain valid setup() and draw() functions",
        "Or create a Result using the buttons in Start Here",
      ],
    };
  }

  if (error.includes('INVALID_REQUEST') || error.includes('missing')) {
    return {
      title: "Sealed Execution Blocked",
      subtitle: "Required fields are missing.",
      code: "INVALID_REQUEST",
      message: error,
      howToFix: [
        "Bundle must include a complete snapshot object",
        "Required: snapshot.code, snapshot.seed, snapshot.vars",
        "Include expectedImageHash (static) or both expectedImageHash + expectedAnimationHash (loop)",
      ],
    };
  }

  if (error.includes('LOOP_MODE') || error.includes('frames') || error.includes('animation')) {
    return {
      title: "Loop Mode Blocked",
      subtitle: "Animation requirements not met.",
      code: "LOOP_MODE_ERROR",
      message: error,
      howToFix: [
        "Loop mode requires execution.frames >= 2",
        "Include a draw() function that handles animation",
        "Both poster and animation hashes are required for loop mode",
      ],
    };
  }

  if (error.includes('timeout') || error.includes('TIMEOUT')) {
    return {
      title: "Execution Timeout",
      subtitle: "The render took too long to complete.",
      code: "TIMEOUT",
      message: error,
      howToFix: [
        "Simplify the execution code",
        "Reduce the number of frames for loop mode",
        "Check for infinite loops in your code",
      ],
    };
  }

  if (error.includes('fetch') || error.includes('network') || error.includes('Failed to connect') || error.includes('UNREACHABLE')) {
    return {
      title: "Renderer Unreachable",
      subtitle: "Cannot connect to the Canonical Renderer.",
      code: "UNREACHABLE",
      message: error,
      howToFix: [
        "Check your network connection",
        "The Canonical Renderer may be temporarily unavailable",
        "Try again in a few moments",
      ],
    };
  }

  // Generic error
  return {
    title: "Sealed Execution Blocked",
    subtitle: "This request was rejected.",
    code,
    message: error,
    howToFix: [
      "Check that the bundle JSON is properly formatted",
      "Ensure all required fields are present",
      "Try creating a fresh bundle using Start Here",
    ],
  };
}

export function RendererErrorDisplay({ error, httpStatus }: RendererErrorDisplayProps) {
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
          <Info className="w-4 h-4 text-primary" />
          Fix
        </h4>
        <ul className="text-sm text-muted-foreground space-y-1 ml-6">
          {errorInfo.howToFix.map((fix, i) => (
            <li key={i} className="list-disc">{fix}</li>
          ))}
        </ul>
      </div>

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
