/**
 * Library View - Browse and search sealed claims
 * 
 * Lists all sealed claims from Supabase with search functionality.
 * Click to view details and re-verify claims.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Search, 
  Copy, 
  Download, 
  RotateCcw, 
  ExternalLink,
  Clock,
  Hash,
  FileText,
  Trophy,
  DollarSign,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronLeft,
  RefreshCw,
  Stamp,
  Play,
  Image
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  listSealedClaims, 
  getSealedClaimById, 
  getSealedClaimByHash,
  normalizeSha256,
  type SealedClaimRow 
} from '@/api/claims';
import { verifyCertified } from '@/certified/canonicalClient';
import { downloadClaimBundle, serializeClaimBundle } from '@/types/claimBundle';
import type { ClaimBundle } from '@/types/claimBundle';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { SearchFilterChips, parseSearchQuery } from './SearchFilterChips';

interface LibraryViewProps {
  initialClaimId?: string | null;
  initialHash?: string | null;
  onNavigateToCreate?: () => void;
}

type VerifyStatus = 'idle' | 'checking' | 'passed' | 'failed' | 'error';

interface VerifyDebugInfo {
  expectedPosterHash: string;
  expectedPosterSource: string;
  expectedAnimationHash: string | null;
  expectedAnimationSource: string | null;
  computedPosterHash: string | null;
  computedAnimationHash: string | null;
  failureReason: string | null;
}

// Normalize hash: strip sha256: prefix and lowercase
function normalizeHashForComparison(hash: string | null | undefined): string | null {
  if (!hash) return null;
  return hash.replace(/^sha256:/i, '').toLowerCase();
}

export function LibraryView({ initialClaimId, initialHash, onNavigateToCreate }: LibraryViewProps) {
  // List state
  const [allClaims, setAllClaims] = useState<SealedClaimRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  
  // Detail view state
  const [selectedClaim, setSelectedClaim] = useState<SealedClaimRow | null>(null);
  const [verifyStatus, setVerifyStatus] = useState<VerifyStatus>('idle');
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [lastCheckedAt, setLastCheckedAt] = useState<string | null>(null);
  const [verifyDebug, setVerifyDebug] = useState<VerifyDebugInfo | null>(null);
  
  // Not found state (for deep links)
  const [notFound, setNotFound] = useState<{ type: 'id' | 'hash'; value: string } | null>(null);

  // "Open by Hash" state (must be before any early returns)
  const [openByHashInput, setOpenByHashInput] = useState('');
  const [isLoadingHash, setIsLoadingHash] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load all claims (we filter client-side for better UX)
  const loadClaims = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await listSealedClaims({ limit: 200 });
      setAllClaims(data);
    } catch (error) {
      console.error('Failed to load claims:', error);
      toast.error('Failed to load claims');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load only
  useEffect(() => {
    loadClaims();
  }, [loadClaims]);

  // Filter claims client-side based on search and filters
  const filteredClaims = useMemo(() => {
    const { filters, textQuery } = parseSearchQuery(debouncedQuery);
    
    // Merge parsed filters with active chip filters
    const mergedFilters = { ...filters };
    activeFilters.forEach(f => {
      const [key, value] = f.split(':');
      if (key === 'type') mergedFilters.type = value;
      if (key === 'mode') mergedFilters.mode = value;
    });
    
    return allClaims.filter(claim => {
      // Type filter
      if (mergedFilters.type) {
        // Map 'finance' to 'pnl'
        const filterType = mergedFilters.type === 'finance' ? 'pnl' : mergedFilters.type;
        if (claim.claim_type !== filterType) return false;
      }
      
      // Mode filter
      if (mergedFilters.mode && claim.mode !== mergedFilters.mode) return false;
      
      // Text search
      if (textQuery.trim()) {
        const q = textQuery.toLowerCase();
        const searchableText = [
          claim.title,
          claim.statement,
          claim.subject,
          claim.poster_hash,
          claim.keywords,
        ].filter(Boolean).join(' ').toLowerCase();
        
        if (!searchableText.includes(q)) return false;
      }
      
      return true;
    });
  }, [allClaims, debouncedQuery, activeFilters]);

  // Toggle filter chip
  const handleToggleFilter = (filter: string) => {
    setActiveFilters(prev => 
      prev.includes(filter)
        ? prev.filter(f => f !== filter)
        : [...prev, filter]
    );
  };

  const handleClearFilters = () => {
    setActiveFilters([]);
    setSearchQuery('');
  };

  // Handle deep link on mount
  useEffect(() => {
    const loadInitialClaim = async () => {
      if (initialClaimId) {
        const claim = await getSealedClaimById(initialClaimId);
        if (claim) {
          setSelectedClaim(claim);
          setNotFound(null);
        } else {
          setNotFound({ type: 'id', value: initialClaimId });
        }
      } else if (initialHash) {
        const claim = await getSealedClaimByHash(initialHash);
        if (claim) {
          setSelectedClaim(claim);
          setNotFound(null);
        } else {
          setNotFound({ type: 'hash', value: initialHash });
        }
      }
    };
    
    if (initialClaimId || initialHash) {
      loadInitialClaim();
    }
  }, [initialClaimId, initialHash]);

  // Handle row click
  const handleRowClick = (claim: SealedClaimRow) => {
    setSelectedClaim(claim);
    setVerifyStatus('idle');
    setVerifyError(null);
    setLastCheckedAt(null);
    setVerifyDebug(null);
    setNotFound(null);
  };

  // Back to list
  const handleBack = () => {
    setSelectedClaim(null);
    setVerifyStatus('idle');
    setVerifyError(null);
    setVerifyDebug(null);
    setNotFound(null);
  };

  // Check now (verify) - builds inputs ONLY from saved record
  const handleCheckNow = async () => {
    if (!selectedClaim) return;
    
    const bundle = selectedClaim.bundle_json as ClaimBundle;
    const snapshot = bundle.snapshot;
    const isLoop = selectedClaim.mode === 'loop';
    
    // Build expected hashes from saved record (bundle.baseline preferred, fallback to row columns)
    const expectedPosterHash = bundle.baseline?.posterHash ?? selectedClaim.poster_hash;
    const expectedPosterSource = bundle.baseline?.posterHash ? 'bundle.baseline.posterHash' : 'row.poster_hash';
    const expectedAnimationHash = isLoop 
      ? (bundle.baseline?.animationHash ?? selectedClaim.animation_hash ?? null)
      : null;
    const expectedAnimationSource = isLoop
      ? (bundle.baseline?.animationHash ? 'bundle.baseline.animationHash' : 'row.animation_hash')
      : null;
    
    // Initialize debug info
    const debug: VerifyDebugInfo = {
      expectedPosterHash,
      expectedPosterSource,
      expectedAnimationHash,
      expectedAnimationSource,
      computedPosterHash: null,
      computedAnimationHash: null,
      failureReason: null,
    };
    
    setVerifyStatus('checking');
    setVerifyError(null);
    setVerifyDebug(debug);

    // Validate we have baseline hashes
    if (!expectedPosterHash) {
      debug.failureReason = 'Missing baseline hash (no poster hash found in saved record)';
      setVerifyDebug({ ...debug });
      setVerifyStatus('failed');
      setVerifyError(debug.failureReason);
      toast.error('Verification failed', { description: debug.failureReason });
      return;
    }
    
    if (isLoop && !expectedAnimationHash) {
      debug.failureReason = 'Loop mode requires animation hash but none found in saved record';
      setVerifyDebug({ ...debug });
      setVerifyStatus('failed');
      setVerifyError(debug.failureReason);
      toast.error('Verification failed', { description: debug.failureReason });
      return;
    }

    try {
      // Normalize expected hashes for comparison
      const normalizedExpectedPoster = normalizeHashForComparison(expectedPosterHash);
      const normalizedExpectedAnimation = normalizeHashForComparison(expectedAnimationHash);
      
      // Call appropriate verify function
      const response = await verifyCertified(
        snapshot,
        expectedPosterHash,
        isLoop && expectedAnimationHash ? expectedAnimationHash : undefined
      );

      setLastCheckedAt(new Date().toISOString());
      
      // Extract computed hashes from response based on mode
      if (isLoop) {
        debug.computedPosterHash = response.computedPosterHash || null;
        debug.computedAnimationHash = response.computedAnimationHash || null;
      } else {
        debug.computedPosterHash = response.computedHash || null;
        debug.computedAnimationHash = null;
      }
      
      // Normalize computed hashes
      const normalizedComputedPoster = normalizeHashForComparison(debug.computedPosterHash);
      const normalizedComputedAnimation = normalizeHashForComparison(debug.computedAnimationHash);

      // Check for missing computed hashes
      if (!normalizedComputedPoster) {
        debug.failureReason = 'Computed hash missing (client parsing issue - renderer may not have returned posterHash)';
        setVerifyDebug({ ...debug });
        setVerifyStatus('failed');
        setVerifyError(debug.failureReason);
        toast.error('Verification failed', { description: debug.failureReason });
        return;
      }
      
      // Compare hashes
      const posterMatch = normalizedExpectedPoster === normalizedComputedPoster;
      const animationMatch = !isLoop || normalizedExpectedAnimation === normalizedComputedAnimation;

      if (posterMatch && animationMatch) {
        setVerifyDebug({ ...debug });
        setVerifyStatus('passed');
        toast.success('Verification passed!', {
          description: 'Hashes match. This claim is intact.',
        });
      } else {
        // Determine failure reason
        if (!posterMatch) {
          debug.failureReason = `Hash mismatch: expected poster ${normalizedExpectedPoster?.slice(0, 16)}... but computed ${normalizedComputedPoster?.slice(0, 16)}... (inputs changed or wrong snapshot loaded)`;
        } else if (!animationMatch) {
          debug.failureReason = `Hash mismatch: expected animation ${normalizedExpectedAnimation?.slice(0, 16)}... but computed ${normalizedComputedAnimation?.slice(0, 16)}...`;
        }
        setVerifyDebug({ ...debug });
        setVerifyStatus('failed');
        toast.error('Verification failed', {
          description: debug.failureReason || 'Hashes do not match.',
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      debug.failureReason = `Verification request failed: ${message}`;
      setVerifyDebug({ ...debug });
      setVerifyStatus('error');
      setVerifyError(message);
      toast.error('Check failed', { description: message });
    }
  };

  // Copy hash
  const handleCopyHash = async (hash: string) => {
    try {
      await navigator.clipboard.writeText(hash);
      toast.success('Hash copied');
    } catch {
      toast.error('Failed to copy');
    }
  };

  // Download bundle
  const handleDownload = (bundle: ClaimBundle) => {
    downloadClaimBundle(bundle);
    toast.success('Bundle downloaded');
  };

  // Get claim type icon
  const getTypeIcon = (type: string | null) => {
    switch (type) {
      case 'sports':
        return <Trophy className="w-4 h-4" />;
      case 'pnl':
        return <DollarSign className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  // Truncate hash for display
  const truncateHash = (hash: string, chars = 12) => {
    const stripped = hash.replace(/^sha256:/, '');
    if (stripped.length <= chars * 2) return hash;
    return `sha256:${stripped.slice(0, chars)}…${stripped.slice(-chars)}`;
  };

  // Render not found state
  if (notFound) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={handleBack}>
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back to Library
          </Button>
        </div>
        
        <Card className="border-warning/30 bg-warning/5">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4 text-center py-8">
              <AlertTriangle className="w-12 h-12 text-warning" />
              <div>
                <h3 className="text-lg font-semibold">Claim Not Found</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  No sealed claim found with {notFound.type === 'id' ? 'ID' : 'hash'}:
                </p>
                <code className="text-xs font-mono bg-muted px-2 py-1 rounded mt-2 inline-block">
                  {notFound.value}
                </code>
              </div>
              <div className="flex gap-2 mt-4">
                <Button variant="outline" onClick={handleBack}>
                  Browse Library
                </Button>
                {onNavigateToCreate && (
                  <Button onClick={onNavigateToCreate}>
                    Create New Claim
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Render detail view
  if (selectedClaim) {
    const bundle = selectedClaim.bundle_json as ClaimBundle;
    
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={handleBack}>
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back to Library
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => handleDownload(bundle)}>
              <Download className="w-4 h-4 mr-1" />
              Download JSON
            </Button>
          </div>
        </div>

        {/* Claim Header */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  {getTypeIcon(selectedClaim.claim_type)}
                  <Badge variant="outline" className="capitalize">
                    {selectedClaim.claim_type || 'generic'}
                  </Badge>
                  <Badge variant="secondary">{selectedClaim.mode}</Badge>
                </div>
                <CardTitle className="text-xl">{selectedClaim.title || 'Untitled Claim'}</CardTitle>
                {selectedClaim.statement && (
                  <p className="text-muted-foreground">{selectedClaim.statement}</p>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Hash */}
            <div className="p-3 bg-muted/50 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium flex items-center gap-2">
                  <Hash className="w-4 h-4" />
                  Poster Hash
                </span>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => handleCopyHash(selectedClaim.poster_hash)}
                >
                  <Copy className="w-3.5 h-3.5" />
                </Button>
              </div>
              <code className="text-xs font-mono block break-all text-muted-foreground">
                {selectedClaim.poster_hash}
              </code>
            </div>

            {selectedClaim.animation_hash && (
              <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Animation Hash</span>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleCopyHash(selectedClaim.animation_hash!)}
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                </div>
                <code className="text-xs font-mono block break-all text-muted-foreground">
                  {selectedClaim.animation_hash}
                </code>
              </div>
            )}

            {/* Metadata */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Created</span>
                <p className="font-medium">
                  {formatDistanceToNow(new Date(selectedClaim.created_at), { addSuffix: true })}
                </p>
              </div>
              {selectedClaim.event_date && (
                <div>
                  <span className="text-muted-foreground">Event Date</span>
                  <p className="font-medium">
                    {new Date(selectedClaim.event_date).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Verification */}
        <Card className={
          verifyStatus === 'passed' ? 'border-verified/50 bg-verified/5' :
          verifyStatus === 'failed' ? 'border-destructive/50 bg-destructive/5' :
          ''
        }>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <RotateCcw className="w-5 h-5" />
              Verify Claim
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Re-execute the snapshot on the Canonical Renderer to verify the hashes match.
            </p>
            
            <div className="flex items-center gap-4">
              <Button 
                onClick={handleCheckNow} 
                disabled={verifyStatus === 'checking'}
                className="gap-2"
              >
                {verifyStatus === 'checking' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Checking…
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    Check Now
                  </>
                )}
              </Button>

              {verifyStatus === 'passed' && (
                <div className="flex items-center gap-2 text-verified">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="font-semibold">VERIFIED</span>
                </div>
              )}

              {verifyStatus === 'failed' && (
                <div className="flex items-center gap-2 text-destructive">
                  <XCircle className="w-5 h-5" />
                  <span className="font-semibold">FAILED</span>
                </div>
              )}

              {verifyStatus === 'error' && (
                <div className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="w-5 h-5" />
                  <span className="text-sm">{verifyError}</span>
                </div>
              )}
            </div>

            {lastCheckedAt && (
              <p className="text-xs text-muted-foreground">
                Last checked: {new Date(lastCheckedAt).toLocaleString()}
              </p>
            )}

            {/* Debug Info Panel - Always show after check */}
            {verifyDebug && (
              <div className="mt-4 p-4 bg-muted/30 rounded-lg space-y-3 text-xs font-mono">
                <div className="text-sm font-semibold text-foreground mb-2 font-sans">
                  Verification Debug
                </div>
                
                {/* Expected Poster Hash */}
                <div className="space-y-1">
                  <div className="text-muted-foreground">
                    Expected poster hash <span className="text-primary">(source: {verifyDebug.expectedPosterSource})</span>
                  </div>
                  <code className="block break-all bg-muted p-2 rounded">
                    {verifyDebug.expectedPosterHash || '(none)'}
                  </code>
                </div>
                
                {/* Computed Poster Hash */}
                <div className="space-y-1">
                  <div className="text-muted-foreground">Computed poster hash</div>
                  <code className={`block break-all p-2 rounded ${
                    verifyDebug.computedPosterHash && 
                    normalizeHashForComparison(verifyDebug.expectedPosterHash) === normalizeHashForComparison(verifyDebug.computedPosterHash)
                      ? 'bg-verified/20 text-verified'
                      : verifyDebug.computedPosterHash 
                        ? 'bg-destructive/20 text-destructive'
                        : 'bg-muted'
                  }`}>
                    {verifyDebug.computedPosterHash || '(not returned)'}
                  </code>
                </div>
                
                {/* Loop mode: Animation hashes */}
                {selectedClaim.mode === 'loop' && (
                  <>
                    <div className="space-y-1 pt-2 border-t border-border">
                      <div className="text-muted-foreground">
                        Expected animation hash <span className="text-primary">(source: {verifyDebug.expectedAnimationSource})</span>
                      </div>
                      <code className="block break-all bg-muted p-2 rounded">
                        {verifyDebug.expectedAnimationHash || '(none)'}
                      </code>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="text-muted-foreground">Computed animation hash</div>
                      <code className={`block break-all p-2 rounded ${
                        verifyDebug.computedAnimationHash && 
                        normalizeHashForComparison(verifyDebug.expectedAnimationHash) === normalizeHashForComparison(verifyDebug.computedAnimationHash)
                          ? 'bg-verified/20 text-verified'
                          : verifyDebug.computedAnimationHash 
                            ? 'bg-destructive/20 text-destructive'
                            : 'bg-muted'
                      }`}>
                        {verifyDebug.computedAnimationHash || '(not returned)'}
                      </code>
                    </div>
                  </>
                )}
                
                {/* Failure reason */}
                {verifyDebug.failureReason && (
                  <div className="pt-2 border-t border-border">
                    <div className="flex items-start gap-2 text-destructive">
                      <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
                      <span className="font-sans text-sm">{verifyDebug.failureReason}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sources */}
        {bundle.sources && bundle.sources.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Sources</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {bundle.sources.map((source, i) => (
                  <div key={i} className="p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-sm">{source.label}</p>
                        <a 
                          href={source.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline flex items-center gap-1"
                        >
                          {source.url}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                    {source.selectorOrEvidence && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Evidence: {source.selectorOrEvidence}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // Handle "Open by Hash" submission
  const handleOpenByHash = async () => {
    const input = openByHashInput.trim();
    if (!input) return;
    
    // Normalize: strip sha256: prefix if present
    const normalizedHash = input.replace(/^sha256:/i, '');
    
    // Check if it looks like a hex hash (32-64 chars)
    if (!/^[a-fA-F0-9]{16,64}$/.test(normalizedHash)) {
      toast.error('Invalid hash format', { description: 'Enter a valid hex hash (16-64 characters)' });
      return;
    }
    
    setIsLoadingHash(true);
    try {
      const claim = await getSealedClaimByHash(normalizedHash);
      if (claim) {
        setSelectedClaim(claim);
        setOpenByHashInput('');
        toast.success('Claim found!');
      } else {
        toast.error('No claim found', { description: 'No sealed claim matches this hash' });
      }
    } catch (error) {
      console.error('Failed to lookup hash:', error);
      toast.error('Lookup failed');
    } finally {
      setIsLoadingHash(false);
    }
  };

  // Render list view
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">Library</h1>
        <p className="text-sm text-muted-foreground">
          Browse and verify sealed claims from the registry.
        </p>
      </div>

      {/* Open by Hash */}
      <Card className="bg-muted/30">
        <CardContent className="py-3 px-4">
          <div className="flex items-center gap-3">
            <Hash className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <Input
              placeholder="Open by hash… (paste sha256:abc123 or raw hex)"
              value={openByHashInput}
              onChange={(e) => setOpenByHashInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleOpenByHash()}
              className="flex-1 h-9"
            />
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleOpenByHash}
              disabled={isLoadingHash || !openByHashInput.trim()}
            >
              {isLoadingHash ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <ExternalLink className="w-4 h-4 mr-1" />
                  Open
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by title, hash, or type:sports mode:loop…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button variant="outline" size="icon" onClick={loadClaims}>
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        
        {/* Filter Chips */}
        <SearchFilterChips
          activeFilters={activeFilters}
          onToggleFilter={handleToggleFilter}
          onClearAll={handleClearFilters}
        />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredClaims.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              {allClaims.length === 0 ? (
                <>
                  <Stamp className="w-12 h-12 text-muted-foreground/50 mb-4" />
                  <h3 className="font-medium mb-1">No Sealed Claims Yet</h3>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    Your sealed claims will appear here. Create one in Claim Studio to get started.
                  </p>
                  {onNavigateToCreate && (
                    <Button className="mt-4" onClick={onNavigateToCreate}>
                      Create Your First Claim
                    </Button>
                  )}
                </>
              ) : (
                <>
                  <Search className="w-12 h-12 text-muted-foreground/50 mb-4" />
                  <h3 className="font-medium mb-1">No Matches Found</h3>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    Try searching by hash, team name, or adjust filters.
                  </p>
                  <Button 
                    variant="outline" 
                    className="mt-4" 
                    onClick={handleClearFilters}
                  >
                    Clear Filters
                  </Button>
                </>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]">Type</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead className="hidden md:table-cell">Mode</TableHead>
                  <TableHead className="hidden lg:table-cell">Poster Hash</TableHead>
                  <TableHead className="text-right">Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClaims.map((claim) => (
                  <TableRow 
                    key={claim.id} 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleRowClick(claim)}
                  >
                    <TableCell>{getTypeIcon(claim.claim_type)}</TableCell>
                    <TableCell>
                      <div className="max-w-[200px] truncate font-medium">
                        {claim.title || 'Untitled'}
                      </div>
                      {claim.statement && (
                        <div className="max-w-[200px] truncate text-xs text-muted-foreground">
                          {claim.statement}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant="secondary" className="text-xs">
                        {claim.mode}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <code className="text-xs font-mono text-muted-foreground">
                        {truncateHash(claim.poster_hash, 8)}
                      </code>
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(claim.created_at), { addSuffix: true })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
