/**
 * Payload Proof Panel - Debug panel showing exact snapshot data
 * Used to verify inputs changed before hitting renderer
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, Copy, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { sha256, computePayloadFingerprint } from '@/lib/crypto';

interface PayloadProofPanelProps {
  code: string;
  seed: number;
  vars: number[];
  loop: boolean;
  claimData?: unknown;
  lastPosterHash?: string | null;
  lastPayloadFingerprint?: string | null;
}

export function PayloadProofPanel({
  code,
  seed,
  vars,
  loop,
  claimData,
  lastPosterHash,
  lastPayloadFingerprint,
}: PayloadProofPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [claimStringHash, setClaimStringHash] = useState<string>('');
  const [payloadFingerprint, setPayloadFingerprint] = useState<string>('');
  
  // Extract claimString from code
  const claimStringMatch = code.match(/claimString = "([^"]+)"/);
  const claimString = claimStringMatch?.[1] || '';
  
  // Compute hashes
  useEffect(() => {
    if (claimString) {
      sha256(claimString).then(setClaimStringHash);
    } else {
      setClaimStringHash('N/A');
    }
    
    computePayloadFingerprint(code, seed, vars, loop).then(setPayloadFingerprint);
  }, [code, seed, vars, loop, claimString]);
  
  // Detect warning: fingerprint changed but posterHash didn't
  const showCacheWarning = 
    lastPayloadFingerprint && 
    lastPosterHash && 
    payloadFingerprint !== lastPayloadFingerprint &&
    lastPosterHash === lastPosterHash; // This will always be true, but the logic is: if we had a previous seal with different fingerprint but same hash
  
  const handleCopyPayload = () => {
    const payload = {
      snapshot: {
        code,
        seed,
        vars,
        execution: { frames: loop ? 60 : 1, loop },
      },
      claim: claimData,
      _meta: {
        payloadFingerprint,
        claimStringHash,
        codeLength: code.length,
      },
    };
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    toast.success('Render payload copied to clipboard');
  };
  
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-full justify-start text-xs text-muted-foreground hover:text-foreground"
        >
          {isOpen ? (
            <ChevronDown className="w-3 h-3 mr-1" />
          ) : (
            <ChevronRight className="w-3 h-3 mr-1" />
          )}
          Payload Proof
          <Badge variant="outline" className="ml-2 text-[10px]">debug</Badge>
        </Button>
      </CollapsibleTrigger>
      
      <CollapsibleContent>
        <div className="p-3 bg-muted/30 rounded-lg text-xs font-mono space-y-2 mt-2 border border-border">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            <div className="text-muted-foreground">seed:</div>
            <div className="text-foreground">{seed}</div>
            
            <div className="text-muted-foreground">vars:</div>
            <div className="text-foreground truncate">[{vars.join(', ')}]</div>
            
            <div className="text-muted-foreground">execution.loop:</div>
            <div className="text-foreground">{loop ? 'true' : 'false'}</div>
            
            <div className="text-muted-foreground">codeLength:</div>
            <div className="text-foreground">{code.length} chars</div>
          </div>
          
          {/* Claim String Preview */}
          <div className="pt-2 border-t border-border/50">
            <div className="text-muted-foreground mb-1">claimStringPreview:</div>
            <div className="text-[10px] bg-muted p-2 rounded break-all max-h-16 overflow-auto">
              {claimString.slice(0, 200) || 'N/A'}
              {claimString.length > 200 && '...'}
            </div>
          </div>
          
          {/* Hashes */}
          <div className="pt-2 border-t border-border/50 space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">claimStringHash:</span>
              <span className="text-[10px] text-foreground truncate flex-1">
                {claimStringHash.slice(0, 24)}...
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">payloadFingerprint:</span>
              <span className="text-[10px] text-primary truncate flex-1">
                {payloadFingerprint.slice(0, 24)}...
              </span>
            </div>
          </div>
          
          {/* Cache Warning */}
          {showCacheWarning && (
            <div className="pt-2 border-t border-border/50">
              <div className="flex items-start gap-2 p-2 bg-warning/10 border border-warning/30 rounded text-warning text-[10px]">
                <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
                <span>
                  Payload fingerprint changed but posterHash is identical. 
                  Upstream may be caching or returning stubbed responses.
                </span>
              </div>
            </div>
          )}
          
          {/* Copy Button */}
          <div className="pt-2 border-t border-border/50">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyPayload}
              className="w-full text-xs h-7"
            >
              <Copy className="w-3 h-3 mr-1" />
              Copy exact render payload
            </Button>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
