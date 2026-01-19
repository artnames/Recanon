import { useState } from 'react';
import { Download, Copy, Terminal, ChevronDown, AlertTriangle, Check } from 'lucide-react';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import type { CertifiedArtifactBundle } from '@/types/certifiedArtifact';
import { downloadBundle, serializeBundle } from '@/types/certifiedArtifact';
import { toast } from '@/hooks/use-toast';

interface ArtifactExportMenuProps {
  bundle: CertifiedArtifactBundle | null;
  artifactId: string;
  disabled?: boolean;
  variant?: 'default' | 'compact';
}

export function ArtifactExportMenu({ 
  bundle, 
  artifactId,
  disabled = false, 
  variant = 'default' 
}: ArtifactExportMenuProps) {
  const [copied, setCopied] = useState<'hash' | 'command' | null>(null);

  const handleDownloadBundle = () => {
    if (!bundle) return;
    downloadBundle(bundle, artifactId);
    toast({
      title: 'Bundle Downloaded',
      description: `${artifactId}-certified-bundle.json saved`,
    });
  };

  const handleCopyHash = async () => {
    if (!bundle) return;
    await navigator.clipboard.writeText(bundle.expectedImageHash);
    setCopied('hash');
    setTimeout(() => setCopied(null), 2000);
    toast({
      title: 'Hash Copied',
      description: 'Image hash copied to clipboard',
    });
  };

  const handleCopyCommand = async () => {
    if (!bundle) return;
    const command = `curl -X POST ${bundle.canonicalUrl}/verify -H "Content-Type: application/json" -d '${serializeBundle(bundle)}'`;
    await navigator.clipboard.writeText(command);
    setCopied('command');
    setTimeout(() => setCopied(null), 2000);
    toast({
      title: 'Command Copied',
      description: 'Verify command copied to clipboard',
    });
  };

  if (disabled || !bundle) {
    return (
      <Button variant="outline" size={variant === 'compact' ? 'sm' : 'default'} disabled>
        <Download className="w-4 h-4 mr-2" />
        Export
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="default" size={variant === 'compact' ? 'sm' : 'default'}>
          <Download className="w-4 h-4 mr-2" />
          Export
          <ChevronDown className="w-3 h-3 ml-1" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <div className="px-2 py-1.5">
          <p className="text-xs text-muted-foreground">
            Export enables third-party verification
          </p>
        </div>
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={handleDownloadBundle} className="cursor-pointer">
          <Download className="w-4 h-4 mr-2" />
          <div className="flex flex-col">
            <span>Download JSON Bundle</span>
            <span className="text-xs text-muted-foreground">Full artifact for replay</span>
          </div>
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={handleCopyCommand} className="cursor-pointer">
          {copied === 'command' ? (
            <Check className="w-4 h-4 mr-2 text-verified" />
          ) : (
            <Terminal className="w-4 h-4 mr-2" />
          )}
          <div className="flex flex-col">
            <span>Copy Verify Command</span>
            <span className="text-xs text-muted-foreground">cURL command for verification</span>
          </div>
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={handleCopyHash} className="cursor-pointer">
          {copied === 'hash' ? (
            <Check className="w-4 h-4 mr-2 text-verified" />
          ) : (
            <Copy className="w-4 h-4 mr-2" />
          )}
          <div className="flex flex-col">
            <span>Copy Image Hash</span>
            <span className="text-xs font-mono text-muted-foreground truncate max-w-[180px]">
              {bundle.expectedImageHash.substring(0, 24)}...
            </span>
          </div>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        <div className="px-2 py-2">
          <div className="flex items-start gap-2 text-xs text-warning">
            <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
            <span>Do not export proprietary strategies unless intended for sharing.</span>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
