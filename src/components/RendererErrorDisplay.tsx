import { AlertTriangle, ExternalLink, Info, XCircle } from "lucide-react";
import { getCanonicalUrl } from "@/certified/canonicalClient";

interface RendererErrorDisplayProps {
  error: string;
  httpStatus?: number;
}

interface ErrorInfo {
  title: string;
  code: string | null;
  message: string;
  howToFix: string[];
  docsLink?: string;
}

function parseRendererError(error: string): ErrorInfo {
  // Try to extract error code from common patterns
  const codeMatch = error.match(/\b(INVALID_CODE|INVALID_REQUEST|LOOP_MODE_ERROR|RENDER_FAILED|TIMEOUT|UNREACHABLE)\b/i);
  const code = codeMatch ? codeMatch[1].toUpperCase() : null;

  // Check for specific error patterns
  if (error.includes('INVALID_CODE') || error.toLowerCase().includes('code')) {
    return {
      title: "Invalid Code",
      code: "INVALID_CODE",
      message: error,
      howToFix: [
        "Bundle must include snapshot.code as a non-empty string",
        "Ensure the code contains valid setup() and draw() functions",
        "Check for syntax errors in the Code Mode program",
      ],
    };
  }

  if (error.includes('INVALID_REQUEST') || error.includes('missing')) {
    return {
      title: "Invalid Request",
      code: "INVALID_REQUEST",
      message: error,
      howToFix: [
        "Bundle must include a complete snapshot object",
        "Required: snapshot.code, snapshot.seed, snapshot.vars",
        "Include expectedImageHash (static) or expectedImageHash + expectedAnimationHash (loop)",
      ],
    };
  }

  if (error.includes('LOOP_MODE') || error.includes('frames') || error.includes('animation')) {
    return {
      title: "Loop Mode Error",
      code: "LOOP_MODE_ERROR",
      message: error,
      howToFix: [
        "Loop mode requires execution.frames >= 2",
        "Include a draw() function that handles animation",
        "Both expectedImageHash (poster) and expectedAnimationHash are required",
      ],
    };
  }

  if (error.includes('timeout') || error.includes('TIMEOUT')) {
    return {
      title: "Render Timeout",
      code: "TIMEOUT",
      message: error,
      howToFix: [
        "The render took too long to complete",
        "Simplify the Code Mode program",
        "Reduce the number of frames for loop mode",
      ],
    };
  }

  if (error.includes('fetch') || error.includes('network') || error.includes('Failed to connect') || error.includes('UNREACHABLE')) {
    return {
      title: "Renderer Unreachable",
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
    title: "Verification Request Rejected",
    code,
    message: error,
    howToFix: [
      "Check that the bundle JSON is properly formatted",
      "Ensure all required fields are present",
      "Try generating a fresh bundle using the buttons above",
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
          {(httpStatus || errorInfo.code) && (
            <div className="flex items-center gap-2 mt-1">
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

      {/* Error message */}
      <div className="p-3 rounded bg-card border border-border">
        <p className="text-sm text-muted-foreground font-mono break-all">
          {errorInfo.message}
        </p>
      </div>

      {/* How to fix */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <Info className="w-4 h-4 text-primary" />
          How to fix
        </h4>
        <ul className="text-sm text-muted-foreground space-y-1 ml-6">
          {errorInfo.howToFix.map((fix, i) => (
            <li key={i} className="list-disc">{fix}</li>
          ))}
        </ul>
      </div>

      {/* Renderer info */}
      <div className="pt-3 border-t border-border text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <span>Renderer:</span>
          <code className="font-mono">{rendererUrl}</code>
        </div>
      </div>
    </div>
  );
}
