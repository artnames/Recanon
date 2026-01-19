import { useState, useEffect, useCallback } from "react";
import { Settings, Server, ShieldCheck, Info, Copy, Check, RefreshCw, Circle, Pencil, RotateCcw } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { cn } from "@/lib/utils";
import { 
  getCanonicalUrl, 
  setCanonicalUrl, 
  clearCanonicalUrl, 
  hasLocalOverride 
} from "@/certified/canonicalConfig";

const APP_VERSION = 'recanon-app v0.1.0';

interface HealthData {
  status: 'idle' | 'checking' | 'healthy' | 'unreachable';
  latency?: number;
  error?: string;
  metadata?: {
    nodeVersion?: string;
    sdkVersion?: string;
    protocolVersion?: string;
    canvasWidth?: number;
    canvasHeight?: number;
    timestamp?: string;
  };
}

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button variant="outline" size="sm" onClick={handleCopy}>
      {copied ? <Check className="w-3 h-3 mr-2" /> : <Copy className="w-3 h-3 mr-2" />}
      {label || 'Copy'}
    </Button>
  );
}

export function SettingsPage() {
  const [currentUrl, setCurrentUrl] = useState(getCanonicalUrl());
  const [isOverride, setIsOverride] = useState(hasLocalOverride());
  const [editUrl, setEditUrl] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [health, setHealth] = useState<HealthData>({ status: 'idle' });

  const refreshUrl = useCallback(() => {
    setCurrentUrl(getCanonicalUrl());
    setIsOverride(hasLocalOverride());
  }, []);

  const testConnection = useCallback(async () => {
    setHealth({ status: 'checking' });
    const url = getCanonicalUrl();
    const start = performance.now();

    try {
      const response = await fetch(`${url}/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      
      const latency = Math.round(performance.now() - start);

      if (response.ok) {
        const data = await response.json();
        setHealth({
          status: 'healthy',
          latency,
          metadata: {
            nodeVersion: data.nodeVersion,
            sdkVersion: data.sdkVersion,
            protocolVersion: data.protocolVersion,
            canvasWidth: data.canvasWidth,
            canvasHeight: data.canvasHeight,
            timestamp: data.timestamp,
          },
        });
      } else {
        setHealth({
          status: 'unreachable',
          error: `HTTP ${response.status}: ${response.statusText}`,
        });
      }
    } catch (error) {
      setHealth({
        status: 'unreachable',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }, []);

  useEffect(() => {
    testConnection();
  }, [testConnection]);

  const handleEdit = () => {
    setEditUrl(currentUrl);
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (editUrl.trim()) {
      setCanonicalUrl(editUrl.trim());
      refreshUrl();
      setDialogOpen(false);
      testConnection();
    }
  };

  const handleReset = () => {
    clearCanonicalUrl();
    refreshUrl();
    testConnection();
  };

  const getDebugInfo = () => {
    return JSON.stringify({
      appVersion: APP_VERSION,
      rendererUrl: currentUrl,
      isOverride,
      health: {
        status: health.status,
        latency: health.latency,
        error: health.error,
      },
      metadata: health.metadata,
      timestamp: new Date().toISOString(),
    }, null, 2);
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Settings
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Configuration and transparency.
        </p>
      </div>

      {/* Canonical Renderer */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Server className="w-4 h-4" />
            Canonical Renderer
          </CardTitle>
          <CardDescription>
            The authoritative server for all certified executions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* URL Display */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Active URL</label>
              {isOverride && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-warning/20 text-warning font-medium">
                  LOCAL OVERRIDE
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 font-mono text-xs bg-muted px-3 py-2 rounded truncate">
                {currentUrl}
              </code>
              <Button variant="outline" size="icon" onClick={handleEdit} title="Edit URL">
                <Pencil className="w-4 h-4" />
              </Button>
              {isOverride && (
                <Button variant="outline" size="icon" onClick={handleReset} title="Reset to default">
                  <RotateCcw className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Health Status */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Status</label>
              <Button variant="outline" size="sm" onClick={testConnection}>
                <RefreshCw className={cn("w-3 h-3 mr-2", health.status === 'checking' && "animate-spin")} />
                Test Connection
              </Button>
            </div>
            <div className="p-3 rounded-md bg-muted space-y-2">
              <div className="flex items-center gap-2">
                <Circle 
                  className={cn(
                    "w-3 h-3",
                    health.status === 'checking' && "text-muted-foreground animate-pulse",
                    health.status === 'healthy' && "text-verified fill-verified",
                    health.status === 'unreachable' && "text-destructive fill-destructive",
                    health.status === 'idle' && "text-muted-foreground"
                  )}
                />
                <span className={cn(
                  "text-sm font-medium",
                  health.status === 'healthy' && "text-verified",
                  health.status === 'unreachable' && "text-destructive",
                )}>
                  {health.status === 'idle' && 'Not tested'}
                  {health.status === 'checking' && 'Checking...'}
                  {health.status === 'healthy' && `Healthy${health.latency ? ` (${health.latency}ms)` : ''}`}
                  {health.status === 'unreachable' && 'Unreachable'}
                </span>
              </div>
              {health.error && (
                <p className="text-xs text-destructive">{health.error}</p>
              )}
            </div>
          </div>

          {/* Metadata */}
          {health.metadata && health.status === 'healthy' && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Renderer Metadata</label>
              <div className="grid grid-cols-2 gap-2 p-3 rounded-md bg-muted text-sm">
                <div className="text-muted-foreground">Node Version</div>
                <div className="font-mono">{health.metadata.nodeVersion || '-'}</div>
                <div className="text-muted-foreground">SDK Version</div>
                <div className="font-mono">{health.metadata.sdkVersion || '-'}</div>
                <div className="text-muted-foreground">Protocol Version</div>
                <div className="font-mono">{health.metadata.protocolVersion || '-'}</div>
                <div className="text-muted-foreground">Canvas Size</div>
                <div className="font-mono">
                  {health.metadata.canvasWidth && health.metadata.canvasHeight 
                    ? `${health.metadata.canvasWidth}×${health.metadata.canvasHeight}` 
                    : '-'}
                </div>
                <div className="text-muted-foreground">Timestamp</div>
                <div className="font-mono text-xs">
                  {health.metadata.timestamp 
                    ? new Date(health.metadata.timestamp).toLocaleString() 
                    : '-'}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Verification Policy */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="w-4 h-4" />
            Verification Policy
          </CardTitle>
          <CardDescription>
            Strict rules for deterministic verification.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm">
            <div className="p-3 rounded-md bg-muted space-y-3">
              <div className="flex items-start gap-2">
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-background">STATIC</span>
                <span>Single image hash required (SHA-256 of PNG bytes)</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-background">LOOP</span>
                <span>Both poster hash + animation hash required (PNG + MP4)</span>
              </div>
            </div>
            <div className="p-3 rounded-md border border-border space-y-2">
              <p><strong>No fallback:</strong> If the Canonical Renderer is unreachable, execution fails. No local mock.</p>
              <p><strong>No client-side verification:</strong> All hash comparisons happen on the authoritative server.</p>
              <p><strong>Any mismatch = FAILED:</strong> Even a single bit difference results in verification failure.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* App Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Info className="w-4 h-4" />
            App Info
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="text-muted-foreground">Version</div>
            <div className="font-mono">{APP_VERSION}</div>
          </div>
          <div className="pt-2">
            <CopyButton text={getDebugInfo()} label="Copy Debug Info" />
          </div>
        </CardContent>
      </Card>

      {/* Edit URL Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
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
    </div>
  );
}
