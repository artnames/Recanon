/**
 * Sealed Result Card - Shows status and actions after successful sealing
 */

import { useState } from 'react';
import { 
  CheckCircle2, 
  Copy, 
  Download, 
  ExternalLink,
  Loader2,
  RotateCcw,
  AlertTriangle,
  Hash,
  Stamp,
  LogIn,
  Mail,
  Lock,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

interface SealedResultCardProps {
  posterHash: string;
  animationHash: string | null;
  isLoop: boolean;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error' | 'auth_required' | 'validation_error';
  savedClaimId: string | null;
  saveError: string | null;
  saveErrorDetails?: string | null;
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
  saveErrorDetails,
  onOpenInLibrary,
  onDownloadBundle,
  onCheckNow,
  onRetrySave,
}: SealedResultCardProps) {
  const { signUp, signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [detailsOpen, setDetailsOpen] = useState(false);

  const handleCopyHash = async (hash: string, label: string) => {
    try {
      await navigator.clipboard.writeText(hash);
      toast.success(`${label} copied`);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim() || !password.trim()) {
      toast.error('Please enter email and password');
      return;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setIsSubmitting(true);
    
    if (mode === 'signup') {
      const { error } = await signUp(email, password);
      if (error) {
        toast.error('Sign up failed', { description: error.message });
      } else {
        toast.success('Account created!', { description: 'You are now signed in' });
        setDialogOpen(false);
        resetForm();
      }
    } else {
      const { error } = await signIn(email, password);
      if (error) {
        toast.error('Sign in failed', { description: error.message });
      } else {
        toast.success('Signed in!');
        setDialogOpen(false);
        resetForm();
      }
    }
    
    setIsSubmitting(false);
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setMode('signin');
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
          {saveStatus === 'auth_required' && (
            <>
              <LogIn className="w-4 h-4 text-amber-500" />
              <span className="text-sm text-amber-600 dark:text-amber-400">Not saved – sign in required</span>
              <Dialog open={dialogOpen} onOpenChange={(open) => {
                setDialogOpen(open);
                if (!open) resetForm();
              }}>
                <DialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="ml-auto h-7 gap-1 border-amber-500/50 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    Sign in to save
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>{mode === 'signin' ? 'Sign in' : 'Create account'}</DialogTitle>
                    <DialogDescription>
                      {mode === 'signin' 
                        ? 'Sign in to save this sealed claim to the Library.' 
                        : 'Create an account to save sealed claims to the Library.'}
                    </DialogDescription>
                  </DialogHeader>
                  
                  <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="sealed-email">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="sealed-email"
                          type="email"
                          placeholder="you@example.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="sealed-password">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="sealed-password"
                          type="password"
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                    
                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : mode === 'signin' ? (
                        'Sign in'
                      ) : (
                        'Create account'
                      )}
                    </Button>
                    
                    <div className="text-center text-sm">
                      {mode === 'signin' ? (
                        <p className="text-muted-foreground">
                          Don't have an account?{' '}
                          <button
                            type="button"
                            onClick={() => setMode('signup')}
                            className="text-primary hover:underline font-medium"
                          >
                            Sign up
                          </button>
                        </p>
                      ) : (
                        <p className="text-muted-foreground">
                          Already have an account?{' '}
                          <button
                            type="button"
                            onClick={() => setMode('signin')}
                            className="text-primary hover:underline font-medium"
                          >
                            Sign in
                          </button>
                        </p>
                      )}
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
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
          {saveStatus === 'validation_error' && (
            <div className="w-full">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0" />
                <span className="text-sm text-destructive font-medium">{saveError || 'Validation failed'}</span>
              </div>
              {saveErrorDetails && (
                <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen} className="mt-2">
                  <CollapsibleTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
                    >
                      {detailsOpen ? (
                        <>
                          <ChevronUp className="w-3 h-3" />
                          Hide details
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-3 h-3" />
                          Show details
                        </>
                      )}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="mt-2 p-2 bg-muted rounded text-xs font-mono text-muted-foreground break-all">
                      {saveErrorDetails}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}
            </div>
          )}
          {saveStatus === 'idle' && (
            <span className="text-sm text-muted-foreground">Ready to save</span>
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
