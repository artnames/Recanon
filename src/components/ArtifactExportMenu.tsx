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
import type { ArtifactBundle } from '@/types/artifactBundle';
import { downloadBundle, generateReplayCommand } from '@/certified/bundleExport';
import { toast } from '@/hooks/use-toast';

interface ArtifactExportMenuProps {
  bundle: ArtifactBundle | null;
  disabled?: boolean;
  variant?: 'default' | 'compact';
}

export function ArtifactExportMenu({ bundle, disabled = false, variant = 'default' }: ArtifactExportMenuProps) {
  const [copied, setCopied] = useState<'hash' | 'command' | null>(null);

  const handleDownloadBundle = () => {
    if (!bundle) return;
    downloadBundle(bundle);
    toast({
      title: 'Bundle Downloaded',
      description: `${bundle.artifactId}-bundle.json saved`,
    });
  };

  const handleCopyHash = async () => {
    if (!bundle) return;
    await navigator.clipboard.writeText(bundle.verification.verificationHash);
    setCopied('hash');
    setTimeout(() => setCopied(null), 2000);
    toast({
      title: 'Hash Copied',
      description: 'Verification hash copied to clipboard',
    });
  };

  const handleCopyCommand = async () => {
    if (!bundle) return;
    const command = generateReplayCommand(bundle);
    await navigator.clipboard.writeText(command);
    setCopied('command');
    setTimeout(() => setCopied(null), 2000);
    toast({
      title: 'Command Copied',
      description: 'Replay command copied to clipboard',
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
        <Button variant="verified" size={variant === 'compact' ? 'sm' : 'default'}>
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
            <span>Copy Replay Command</span>
            <span className="text-xs text-muted-foreground">CLI verification script</span>
          </div>
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={handleCopyHash} className="cursor-pointer">
          {copied === 'hash' ? (
            <Check className="w-4 h-4 mr-2 text-verified" />
          ) : (
            <Copy className="w-4 h-4 mr-2" />
          )}
          <div className="flex flex-col">
            <span>Copy Verification Hash</span>
            <span className="text-xs font-mono text-muted-foreground truncate max-w-[180px]">
              {bundle.verification.verificationHash.substring(0, 24)}...
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
