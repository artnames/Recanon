/**
 * Sealed Result Card - Shows status and actions after successful sealing
 */

import { 
  CheckCircle2, 
  Copy, 
  Download, 
  ExternalLink,
  Loader2,
  RotateCcw,
  AlertTriangle,
  Hash,
  Stamp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface SealedResultCardProps {
  posterHash: string;
  animationHash: string | null;
  isLoop: boolean;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  savedClaimId: string | null;
  saveError: string | null;
  onOpenInLibrary: () => void;
  onDownloadBundle: () => void;
  onCheckNow: () => void;
  onRetrySave?: () => void;
}

export function SealedResultCard({
  posterHash,
  animationHash,
  isLoop,
  saveStatus,
  savedClaimId,
  saveError,
  onOpenInLibrary,
  onDownloadBundle,
  onCheckNow,
  onRetrySave,
}: SealedResultCardProps) {
  const handleCopyHash = async (hash: string, label: string) => {
    try {
      await navigator.clipboard.writeText(hash);
      toast.success(`${label} copied`);
    } catch {
      toast.error('Failed to copy');
    }
  };

  return (
    <Card className="border-2 border-verified bg-verified/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-verified flex items-center justify-center">
            <Stamp className="w-5 h-5 text-verified-foreground" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-verified">SEALED</span>
              <CheckCircle2 className="w-5 h-5 text-verified" />
            </div>
            <p className="text-sm font-normal text-muted-foreground">
              Claim executed and hashed via Canonical Renderer
            </p>
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Poster Hash */}
        <div className="p-3 bg-card rounded-lg border border-border space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium flex items-center gap-2">
              <Hash className="w-4 h-4 text-muted-foreground" />
              Poster Hash
            </span>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => handleCopyHash(posterHash, 'Poster hash')}
              className="h-7 gap-1"
            >
              <Copy className="w-3.5 h-3.5" />
              Copy
            </Button>
          </div>
          <code className="text-xs font-mono block break-all text-muted-foreground bg-muted p-2 rounded">
            {posterHash}
          </code>
        </div>

        {/* Animation Hash (if loop) */}
        {isLoop && animationHash && (
          <div className="p-3 bg-card rounded-lg border border-border space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium flex items-center gap-2">
                <Hash className="w-4 h-4 text-muted-foreground" />
                Animation Hash
              </span>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => handleCopyHash(animationHash, 'Animation hash')}
                className="h-7 gap-1"
              >
                <Copy className="w-3.5 h-3.5" />
                Copy
              </Button>
            </div>
            <code className="text-xs font-mono block break-all text-muted-foreground bg-muted p-2 rounded">
              {animationHash}
            </code>
          </div>
        )}

        {/* Save Status */}
        <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
          {saveStatus === 'saving' && (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Saving to Library…</span>
            </>
          )}
          {saveStatus === 'saved' && (
            <>
              <CheckCircle2 className="w-4 h-4 text-verified" />
              <span className="text-sm text-verified font-medium">Saved to Library</span>
              {savedClaimId && (
                <Badge variant="secondary" className="ml-auto text-xs font-mono">
                  ID: {savedClaimId.slice(0, 8)}…
                </Badge>
              )}
            </>
          )}
          {saveStatus === 'error' && (
            <>
              <AlertTriangle className="w-4 h-4 text-destructive" />
              <span className="text-sm text-destructive">{saveError || 'Failed to save'}</span>
              {onRetrySave && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={onRetrySave}
                  className="ml-auto h-7 gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Retry
                </Button>
              )}
            </>
          )}
        </div>

        {/* Primary Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2">
          <Button 
            onClick={onOpenInLibrary} 
            className="gap-2"
            disabled={saveStatus !== 'saved'}
          >
            <ExternalLink className="w-4 h-4" />
            Open in Library
          </Button>
          <Button 
            variant="outline" 
            onClick={onDownloadBundle}
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            Download JSON
          </Button>
          <Button 
            variant="outline" 
            onClick={onCheckNow}
            className="gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Check Now
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Execution via proxy • Renderer hidden
        </p>
      </CardContent>
    </Card>
  );
}
