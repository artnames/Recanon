/**
 * Claim Builder - Form-driven bundle generator
 * 
 * Turns any real-world claim into a sealed, replayable, verifiable artifact.
 * Works for any domain: sports, finance, governance, media, science, etc.
 */

import { useState, useMemo, useCallback } from 'react';
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
  FileCode
} from 'lucide-react';
import { 
  ClaimBundle, 
  ClaimSource,
  CLAIM_BUNDLE_VERSION,
  downloadClaimBundle,
  serializeClaimBundle,
} from '@/types/claimBundle';
import { 
  ClaimPreset, 
  getCodeTemplate, 
  getPresetDescription 
} from '@/certified/claimCodeTemplates';
import { renderCertified } from '@/certified/canonicalClient';
import { toast } from 'sonner';

interface ClaimBuilderProps {
  className?: string;
}

export function ClaimBuilder({ className }: ClaimBuilderProps) {
  // Step tracking
  const [currentStep, setCurrentStep] = useState(1);
  
  // Step 1: Claim Details
  const [title, setTitle] = useState('');
  const [statement, setStatement] = useState('');
  const [subject, setSubject] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [notes, setNotes] = useState('');
  
  // Step 2: Evidence Sources
  const [sources, setSources] = useState<ClaimSource[]>([]);
  
  // Step 3: Execution Preset
  const [preset, setPreset] = useState<ClaimPreset>('generic');
  
  // Step 4: Execution Settings
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

  // Generate code from preset
  const generatedCode = useMemo(() => {
    return getCodeTemplate(preset);
  }, [preset]);

  // Build the bundle in real-time
  const bundle: ClaimBundle = useMemo(() => {
    return {
      bundleVersion: CLAIM_BUNDLE_VERSION,
      createdAt: sealResult ? new Date().toISOString() : '',
      mode: isLoopMode ? 'loop' : 'static',
      claim: {
        title: title.trim(),
        statement: statement.trim(),
        eventDate,
        subject: subject.trim(),
        notes: notes.trim(),
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
  }, [title, statement, subject, eventDate, notes, sources, generatedCode, seed, vars, isLoopMode, sealResult]);

  // Validation
  const isStep1Valid = title.trim().length > 0 && statement.trim().length > 0 && eventDate.length > 0;
  const isStep2Valid = true; // Sources are optional
  const isStep3Valid = true; // Preset always has default
  const isStep4Valid = seed > 0;
  const canSeal = isStep1Valid && isStep4Valid;

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

  // Seal the claim
  const handleSeal = useCallback(async () => {
    if (!canSeal) return;
    
    setIsSealing(true);
    setSealError(null);
    setSealResult(null);

    try {
      const snapshot = {
        code: generatedCode,
        seed,
        vars,
        execution: isLoopMode ? { frames: 60, loop: true } : { frames: 1, loop: false },
      };

      const response = await renderCertified(snapshot);
      
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Renderer returned no data');
      }

      const result = response.data;
      
      if (isLoopMode) {
        if (!result.imageHash || !result.animationHash) {
          throw new Error('Loop mode requires both poster and animation hashes');
        }
        setSealResult({
          posterHash: result.imageHash,
          animationHash: result.animationHash,
        });
      } else {
        if (!result.imageHash) {
          throw new Error('Renderer did not return an image hash');
        }
        setSealResult({
          posterHash: result.imageHash,
          animationHash: null,
        });
      }

      toast.success('Claim sealed successfully!', {
        description: 'Your claim has been cryptographically sealed.',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setSealError(message);
      toast.error('Sealing blocked', {
        description: message,
      });
    } finally {
      setIsSealing(false);
    }
  }, [canSeal, generatedCode, seed, vars, isLoopMode]);

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
    setTitle('');
    setStatement('');
    setSubject('');
    setEventDate('');
    setNotes('');
    setSources([]);
    setPreset('generic');
    setSeed(12345);
    setIsLoopMode(false);
    setVars([50, 50, 50, 50, 50, 50, 50, 50, 50, 50]);
    setSealResult(null);
    setSealError(null);
    setCurrentStep(1);
    toast.info('Builder reset');
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Create Claim</h1>
        <p className="text-sm text-muted-foreground">
          This tool turns a real-world claim into a sealed, replayable artifact.
          Anyone can independently re-check the result using the same inputs.
        </p>
      </div>

      {/* Step Progress */}
      <div className="flex items-center gap-2 text-xs">
        {[1, 2, 3, 4].map((step) => (
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
              {step === 1 && 'Claim'}
              {step === 2 && 'Sources'}
              {step === 3 && 'Preset'}
              {step === 4 && 'Execute'}
            </span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left: Form */}
        <div className="xl:col-span-2 space-y-6">
          {/* Step 1: Claim Details */}
          {currentStep === 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">1</span>
                  Claim Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    placeholder="e.g., UEFA Champions League Semi-Final Result"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="statement">Statement *</Label>
                  <Textarea
                    id="statement"
                    placeholder="e.g., Manchester City beat Real Madrid 2–1 in the Champions League semi-final on May 17, 2023."
                    value={statement}
                    onChange={(e) => setStatement(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="eventDate">Event Date / Time *</Label>
                    <Input
                      id="eventDate"
                      type="datetime-local"
                      value={eventDate}
                      onChange={(e) => setEventDate(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject (optional)</Label>
                    <Input
                      id="subject"
                      placeholder="e.g., UEFA Champions League Semi-Final"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes (optional)</Label>
                  <Textarea
                    id="notes"
                    placeholder="Additional context or notes..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                  />
                </div>

                <div className="flex justify-end">
                  <Button onClick={() => setCurrentStep(2)} disabled={!isStep1Valid}>
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
                          placeholder="e.g., UEFA Official Match Report"
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
                    Next: Execution Preset
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Execution Preset */}
          {currentStep === 3 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">3</span>
                  Execution Preset
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Choose a visualization style for your claim. This affects how the sealed output looks, not the verification logic.
                </p>

                <div className="space-y-2">
                  <Label>Visualization Preset</Label>
                  <Select value={preset} onValueChange={(v) => setPreset(v as ClaimPreset)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="generic">Generic</SelectItem>
                      <SelectItem value="sports">Sports Result</SelectItem>
                      <SelectItem value="financial">Financial Result</SelectItem>
                      <SelectItem value="custom">Custom (Advanced)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {getPresetDescription(preset)}
                  </p>
                </div>

                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                    <FileCode className="w-4 h-4" />
                    Generated Code Preview
                  </div>
                  <pre className="text-[10px] font-mono overflow-x-auto max-h-48 text-muted-foreground">
                    {generatedCode.slice(0, 500)}...
                  </pre>
                </div>

                <div className="flex justify-between">
                  <Button variant="ghost" onClick={() => setCurrentStep(2)}>
                    Back
                  </Button>
                  <Button onClick={() => setCurrentStep(4)}>
                    Next: Execute Settings
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 4: Execution Settings */}
          {currentStep === 4 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">4</span>
                  Execution Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="seed">Seed *</Label>
                    <Input
                      id="seed"
                      type="number"
                      value={seed}
                      onChange={(e) => setSeed(parseInt(e.target.value) || 0)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Seeds random() and noise() for determinism
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
                      Values 0–100. Affect visual output, embedded in hash.
                    </p>
                  </CollapsibleContent>
                </Collapsible>

                {/* Seal Result */}
                {sealResult && (
                  <div className="p-4 bg-verified/10 border border-verified/30 rounded-lg space-y-2">
                    <div className="flex items-center gap-2 text-verified">
                      <CheckCircle2 className="w-5 h-5" />
                      <span className="font-medium">Claim Sealed</span>
                    </div>
                    <div className="text-xs font-mono space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground w-24">Poster Hash:</span>
                        <span className="truncate">{sealResult.posterHash}</span>
                      </div>
                      {sealResult.animationHash && (
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground w-24">Anim Hash:</span>
                          <span className="truncate">{sealResult.animationHash}</span>
                        </div>
                      )}
                    </div>
                  </div>
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
                  <Button variant="ghost" onClick={() => setCurrentStep(3)}>
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
                <div className="text-muted-foreground">Mode:</div>
                <div className="font-mono">{isLoopMode ? 'loop' : 'static'}</div>
                <div className="text-muted-foreground">Seed:</div>
                <div className="font-mono">{seed}</div>
                <div className="text-muted-foreground">Sources:</div>
                <div className="font-mono">{sources.length}</div>
                <div className="text-muted-foreground">Preset:</div>
                <div className="font-mono">{preset}</div>
              </div>

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
                <div className={`flex items-center gap-2 ${isStep1Valid ? 'text-verified' : 'text-muted-foreground'}`}>
                  {isStep1Valid ? <CheckCircle2 className="w-3 h-3" /> : <div className="w-3 h-3 rounded-full border" />}
                  Claim details filled
                </div>
                <div className={`flex items-center gap-2 ${sources.length > 0 ? 'text-verified' : 'text-muted-foreground'}`}>
                  {sources.length > 0 ? <CheckCircle2 className="w-3 h-3" /> : <div className="w-3 h-3 rounded-full border" />}
                  At least one source
                </div>
                <div className={`flex items-center gap-2 ${isStep4Valid ? 'text-verified' : 'text-muted-foreground'}`}>
                  {isStep4Valid ? <CheckCircle2 className="w-3 h-3" /> : <div className="w-3 h-3 rounded-full border" />}
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
