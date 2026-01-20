/**
 * Uniqueness Policy Controls
 * Toggle auto-randomize on new claim + manual randomize button
 */

import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Dices, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { generateSecureRandomSeed, generateSecureRandomVars } from '@/lib/crypto';

interface UniquenessPolicyProps {
  autoRandomize: boolean;
  onAutoRandomizeChange: (value: boolean) => void;
  onRandomizeNow: (seed: number, vars: number[]) => void;
  onResetToDefaults: () => void;
  seed: number;
  vars: number[];
}

export function UniquenessPolicy({
  autoRandomize,
  onAutoRandomizeChange,
  onRandomizeNow,
  onResetToDefaults,
  seed,
  vars,
}: UniquenessPolicyProps) {
  const handleRandomizeNow = () => {
    const newSeed = generateSecureRandomSeed();
    const newVars = generateSecureRandomVars();
    onRandomizeNow(newSeed, newVars);
    toast.success('Randomized', {
      description: `Seed: ${newSeed}, Vars: [${newVars.slice(0, 3).join(', ')}...]`,
    });
  };
  
  const handleResetToDefaults = () => {
    onResetToDefaults();
    toast.info('Reset to defaults');
  };
  
  return (
    <div className="p-3 bg-muted/30 rounded-lg border border-border space-y-3">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label className="text-xs font-medium">Uniqueness Policy</Label>
          <p className="text-[10px] text-muted-foreground">
            Auto-randomize seed/vars on New Claim
          </p>
        </div>
        <Switch
          checked={autoRandomize}
          onCheckedChange={onAutoRandomizeChange}
        />
      </div>
      
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleRandomizeNow}
          className="flex-1 text-xs h-7 gap-1"
        >
          <Dices className="w-3 h-3" />
          🎲 Randomize Now
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleResetToDefaults}
          className="text-xs h-7 gap-1 text-muted-foreground"
        >
          <RotateCcw className="w-3 h-3" />
          ↩ Reset
        </Button>
      </div>
      
      {/* Current values preview */}
      <div className="text-[10px] text-muted-foreground font-mono">
        <span>seed: {seed}</span>
        <span className="mx-2">|</span>
        <span>vars: [{vars.slice(0, 3).join(', ')}...]</span>
      </div>
    </div>
  );
}
