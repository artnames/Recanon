/**
 * Claim Builder / Claim Studio - Form-driven bundle generator
 * 
 * Turns any real-world claim into a sealed, replayable, verifiable artifact.
 * Supports multiple claim types: Sports, P&L, and Generic statements.
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { 
  Stamp, 
  Download, 
  Copy, 
  RotateCcw, 
  Plus, 
  Trash2, 
  ChevronDown, 
  ChevronRight,
  Info,
  CheckCircle2,
  XCircle,
  Loader2,
  FileCode,
  HelpCircle,
  Trophy,
  DollarSign,
  FileText,
  TrendingUp,
  TrendingDown,
  Sparkles
} from 'lucide-react';
import { 
  ClaimBundle, 
  ClaimSource,
  ClaimType,
  SportsClaimDetails,
  PnlClaimDetails,
  GenericClaimDetails,
  CLAIM_BUNDLE_VERSION,
  downloadClaimBundle,
  serializeClaimBundle,
  createEmptySportsDetails,
  createEmptyPnlDetails,
  createEmptyGenericDetails,
  generateSportsTitle,
  generateSportsStatement,
  generateSportsSubject,
  generatePnlTitle,
  generatePnlStatement,
  calculatePnlMetrics,
} from '@/types/claimBundle';
import { 
  getCodeTemplateForClaimType,
  getClaimTypeDescription,
} from '@/certified/claimCodeTemplates';
import { renderCertified, verifyCertified } from '@/certified/canonicalClient';
import { toast } from 'sonner';
import { SPORTS_EXAMPLE, PNL_EXAMPLE } from '@/data/claimExamples';
import { SealedResultCard } from './SealedResultCard';
import { normalizeSha256 } from '@/api/claims';

interface ClaimBuilderProps {
  className?: string;
  prefillExample?: ClaimType | null;
  onExampleConsumed?: () => void;
  onNavigateToLibrary?: (claimId: string) => void;
}

export function ClaimBuilder({ className, prefillExample, onExampleConsumed, onNavigateToLibrary }: ClaimBuilderProps) {
  // Step tracking
  const [currentStep, setCurrentStep] = useState(1);
  
  // Claim Type (required, at top)
  const [claimType, setClaimType] = useState<ClaimType>('generic');
  
  // Generic claim details
  const [genericDetails, setGenericDetails] = useState<GenericClaimDetails>(createEmptyGenericDetails());
  
  // Sports claim details
  const [sportsDetails, setSportsDetails] = useState<SportsClaimDetails>(createEmptySportsDetails());
  
  // P&L claim details
  const [pnlDetails, setPnlDetails] = useState<PnlClaimDetails>(createEmptyPnlDetails());
  
  // Step 2: Evidence Sources
  const [sources, setSources] = useState<ClaimSource[]>([]);
  
  // Step 3: Execution Settings
  const [seed, setSeed] = useState(12345);
  const [isLoopMode, setIsLoopMode] = useState(false);
  const [vars, setVars] = useState<number[]>([50, 50, 50, 50, 50, 50, 50, 50, 50, 50]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // Sealing state
  const [isSealing, setIsSealing] = useState(false);
  const [sealResult, setSealResult] = useState<{
    posterHash: string;
    animationHash: string | null;
  } | null>(null);
  const [sealError, setSealError] = useState<string | null>(null);

  // Handle prefill example from navigation
  useEffect(() => {
    if (prefillExample) {
      loadExample(prefillExample);
      if (onExampleConsumed) {
        onExampleConsumed();
      }
    }
  }, [prefillExample, onExampleConsumed]);

  // Load example data
  const loadExample = useCallback((type: ClaimType) => {
    setSealResult(null);
    setSealError(null);
    setCurrentStep(3); // Jump to execution step after loading
    
    if (type === 'sports') {
      setClaimType('sports');
      setSportsDetails(SPORTS_EXAMPLE.details);
      setSources(SPORTS_EXAMPLE.sources);
      setSeed(SPORTS_EXAMPLE.seed);
      setVars(SPORTS_EXAMPLE.vars);
      toast.success('Sports example loaded', {
        description: 'Click "Seal Claim" to generate your first bundle.',
      });
    } else if (type === 'pnl') {
      setClaimType('pnl');
      setPnlDetails(PNL_EXAMPLE.details);
      setSources(PNL_EXAMPLE.sources);
      setSeed(PNL_EXAMPLE.seed);
      setVars(PNL_EXAMPLE.vars);
      toast.success('P&L example loaded', {
        description: 'Click "Seal Claim" to generate your first bundle.',
      });
    }
  }, []);

  // Computed P&L metrics
  const pnlMetrics = useMemo(() => {
    return calculatePnlMetrics(pnlDetails);
  }, [pnlDetails]);

  // Auto-generated fields for sports
  const sportsAutoFields = useMemo(() => ({
    title: generateSportsTitle(sportsDetails),
    statement: generateSportsStatement(sportsDetails),
    subject: generateSportsSubject(sportsDetails),
  }), [sportsDetails]);

  // Auto-generated fields for P&L
  const pnlAutoFields = useMemo(() => ({
    title: generatePnlTitle(pnlDetails),
    statement: generatePnlStatement(pnlDetails),
  }), [pnlDetails]);

  // Generate code from claim type and details
  const generatedCode = useMemo(() => {
    if (claimType === 'sports') {
      return getCodeTemplateForClaimType('sports', sportsDetails, undefined);
    } else if (claimType === 'pnl') {
      return getCodeTemplateForClaimType('pnl', undefined, {
        ...pnlDetails,
        profit: pnlMetrics.profit,
        returnPct: pnlMetrics.returnPct,
      });
    }
    return getCodeTemplateForClaimType('generic', undefined, undefined);
  }, [claimType, sportsDetails, pnlDetails, pnlMetrics]);

  // Get current title/statement/subject based on claim type
  const currentClaimFields = useMemo(() => {
    if (claimType === 'sports') {
      return {
        title: sportsAutoFields.title,
        statement: sportsAutoFields.statement,
        subject: sportsAutoFields.subject,
        eventDate: sportsDetails.eventDate,
        notes: sportsDetails.notes,
      };
    } else if (claimType === 'pnl') {
      return {
        title: pnlAutoFields.title,
        statement: pnlAutoFields.statement,
        subject: pnlDetails.assetName,
        eventDate: pnlDetails.periodEnd,
        notes: pnlDetails.notes,
      };
    }
    return {
      title: genericDetails.title,
      statement: genericDetails.statement,
      subject: genericDetails.subject,
      eventDate: genericDetails.eventDate,
      notes: genericDetails.notes,
    };
  }, [claimType, sportsAutoFields, pnlAutoFields, sportsDetails, pnlDetails, genericDetails]);

  // Get current details object based on claim type
  const currentDetails = useMemo(() => {
    if (claimType === 'sports') return sportsDetails;
    if (claimType === 'pnl') return pnlDetails;
    return genericDetails;
  }, [claimType, sportsDetails, pnlDetails, genericDetails]);

  // Build the bundle in real-time
  const bundle: ClaimBundle = useMemo(() => {
    return {
      bundleVersion: CLAIM_BUNDLE_VERSION,
      createdAt: sealResult ? new Date().toISOString() : '',
      mode: isLoopMode ? 'loop' : 'static',
      claim: {
        type: claimType,
        title: currentClaimFields.title.trim(),
        statement: currentClaimFields.statement.trim(),
        eventDate: currentClaimFields.eventDate,
        subject: currentClaimFields.subject.trim(),
        notes: currentClaimFields.notes.trim(),
        details: currentDetails,
      },
      sources: sources.map(s => ({
        label: s.label.trim(),
        url: s.url.trim(),
        retrievedAt: s.retrievedAt,
        selectorOrEvidence: s.selectorOrEvidence.trim(),
      })),
      canonical: {
        via: 'proxy',
        protocol: 'nexart',
        protocolVersion: '1.2.0',
      },
      snapshot: {
        code: generatedCode,
        seed,
        vars,
        execution: {
          frames: isLoopMode ? 60 : 1,
          loop: isLoopMode,
        },
      },
      baseline: {
        posterHash: sealResult?.posterHash || '',
        animationHash: sealResult?.animationHash || null,
      },
      check: {
        lastCheckedAt: sealResult ? new Date().toISOString() : '',
        result: sealResult ? 'SEALED' : '',
      },
    };
  }, [claimType, currentClaimFields, currentDetails, sources, generatedCode, seed, vars, isLoopMode, sealResult]);

  // Validation per claim type
  const isClaimValid = useMemo(() => {
    if (claimType === 'sports') {
      return (
        sportsDetails.competition.trim().length > 0 &&
        sportsDetails.matchEvent.trim().length > 0 &&
        sportsDetails.homeTeam.trim().length > 0 &&
        sportsDetails.awayTeam.trim().length > 0 &&
        sportsDetails.eventDate.length > 0
      );
    } else if (claimType === 'pnl') {
      return (
        pnlDetails.assetName.trim().length > 0 &&
        pnlDetails.periodStart.length > 0 &&
        pnlDetails.periodEnd.length > 0
      );
    }
    return (
      genericDetails.title.trim().length > 0 &&
      genericDetails.statement.trim().length > 0 &&
      genericDetails.eventDate.length > 0
    );
  }, [claimType, sportsDetails, pnlDetails, genericDetails]);

  const isExecutionValid = seed > 0;
  const canSeal = isClaimValid && isExecutionValid;

  // Source management
  const addSource = () => {
    setSources([...sources, {
      label: '',
      url: '',
      retrievedAt: new Date().toISOString().slice(0, 16),
      selectorOrEvidence: '',
    }]);
  };

  const updateSource = (index: number, field: keyof ClaimSource, value: string) => {
    const updated = [...sources];
    updated[index] = { ...updated[index], [field]: value };
    setSources(updated);
  };

  const removeSource = (index: number) => {
    setSources(sources.filter((_, i) => i !== index));
  };

  const updateVar = (index: number, value: number) => {
    const updated = [...vars];
    updated[index] = Math.max(0, Math.min(100, value));
    setVars(updated);
  };

  // Save state for library
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error' | 'auth_required' | 'validation_error'>('idle');
  const [savedClaimId, setSavedClaimId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveErrorDetails, setSaveErrorDetails] = useState<string | null>(null);
  
  // Store bundle for retry after auth
  const [pendingBundle, setPendingBundle] = useState<ClaimBundle | null>(null);

  // Seal the claim
  const handleSeal = useCallback(async () => {
    if (!canSeal) return;
    
    setIsSealing(true);
    setSealError(null);
    setSealResult(null);
    setSaveStatus('idle');
    setSavedClaimId(null);
    setSaveError(null);
    setSaveErrorDetails(null);

    try {
      const snapshot = {
        code: generatedCode,
        seed,
        vars,
        execution: isLoopMode ? { frames: 60, loop: true } : { frames: 1, loop: false },
      };

      // Debug log for snapshot
      console.log('[ClaimBuilder] Sealing snapshot:', {
        seed: snapshot.seed,
        vars: snapshot.vars,
        codeLength: snapshot.code.length,
        codePreview: snapshot.code.slice(0, 100),
      });

      const response = await renderCertified(snapshot);
      
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Renderer returned no data');
      }

      const result = response.data;
      
      let sealedResult: { posterHash: string; animationHash: string | null };
      
      if (isLoopMode) {
        if (!result.posterHash || !result.animationHash) {
          throw new Error('Loop mode requires both poster and animation hashes');
        }
        sealedResult = {
          posterHash: result.posterHash,
          animationHash: result.animationHash,
        };
      } else {
        if (!result.posterHash) {
          throw new Error('Renderer did not return a poster hash');
        }
        sealedResult = {
          posterHash: result.posterHash,
          animationHash: null,
        };
      }
      
      setSealResult(sealedResult);
      toast.success('Claim sealed successfully!');

      // Now save to library
      setSaveStatus('saving');
      try {
        const { saveSealedClaim, normalizeSha256, checkAuthForSave } = await import('@/api/claims');
        const bundleToSave: ClaimBundle = {
          ...bundle,
          createdAt: new Date().toISOString(),
          baseline: {
            posterHash: normalizeSha256(sealedResult.posterHash),
            animationHash: sealedResult.animationHash ? normalizeSha256(sealedResult.animationHash) : null,
          },
          check: {
            lastCheckedAt: new Date().toISOString(),
            result: 'SEALED',
          },
        };
        
        // Check auth before attempting save
        const { isAuthenticated } = await checkAuthForSave();
        if (!isAuthenticated) {
          // Store bundle for retry after sign-in
          setPendingBundle(bundleToSave);
          setSaveStatus('auth_required');
          toast.info('Sign in to save', { 
            description: 'Your sealed claim is ready. Sign in to save it to the Library.' 
          });
        } else {
          const saved = await saveSealedClaim(bundleToSave);
          setSavedClaimId(saved.id);
          setSaveStatus('saved');
          setPendingBundle(null);
          toast.success('Saved to Library');
        }
      } catch (saveErr: unknown) {
        // Check for auth-required error
        if (saveErr && typeof saveErr === 'object' && 'code' in saveErr && saveErr.code === 'AUTH_REQUIRED') {
          setSaveStatus('auth_required');
          toast.info('Sign in to save', { 
            description: 'Your sealed claim is ready. Sign in to save it to the Library.' 
          });
        } else if (saveErr && typeof saveErr === 'object' && 'code' in saveErr && saveErr.code === 'VALIDATION_ERROR') {
          // Handle validation errors with user-friendly message
          const validationError = saveErr as unknown as { userMessage: string; technicalDetails: string };
          setSaveError(validationError.userMessage || 'Validation failed');
          setSaveErrorDetails(validationError.technicalDetails || null);
          setSaveStatus('validation_error');
          toast.error('Save blocked', { description: validationError.userMessage || 'Validation failed' });
        } else {
          const msg = saveErr instanceof Error ? saveErr.message : 'Failed to save';
          setSaveError(msg);
          setSaveErrorDetails(null);
          setSaveStatus('error');
          console.error('Failed to save to library:', saveErr);
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setSealError(message);
      toast.error('Sealing blocked', {
        description: message,
      });
    } finally {
      setIsSealing(false);
    }
  }, [canSeal, generatedCode, seed, vars, isLoopMode, bundle]);

  // Download JSON
  const handleDownload = () => {
    downloadClaimBundle(bundle);
    toast.success('Bundle downloaded');
  };

  // Copy JSON
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(serializeClaimBundle(bundle));
      toast.success('JSON copied to clipboard');
    } catch {
      toast.error('Failed to copy');
    }
  };

  // Reset
  const handleReset = () => {
    setClaimType('generic');
    setGenericDetails(createEmptyGenericDetails());
    setSportsDetails(createEmptySportsDetails());
    setPnlDetails(createEmptyPnlDetails());
    setSources([]);
    setSeed(12345);
    setIsLoopMode(false);
    setVars([50, 50, 50, 50, 50, 50, 50, 50, 50, 50]);
    setSealResult(null);
    setSealError(null);
    setPendingBundle(null);
    setCurrentStep(1);
    toast.info('Builder reset');
  };

  // Retry save after authentication
  const handleRetrySave = useCallback(async () => {
    if (!pendingBundle) return;
    
    setSaveStatus('saving');
    setSaveError(null);
    setSaveErrorDetails(null);
    
    try {
      const { saveSealedClaim } = await import('@/api/claims');
      const saved = await saveSealedClaim(pendingBundle);
      setSavedClaimId(saved.id);
      setSaveStatus('saved');
      setPendingBundle(null);
      toast.success('Saved to Library');
    } catch (saveErr: unknown) {
      if (saveErr && typeof saveErr === 'object' && 'code' in saveErr && saveErr.code === 'AUTH_REQUIRED') {
        setSaveStatus('auth_required');
        toast.error('Still not signed in', { description: 'Please sign in to save your claim.' });
      } else if (saveErr && typeof saveErr === 'object' && 'code' in saveErr && saveErr.code === 'VALIDATION_ERROR') {
        const validationError = saveErr as unknown as { userMessage: string; technicalDetails: string };
        setSaveError(validationError.userMessage || 'Validation failed');
        setSaveErrorDetails(validationError.technicalDetails || null);
        setSaveStatus('validation_error');
        toast.error('Save blocked', { description: validationError.userMessage || 'Validation failed' });
      } else {
        const msg = saveErr instanceof Error ? saveErr.message : 'Failed to save';
        setSaveError(msg);
        setSaveErrorDetails(null);
        setSaveStatus('error');
      }
    }
  }, [pendingBundle]);

  // Handle "Check Now" from sealed result
  const handleCheckNow = useCallback(async () => {
    if (!sealResult) return;
    
    try {
      const snapshot = {
        code: generatedCode,
        seed,
        vars,
        execution: isLoopMode ? { frames: 60, loop: true } : { frames: 1, loop: false },
      };
      
      const response = await verifyCertified(
        snapshot,
        normalizeSha256(sealResult.posterHash),
        isLoopMode && sealResult.animationHash ? normalizeSha256(sealResult.animationHash) : undefined
      );
      
      if (response.verified) {
        toast.success('Verification passed!', {
          description: 'Hashes match. This claim is intact.',
        });
      } else {
        toast.error('Verification failed', {
          description: 'Hashes do not match.',
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast.error('Check failed', { description: message });
    }
  }, [sealResult, generatedCode, seed, vars, isLoopMode]);

  // Handle Open in Library
  const handleOpenInLibrary = useCallback(() => {
    if (savedClaimId && onNavigateToLibrary) {
      onNavigateToLibrary(savedClaimId);
    }
  }, [savedClaimId, onNavigateToLibrary]);

  // Handle claim type change
  const handleClaimTypeChange = (type: ClaimType) => {
    setClaimType(type);
    setSealResult(null);
    setSealError(null);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Claim Studio</h1>
        <p className="text-sm text-muted-foreground">
          Turn a real-world claim into a sealed, replayable artifact. 
          Anyone can independently re-check the result using the same inputs.
        </p>
      </div>

      {/* Help Section */}
      <div className="p-4 bg-muted/30 border border-border rounded-lg">
        <div className="flex items-start gap-3">
          <HelpCircle className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
          <div className="text-sm space-y-1">
            <p className="font-medium text-foreground">What counts as a valid claim?</p>
            <ul className="text-muted-foreground space-y-0.5 list-disc list-inside">
              <li>Claim must be specific and checkable (a verifiable fact or outcome)</li>
              <li>Sources should be stable URLs that others can access</li>
              <li>The sealed output proves "this exact bundle was executed by canonical renderer" — not that the claim is true</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Claim Type Selector - Always visible at top */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <span className="text-primary">●</span>
            Claim Type
            <Badge variant="outline" className="ml-2">Required</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              onClick={() => handleClaimTypeChange('sports')}
              className={`p-4 rounded-lg border-2 transition-all text-left ${
                claimType === 'sports'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-muted-foreground/50 hover:bg-muted/50'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <Trophy className={`w-5 h-5 ${claimType === 'sports' ? 'text-primary' : 'text-muted-foreground'}`} />
                <span className="font-medium">Sports Result</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Match scores, competition outcomes
              </p>
            </button>

            <button
              onClick={() => handleClaimTypeChange('pnl')}
              className={`p-4 rounded-lg border-2 transition-all text-left ${
                claimType === 'pnl'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-muted-foreground/50 hover:bg-muted/50'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className={`w-5 h-5 ${claimType === 'pnl' ? 'text-primary' : 'text-muted-foreground'}`} />
                <span className="font-medium">Profit / P&L</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Financial returns, trading results
              </p>
            </button>

            <button
              onClick={() => handleClaimTypeChange('generic')}
              className={`p-4 rounded-lg border-2 transition-all text-left ${
                claimType === 'generic'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-muted-foreground/50 hover:bg-muted/50'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <FileText className={`w-5 h-5 ${claimType === 'generic' ? 'text-primary' : 'text-muted-foreground'}`} />
                <span className="font-medium">Generic Statement</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Any verifiable fact or record
              </p>
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            {getClaimTypeDescription(claimType)}
          </p>

          {/* Load Example Buttons */}
          <div className="mt-4 pt-4 border-t border-border">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Quick Start</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadExample('sports')}
                className="gap-2"
              >
                <Trophy className="w-3.5 h-3.5" />
                Load Sports Example
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadExample('pnl')}
                className="gap-2"
              >
                <DollarSign className="w-3.5 h-3.5" />
                Load P&L Example
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReset}
                className="gap-2 text-muted-foreground"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Step Progress */}
      <div className="flex items-center gap-2 text-xs">
        {[1, 2, 3].map((step) => (
          <button
            key={step}
            onClick={() => setCurrentStep(step)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-colors ${
              currentStep === step
                ? 'bg-primary text-primary-foreground'
                : step < currentStep
                ? 'bg-verified/20 text-verified'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            <span className="font-medium">{step}</span>
            <span className="hidden sm:inline">
              {step === 1 && 'Details'}
              {step === 2 && 'Sources'}
              {step === 3 && 'Execute'}
            </span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left: Form */}
        <div className="xl:col-span-2 space-y-6">
          {/* Step 1: Claim Details - Dynamic based on type */}
          {currentStep === 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">1</span>
                  {claimType === 'sports' && 'Sports Result Details'}
                  {claimType === 'pnl' && 'P&L Details'}
                  {claimType === 'generic' && 'Statement Details'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Sports Form */}
                {claimType === 'sports' && (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="competition">Competition *</Label>
                        <Input
                          id="competition"
                          placeholder="e.g., UEFA Champions League"
                          value={sportsDetails.competition}
                          onChange={(e) => setSportsDetails({ ...sportsDetails, competition: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="matchEvent">Match / Event *</Label>
                        <Input
                          id="matchEvent"
                          placeholder="e.g., Semi-final 2nd leg"
                          value={sportsDetails.matchEvent}
                          onChange={(e) => setSportsDetails({ ...sportsDetails, matchEvent: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="homeTeam">Home Team *</Label>
                        <Input
                          id="homeTeam"
                          placeholder="e.g., Man City"
                          value={sportsDetails.homeTeam}
                          onChange={(e) => setSportsDetails({ ...sportsDetails, homeTeam: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="homeScore">Home Score *</Label>
                        <Input
                          id="homeScore"
                          type="number"
                          min={0}
                          value={sportsDetails.homeScore}
                          onChange={(e) => setSportsDetails({ ...sportsDetails, homeScore: parseInt(e.target.value) || 0 })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="awayScore">Away Score *</Label>
                        <Input
                          id="awayScore"
                          type="number"
                          min={0}
                          value={sportsDetails.awayScore}
                          onChange={(e) => setSportsDetails({ ...sportsDetails, awayScore: parseInt(e.target.value) || 0 })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="awayTeam">Away Team *</Label>
                        <Input
                          id="awayTeam"
                          placeholder="e.g., Real Madrid"
                          value={sportsDetails.awayTeam}
                          onChange={(e) => setSportsDetails({ ...sportsDetails, awayTeam: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="venue">Venue (optional)</Label>
                        <Input
                          id="venue"
                          placeholder="e.g., Etihad Stadium"
                          value={sportsDetails.venue}
                          onChange={(e) => setSportsDetails({ ...sportsDetails, venue: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="sportsEventDate">Event Date / Time *</Label>
                        <Input
                          id="sportsEventDate"
                          type="datetime-local"
                          value={sportsDetails.eventDate}
                          onChange={(e) => setSportsDetails({ ...sportsDetails, eventDate: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="sportsNotes">Notes (optional)</Label>
                      <Textarea
                        id="sportsNotes"
                        placeholder="Additional context..."
                        value={sportsDetails.notes}
                        onChange={(e) => setSportsDetails({ ...sportsDetails, notes: e.target.value })}
                        rows={2}
                      />
                    </div>

                    {/* Auto-generated preview */}
                    {sportsAutoFields.title && (
                      <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                        <div className="text-xs text-muted-foreground">Auto-generated fields:</div>
                        <div className="text-sm"><span className="text-muted-foreground">Title:</span> {sportsAutoFields.title}</div>
                        <div className="text-sm"><span className="text-muted-foreground">Statement:</span> {sportsAutoFields.statement}</div>
                        <div className="text-sm"><span className="text-muted-foreground">Subject:</span> {sportsAutoFields.subject}</div>
                      </div>
                    )}
                  </>
                )}

                {/* P&L Form */}
                {claimType === 'pnl' && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="assetName">Asset / Strategy Name *</Label>
                      <Input
                        id="assetName"
                        placeholder="e.g., BTC Momentum Strategy"
                        value={pnlDetails.assetName}
                        onChange={(e) => setPnlDetails({ ...pnlDetails, assetName: e.target.value })}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="startBalance">Start Balance *</Label>
                        <Input
                          id="startBalance"
                          type="number"
                          step="0.01"
                          placeholder="10000"
                          value={pnlDetails.startBalance || ''}
                          onChange={(e) => setPnlDetails({ ...pnlDetails, startBalance: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="endBalance">End Balance *</Label>
                        <Input
                          id="endBalance"
                          type="number"
                          step="0.01"
                          placeholder="12500"
                          value={pnlDetails.endBalance || ''}
                          onChange={(e) => setPnlDetails({ ...pnlDetails, endBalance: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="fees">Fees (optional)</Label>
                        <Input
                          id="fees"
                          type="number"
                          step="0.01"
                          placeholder="0"
                          value={pnlDetails.fees || ''}
                          onChange={(e) => setPnlDetails({ ...pnlDetails, fees: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="periodStart">Period Start *</Label>
                        <Input
                          id="periodStart"
                          type="date"
                          value={pnlDetails.periodStart}
                          onChange={(e) => setPnlDetails({ ...pnlDetails, periodStart: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="periodEnd">Period End *</Label>
                        <Input
                          id="periodEnd"
                          type="date"
                          value={pnlDetails.periodEnd}
                          onChange={(e) => setPnlDetails({ ...pnlDetails, periodEnd: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="calcMethod">Calculation Method</Label>
                        <Select 
                          value={pnlDetails.calculationMethod} 
                          onValueChange={(v) => setPnlDetails({ ...pnlDetails, calculationMethod: v as 'simple' | 'percent' | 'cagr' })}
                        >
                          <SelectTrigger id="calcMethod">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="simple">Simple Return</SelectItem>
                            <SelectItem value="percent">Percent Return</SelectItem>
                            <SelectItem value="cagr">CAGR</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="pnlNotes">Notes (optional)</Label>
                      <Textarea
                        id="pnlNotes"
                        placeholder="Additional context..."
                        value={pnlDetails.notes}
                        onChange={(e) => setPnlDetails({ ...pnlDetails, notes: e.target.value })}
                        rows={2}
                      />
                    </div>

                    {/* Computed Panel */}
                    {pnlDetails.startBalance > 0 && (
                      <div className="p-4 bg-muted/50 rounded-lg">
                        <div className="text-xs text-muted-foreground mb-3 flex items-center gap-2">
                          <CheckCircle2 className="w-3 h-3" />
                          Computed Values
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-center">
                          <div>
                            <div className={`text-2xl font-bold flex items-center justify-center gap-1 ${pnlMetrics.profit >= 0 ? 'text-verified' : 'text-destructive'}`}>
                              {pnlMetrics.profit >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                              ${Math.abs(pnlMetrics.profit).toFixed(2)}
                            </div>
                            <div className="text-xs text-muted-foreground">Profit</div>
                          </div>
                          <div>
                            <div className={`text-2xl font-bold ${pnlMetrics.returnPct >= 0 ? 'text-verified' : 'text-destructive'}`}>
                              {pnlMetrics.returnPct >= 0 ? '+' : ''}{pnlMetrics.returnPct.toFixed(2)}%
                            </div>
                            <div className="text-xs text-muted-foreground">Return</div>
                          </div>
                          <div>
                            <div className="text-2xl font-bold text-foreground">
                              ${pnlMetrics.netBalance.toFixed(2)}
                            </div>
                            <div className="text-xs text-muted-foreground">Net Balance</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Generic Form */}
                {claimType === 'generic' && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="genericTitle">Title *</Label>
                      <Input
                        id="genericTitle"
                        placeholder="e.g., Q4 2024 Revenue Report"
                        value={genericDetails.title}
                        onChange={(e) => setGenericDetails({ ...genericDetails, title: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="genericStatement">Statement *</Label>
                      <Textarea
                        id="genericStatement"
                        placeholder="The specific claim or fact you want to seal..."
                        value={genericDetails.statement}
                        onChange={(e) => setGenericDetails({ ...genericDetails, statement: e.target.value })}
                        rows={3}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="genericEventDate">Date / Time *</Label>
                        <Input
                          id="genericEventDate"
                          type="datetime-local"
                          value={genericDetails.eventDate}
                          onChange={(e) => setGenericDetails({ ...genericDetails, eventDate: e.target.value })}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="genericSubject">Subject (optional)</Label>
                        <Input
                          id="genericSubject"
                          placeholder="e.g., Company Financials"
                          value={genericDetails.subject}
                          onChange={(e) => setGenericDetails({ ...genericDetails, subject: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="genericNotes">Notes (optional)</Label>
                      <Textarea
                        id="genericNotes"
                        placeholder="Additional context..."
                        value={genericDetails.notes}
                        onChange={(e) => setGenericDetails({ ...genericDetails, notes: e.target.value })}
                        rows={2}
                      />
                    </div>
                  </>
                )}

                <div className="flex justify-end pt-2">
                  <Button onClick={() => setCurrentStep(2)} disabled={!isClaimValid}>
                    Next: Evidence Sources
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Evidence Sources */}
          {currentStep === 2 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">2</span>
                  Evidence Sources
                  <Badge variant="secondary" className="ml-2">Optional</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Add links to official sources that support your claim. This helps others verify the claim independently.
                </p>

                {sources.map((source, index) => (
                  <div key={index} className="p-4 border border-border rounded-lg space-y-3 bg-muted/30">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Source {index + 1}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeSource(index)}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Label</Label>
                        <Input
                          placeholder="e.g., Official Match Report"
                          value={source.label}
                          onChange={(e) => updateSource(index, 'label', e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">URL *</Label>
                        <Input
                          type="url"
                          placeholder="https://..."
                          value={source.url}
                          onChange={(e) => updateSource(index, 'url', e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Retrieved At</Label>
                        <Input
                          type="datetime-local"
                          value={source.retrievedAt.slice(0, 16)}
                          onChange={(e) => updateSource(index, 'retrievedAt', e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Evidence Description</Label>
                        <Input
                          placeholder="Selector, quote, or page reference..."
                          value={source.selectorOrEvidence}
                          onChange={(e) => updateSource(index, 'selectorOrEvidence', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                ))}

                <Button variant="outline" onClick={addSource} className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Source
                </Button>

                <div className="flex justify-between">
                  <Button variant="ghost" onClick={() => setCurrentStep(1)}>
                    Back
                  </Button>
                  <Button onClick={() => setCurrentStep(3)}>
                    Next: Execute Settings
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Execution Settings */}
          {currentStep === 3 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">3</span>
                  Execution Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="seed">Seed *</Label>
                    <div className="flex gap-2">
                      <Input
                        id="seed"
                        type="number"
                        value={seed}
                        onChange={(e) => setSeed(parseInt(e.target.value) || 0)}
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setSeed(Math.floor(Math.random() * 1e9))}
                        title="Generate random seed"
                      >
                        🎲
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Seeds random() and noise() for determinism. Click 🎲 to randomize.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Mode</Label>
                    <div className="flex items-center gap-3 mt-1">
                      <Switch
                        checked={isLoopMode}
                        onCheckedChange={setIsLoopMode}
                      />
                      <span className="text-sm">
                        {isLoopMode ? 'Loop (60 frames, MP4)' : 'Static (PNG)'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Snapshot Debug Panel */}
                <Collapsible>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="w-full justify-start text-xs text-muted-foreground">
                      <ChevronRight className="w-3 h-3 mr-1" />
                      Snapshot Debug (dev)
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="p-3 bg-muted/30 rounded-lg text-xs font-mono space-y-1 mt-2">
                      <div><span className="text-muted-foreground">seed:</span> {seed}</div>
                      <div><span className="text-muted-foreground">vars:</span> [{vars.join(', ')}]</div>
                      <div><span className="text-muted-foreground">code length:</span> {generatedCode.length} chars</div>
                      <div><span className="text-muted-foreground">claim string preview:</span></div>
                      <div className="text-[10px] bg-muted p-2 rounded break-all max-h-20 overflow-auto">
                        {generatedCode.match(/claimString = "([^"]+)"/)?.[1] || 'N/A'}
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                {/* Code Preview */}
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                    <FileCode className="w-4 h-4" />
                    Generated Code Preview ({claimType} template)
                  </div>
                  <pre className="text-[10px] font-mono overflow-x-auto max-h-48 text-muted-foreground">
                    {generatedCode.slice(0, 600)}...
                  </pre>
                </div>

                {/* Advanced Settings */}
                <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="w-full justify-start">
                      {showAdvanced ? <ChevronDown className="w-4 h-4 mr-2" /> : <ChevronRight className="w-4 h-4 mr-2" />}
                      Advanced: VAR[0–9] Parameters
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-3">
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      {vars.map((v, i) => (
                        <div key={i} className="space-y-1">
                          <Label className="text-xs">VAR[{i}]</Label>
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            value={v}
                            onChange={(e) => updateVar(i, parseInt(e.target.value) || 0)}
                            className="h-8"
                          />
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Values 0–100. Affect visual styling, embedded in hash.
                    </p>
                  </CollapsibleContent>
                </Collapsible>

                {/* Seal Result Card */}
                {sealResult && (
                  <SealedResultCard
                    posterHash={normalizeSha256(sealResult.posterHash)}
                    animationHash={sealResult.animationHash ? normalizeSha256(sealResult.animationHash) : null}
                    isLoop={isLoopMode}
                    saveStatus={saveStatus}
                    savedClaimId={savedClaimId}
                    saveError={saveError}
                    saveErrorDetails={saveErrorDetails}
                    onOpenInLibrary={handleOpenInLibrary}
                    onDownloadBundle={handleDownload}
                    onCheckNow={handleCheckNow}
                    onRetrySave={handleRetrySave}
                  />
                )}

                {/* Seal Error */}
                {sealError && (
                  <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg space-y-2">
                    <div className="flex items-center gap-2 text-destructive">
                      <XCircle className="w-5 h-5" />
                      <span className="font-medium">Sealing Blocked</span>
                    </div>
                    <p className="text-sm text-destructive/80">{sealError}</p>
                    <p className="text-xs text-muted-foreground">
                      Check that your snapshot code follows canonical rules (no createCanvas, use random() for randomness).
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-2 pt-2">
                  <Button variant="ghost" onClick={() => setCurrentStep(2)}>
                    Back
                  </Button>
                  <div className="flex-1" />
                  <Button
                    onClick={handleSeal}
                    disabled={!canSeal || isSealing}
                    className="gap-2"
                  >
                    {isSealing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Stamp className="w-4 h-4" />
                    )}
                    {isSealing ? 'Sealing...' : 'Seal Claim'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: Preview & Actions */}
        <div className="space-y-4">
          {/* Status Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center justify-between">
                <span>Bundle Status</span>
                {sealResult ? (
                  <Badge className="bg-verified text-verified-foreground">SEALED</Badge>
                ) : (
                  <Badge variant="secondary">DRAFT</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="text-muted-foreground">Type:</div>
                <div className="font-mono">{claimType}</div>
                <div className="text-muted-foreground">Mode:</div>
                <div className="font-mono">{isLoopMode ? 'loop' : 'static'}</div>
                <div className="text-muted-foreground">Seed:</div>
                <div className="font-mono">{seed}</div>
                <div className="text-muted-foreground">Sources:</div>
                <div className="font-mono">{sources.length}</div>
              </div>

              {currentClaimFields.title && (
                <div className="pt-2 border-t border-border">
                  <div className="text-xs text-muted-foreground mb-1">Title</div>
                  <div className="text-sm truncate">{currentClaimFields.title}</div>
                </div>
              )}

              {sealResult && (
                <div className="pt-2 border-t border-border">
                  <div className="text-xs text-muted-foreground mb-1">Poster Hash</div>
                  <div className="font-mono text-[10px] bg-muted p-2 rounded truncate">
                    {sealResult.posterHash}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button 
                onClick={handleDownload} 
                variant="outline" 
                className="w-full justify-start"
              >
                <Download className="w-4 h-4 mr-2" />
                Download JSON
              </Button>
              <Button 
                onClick={handleCopy} 
                variant="outline" 
                className="w-full justify-start"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy JSON
              </Button>
              <Button 
                onClick={handleReset} 
                variant="ghost" 
                className="w-full justify-start text-muted-foreground"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset Builder
              </Button>
            </CardContent>
          </Card>

          {/* Validation Checklist */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Info className="w-4 h-4" />
                Checklist
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-xs">
                <div className={`flex items-center gap-2 ${isClaimValid ? 'text-verified' : 'text-muted-foreground'}`}>
                  {isClaimValid ? <CheckCircle2 className="w-3 h-3" /> : <div className="w-3 h-3 rounded-full border" />}
                  {claimType === 'sports' && 'Sports details filled'}
                  {claimType === 'pnl' && 'P&L details filled'}
                  {claimType === 'generic' && 'Statement details filled'}
                </div>
                <div className={`flex items-center gap-2 ${sources.length > 0 ? 'text-verified' : 'text-muted-foreground'}`}>
                  {sources.length > 0 ? <CheckCircle2 className="w-3 h-3" /> : <div className="w-3 h-3 rounded-full border" />}
                  At least one source
                </div>
                <div className={`flex items-center gap-2 ${isExecutionValid ? 'text-verified' : 'text-muted-foreground'}`}>
                  {isExecutionValid ? <CheckCircle2 className="w-3 h-3" /> : <div className="w-3 h-3 rounded-full border" />}
                  Seed configured
                </div>
                <div className={`flex items-center gap-2 ${sealResult ? 'text-verified' : 'text-muted-foreground'}`}>
                  {sealResult ? <CheckCircle2 className="w-3 h-3" /> : <div className="w-3 h-3 rounded-full border" />}
                  Claim sealed
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
