import { useState, useEffect, useCallback } from "react";
import { Circle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { CANONICAL_RENDERER_URL, isCanonicalRendererAvailable } from "@/certified/canonicalClient";
import { Button } from "./ui/button";

interface HealthState {
  status: 'checking' | 'healthy' | 'unreachable';
  latency?: number;
}

export function CanonicalHealthBadge() {
  const [health, setHealth] = useState<HealthState>({ status: 'checking' });

  const checkHealth = useCallback(async () => {
    setHealth({ status: 'checking' });
    const start = performance.now();
    
    const isAvailable = await isCanonicalRendererAvailable();
    const latency = Math.round(performance.now() - start);
    
    setHealth({
      status: isAvailable ? 'healthy' : 'unreachable',
      latency: isAvailable ? latency : undefined,
    });
  }, []);

  useEffect(() => {
    checkHealth();
    // Re-check every 30 seconds
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, [checkHealth]);

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1.5">
        <Circle 
          className={cn(
            "w-2.5 h-2.5",
            health.status === 'checking' && "text-muted-foreground animate-pulse",
            health.status === 'healthy' && "text-verified fill-verified",
            health.status === 'unreachable' && "text-destructive fill-destructive"
          )}
        />
        <span className={cn(
          "text-xs font-medium",
          health.status === 'healthy' && "text-verified",
          health.status === 'unreachable' && "text-destructive",
          health.status === 'checking' && "text-muted-foreground"
        )}>
          {health.status === 'checking' && 'Checking...'}
          {health.status === 'healthy' && `Healthy${health.latency ? ` (${health.latency}ms)` : ''}`}
          {health.status === 'unreachable' && 'Unreachable'}
        </span>
      </div>
      <Button 
        variant="ghost" 
        size="icon" 
        className="h-5 w-5"
        onClick={checkHealth}
      >
        <RefreshCw className={cn(
          "w-3 h-3",
          health.status === 'checking' && "animate-spin"
        )} />
      </Button>
    </div>
  );
}

export function CanonicalRendererStatus() {
  return (
    <div className="p-3 rounded-md bg-card border border-border">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs text-muted-foreground">Canonical Renderer</span>
          <code className="ml-2 font-mono text-xs bg-muted px-2 py-0.5 rounded">
            {CANONICAL_RENDERER_URL}
          </code>
        </div>
        <CanonicalHealthBadge />
      </div>
    </div>
  );
}