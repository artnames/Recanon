import { useState, useEffect, useCallback } from "react";
import { Circle, RefreshCw, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { checkCanonicalHealth } from "@/certified/canonicalClient";
import { Button } from "./ui/button";

interface HealthState {
  status: 'checking' | 'healthy' | 'unreachable';
  latency?: number;
  error?: string;
}

export function CanonicalHealthBadge({ onHealthChange }: { onHealthChange?: (healthy: boolean) => void }) {
  const [health, setHealth] = useState<HealthState>({ status: 'checking' });

  const checkHealth = useCallback(async () => {
    setHealth({ status: 'checking' });
    
    const result = await checkCanonicalHealth();
    
    const newHealth: HealthState = {
      status: result.available ? 'healthy' : 'unreachable',
      latency: result.latency,
      error: result.error,
    };
    
    setHealth(newHealth);
    onHealthChange?.(result.available);
  }, [onHealthChange]);

  useEffect(() => {
    checkHealth();
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
        title="Refresh health check"
      >
        <RefreshCw className={cn(
          "w-3 h-3",
          health.status === 'checking' && "animate-spin"
        )} />
      </Button>
    </div>
  );
}

interface CanonicalRendererStatusProps {
  onUrlChange?: () => void;
}

export function CanonicalRendererStatus({ onUrlChange: _onUrlChange }: CanonicalRendererStatusProps) {
  const [isHealthy, setIsHealthy] = useState<boolean | null>(null);

  const handleHealthChange = (healthy: boolean) => {
    setIsHealthy(healthy);
  };

  return (
    <div className="p-4 rounded-md bg-card border border-border space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="w-4 h-4 text-verified" />
            <span className="text-xs text-muted-foreground">Canonical Renderer</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-verified/20 text-verified font-medium">
              PROTECTED
            </span>
          </div>
          <div className="flex items-center gap-2">
            <code className="font-mono text-xs bg-muted px-2 py-1 rounded">
              Protected Proxy
            </code>
            <span className="text-xs text-muted-foreground">(Renderer: hidden)</span>
          </div>
        </div>
      </div>
      
      <div className="flex items-center justify-between pt-2 border-t border-border">
        <span className="text-xs text-muted-foreground">Status:</span>
        <CanonicalHealthBadge onHealthChange={handleHealthChange} />
      </div>

      {/* Info hint */}
      {isHealthy === true && (
        <div className="flex items-start gap-2 p-2 rounded bg-verified/10 border border-verified/20">
          <ShieldCheck className="w-4 h-4 text-verified mt-0.5 flex-shrink-0" />
          <p className="text-xs text-verified">
            Renderer URL is protected. All requests go through the secure proxy.
          </p>
        </div>
      )}
    </div>
  );
}
