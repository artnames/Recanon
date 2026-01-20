/**
 * Search Filter Chips - Quick filter chips for Library search
 */

import { Badge } from '@/components/ui/badge';
import { Trophy, DollarSign, Image, Play, X } from 'lucide-react';

interface SearchFilterChipsProps {
  activeFilters: string[];
  onToggleFilter: (filter: string) => void;
  onClearAll: () => void;
}

const FILTER_CHIPS = [
  { key: 'type:sports', label: 'Sports', icon: Trophy },
  { key: 'type:pnl', label: 'Finance', icon: DollarSign },
  { key: 'mode:static', label: 'Static', icon: Image },
  { key: 'mode:loop', label: 'Loop', icon: Play },
];

export function SearchFilterChips({ 
  activeFilters, 
  onToggleFilter,
  onClearAll
}: SearchFilterChipsProps) {
  const hasActiveFilters = activeFilters.length > 0;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs text-muted-foreground">Quick filters:</span>
      {FILTER_CHIPS.map(({ key, label, icon: Icon }) => {
        const isActive = activeFilters.includes(key);
        return (
          <Badge
            key={key}
            variant={isActive ? 'default' : 'outline'}
            className={`cursor-pointer gap-1.5 transition-colors ${
              isActive 
                ? 'bg-primary hover:bg-primary/90' 
                : 'hover:bg-muted'
            }`}
            onClick={() => onToggleFilter(key)}
          >
            <Icon className="w-3 h-3" />
            {label}
          </Badge>
        );
      })}
      {hasActiveFilters && (
        <Badge 
          variant="secondary" 
          className="cursor-pointer gap-1 text-muted-foreground hover:text-foreground hover:bg-muted"
          onClick={onClearAll}
        >
          <X className="w-3 h-3" />
          Clear
        </Badge>
      )}
    </div>
  );
}

/**
 * Parse search query for type: and mode: filters
 */
export function parseSearchQuery(query: string): {
  filters: { type?: string; mode?: string };
  textQuery: string;
} {
  const filters: { type?: string; mode?: string } = {};
  let textQuery = query;

  // Extract type:sports or type:pnl or type:generic
  const typeMatch = query.match(/type:(sports|pnl|finance|generic)/i);
  if (typeMatch) {
    let type = typeMatch[1].toLowerCase();
    // Map 'finance' to 'pnl' for convenience
    if (type === 'finance') type = 'pnl';
    filters.type = type;
    textQuery = textQuery.replace(typeMatch[0], '').trim();
  }

  // Extract mode:static or mode:loop
  const modeMatch = query.match(/mode:(static|loop)/i);
  if (modeMatch) {
    filters.mode = modeMatch[1].toLowerCase();
    textQuery = textQuery.replace(modeMatch[0], '').trim();
  }

  return { filters, textQuery };
}
