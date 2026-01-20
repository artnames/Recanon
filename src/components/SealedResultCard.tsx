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
  Mail
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

interface SealedResultCardProps {
  posterHash: string;
  animationHash: string | null;
  isLoop: boolean;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error' | 'auth_required';
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
  const { user, signInWithMagicLink, signInWithGoogle } = useAuth();
  const [email, setEmail] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleCopyHash = async (hash: string, label: string) => {
    try {
      await navigator.clipboard.writeText(hash);
      toast.success(`${label} copied`);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const handleMagicLink = async () => {
    if (!email.trim()) {
      toast.error('Please enter your email');
      return;
    }

    setIsSending(true);
    const { error } = await signInWithMagicLink(email);
    setIsSending(false);

    if (error) {
      toast.error('Sign in failed', { description: error.message });
    } else {
      setEmailSent(true);
      toast.success('Magic link sent!', { description: 'Check your email to sign in' });
    }
  };

  const handleGoogleSignIn = async () => {
    const { error } = await signInWithGoogle();
    if (error) {
      toast.error('Sign in failed', { description: error.message });
    }
    setDialogOpen(false);
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
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
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
                    <DialogTitle>Sign in to save</DialogTitle>
                    <DialogDescription>
                      Sign in to save this sealed claim to the Library for permanent storage.
                    </DialogDescription>
                  </DialogHeader>
                  
                  {emailSent ? (
                    <div className="py-6 text-center space-y-2">
                      <Mail className="w-12 h-12 mx-auto text-primary" />
                      <p className="text-sm font-medium">Check your email</p>
                      <p className="text-sm text-muted-foreground">
                        We sent a magic link to <strong>{email}</strong>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Once signed in, click "Retry" to save your claim.
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEmailSent(false);
                          setEmail('');
                        }}
                        className="mt-4"
                      >
                        Use different email
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4 py-4">
                      {/* Google Sign In */}
                      <Button
                        variant="outline"
                        className="w-full gap-2"
                        onClick={handleGoogleSignIn}
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24">
                          <path
                            fill="currentColor"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          />
                          <path
                            fill="currentColor"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          />
                          <path
                            fill="currentColor"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                          />
                          <path
                            fill="currentColor"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                          />
                        </svg>
                        Continue with Google
                      </Button>

                      <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                          <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                          <span className="bg-background px-2 text-muted-foreground">Or</span>
                        </div>
                      </div>

                      {/* Magic Link */}
                      <div className="space-y-2">
                        <Input
                          type="email"
                          placeholder="Enter your email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleMagicLink()}
                        />
                        <Button
                          className="w-full gap-2"
                          onClick={handleMagicLink}
                          disabled={isSending}
                        >
                          {isSending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Mail className="w-4 h-4" />
                          )}
                          Send magic link
                        </Button>
                      </div>
                    </div>
                  )}
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
