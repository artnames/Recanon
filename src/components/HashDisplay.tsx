import { Copy, Check } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface HashDisplayProps {
  hash: string;
  label?: string;
  truncate?: boolean;
  className?: string;
}

export function HashDisplay({ hash, label, truncate = true, className }: HashDisplayProps) {
  const [copied, setCopied] = useState(false);

  const displayHash = truncate 
    ? `${hash.slice(0, 8)}...${hash.slice(-8)}`
    : hash;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {label && (
        <span className="text-xs text-muted-foreground uppercase tracking-wider">
          {label}
        </span>
      )}
      <code className="hash-display">{displayHash}</code>
      <button
        onClick={handleCopy}
        className="p-1 hover:bg-accent rounded transition-colors"
        title="Copy hash"
      >
        {copied ? (
          <Check className="w-3.5 h-3.5 text-verified" />
        ) : (
          <Copy className="w-3.5 h-3.5 text-muted-foreground" />
        )}
      </button>
    </div>
  );
}
