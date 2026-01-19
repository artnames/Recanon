import { useState, useEffect, useCallback } from "react";
import { Circle, RefreshCw, Pencil, RotateCcw, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  getCanonicalUrl, 
  setCanonicalUrl, 
  clearCanonicalUrl, 
  hasLocalOverride,
  checkCanonicalHealth 
} from "@/certified/canonicalClient";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";

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

export function CanonicalRendererStatus({ onUrlChange }: CanonicalRendererStatusProps) {
  const [currentUrl, setCurrentUrl] = useState(getCanonicalUrl());
  const [editUrl, setEditUrl] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isOverride, setIsOverride] = useState(hasLocalOverride());
  const [isHealthy, setIsHealthy] = useState<boolean | null>(null);

  const refreshUrl = useCallback(() => {
    setCurrentUrl(getCanonicalUrl());
    setIsOverride(hasLocalOverride());
  }, []);

  const handleEdit = () => {
    setEditUrl(currentUrl);
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (editUrl.trim()) {
      setCanonicalUrl(editUrl.trim());
      refreshUrl();
      setDialogOpen(false);
      onUrlChange?.();
    }
  };

  const handleReset = () => {
    clearCanonicalUrl();
    refreshUrl();
    onUrlChange?.();
  };

  const handleHealthChange = (healthy: boolean) => {
    setIsHealthy(healthy);
  };

  return (
    <div className="p-4 rounded-md bg-card border border-border space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-muted-foreground">Canonical Renderer</span>
            {isOverride && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-warning/20 text-warning font-medium">
                LOCAL OVERRIDE
              </span>
            )}
          </div>
          <code className="font-mono text-xs bg-muted px-2 py-1 rounded block truncate">
            {currentUrl}
          </code>
        </div>
        <div className="flex items-center gap-1 ml-3">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7"
                onClick={handleEdit}
                title="Edit renderer URL"
              >
                <Pencil className="w-3.5 h-3.5" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Canonical Renderer URL</DialogTitle>
                <DialogDescription>
                  Set a custom URL for the canonical renderer. This is stored in localStorage.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <Input
                  value={editUrl}
                  onChange={(e) => setEditUrl(e.target.value)}
                  placeholder="https://your-renderer.example.com"
                  className="font-mono text-sm"
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave}>
                  Save & Reconnect
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          {isOverride && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7"
              onClick={handleReset}
              title="Reset to default URL"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>
      
      <div className="flex items-center justify-between pt-2 border-t border-border">
        <span className="text-xs text-muted-foreground">Status:</span>
        <CanonicalHealthBadge onHealthChange={handleHealthChange} />
      </div>

      {/* Diagnostic hint when unreachable */}
      {isHealthy === false && (
        <div className="flex items-start gap-2 p-2 rounded bg-destructive/10 border border-destructive/20">
          <AlertCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
          <p className="text-xs text-destructive">
            If you're in hosted preview, <code className="font-mono">localhost</code> won't work. 
            Use a public HTTPS URL.
          </p>
        </div>
      )}
    </div>
  );
}