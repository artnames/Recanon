/**
 * Code Validator for Canonical Execution
 * 
 * Performs preflight checks on code before sending to the Canonical Renderer.
 */

/**
 * Strips single-line (//) and block (/* *\/) comments from code.
 * Returns sanitized code for pattern matching.
 */
export function stripComments(code: string): string {
  // Remove block comments /* ... */ (non-greedy, handles multi-line)
  let sanitized = code.replace(/\/\*[\s\S]*?\*\//g, '');
  // Remove single-line comments // ...
  sanitized = sanitized.replace(/\/\/.*$/gm, '');
  return sanitized;
}

export interface CreateCanvasValidationResult {
  valid: boolean;
  lineNumber?: number;
  lineContent?: string;
}

/**
 * Checks if code contains disallowed createCanvas() calls.
 * Ignores createCanvas() inside comments.
 * 
 * Returns { valid: true } if no disallowed calls found.
 * Returns { valid: false, lineNumber, lineContent } if found.
 */
export function validateNoCreateCanvas(code: string): CreateCanvasValidationResult {
  const lines = code.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Strip comments from this individual line before checking
    const sanitizedLine = stripComments(line);
    
    if (sanitizedLine.includes('createCanvas(')) {
      return {
        valid: false,
        lineNumber: i + 1, // 1-indexed
        lineContent: line.trim(),
      };
    }
  }
  
  return { valid: true };
}

export interface SeedValidationResult {
  hasSeedUsage: boolean;
  lineNumber?: number;
  lineContent?: string;
  warning: string;
}

/**
 * Checks if code references SEED variable (not guaranteed in canonical runtimes).
 * Returns a warning (not a hard block) if SEED is found.
 * 
 * This is a preflight warning to help developers write protocol-safe code.
 * The SEED variable is not guaranteed to exist in canonical runtimes.
 * Use random()/noise() instead which are seeded via snapshot.seed.
 */
export function validateNoSeedUsage(code: string): SeedValidationResult {
  const lines = code.split('\n');
  
  // Pattern to match SEED as a standalone variable (not part of randomSeed, etc.)
  // Match SEED when it's not preceded by letters/underscore and not followed by letters/underscore/digits
  const seedPattern = /(?<![a-zA-Z_])SEED(?![a-zA-Z_0-9])/;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Strip comments from this individual line before checking
    const sanitizedLine = stripComments(line);
    
    if (seedPattern.test(sanitizedLine)) {
      return {
        hasSeedUsage: true,
        lineNumber: i + 1, // 1-indexed
        lineContent: line.trim(),
        warning: "SEED is not guaranteed to exist in canonical runtimes. Use random()/noise() and rely on sealed seed input.",
      };
    }
  }
  
  return {
    hasSeedUsage: false,
    warning: "",
  };
}

export interface CodeValidationResult {
  valid: boolean;
  errors: Array<{
    type: 'createCanvas';
    message: string;
    lineNumber?: number;
    lineContent?: string;
  }>;
  warnings: Array<{
    type: 'seed';
    message: string;
    lineNumber?: number;
    lineContent?: string;
  }>;
}

/**
 * Comprehensive code validation for canonical execution.
 * 
 * Returns validation result with:
 * - errors: Hard blocks (createCanvas usage)
 * - warnings: Soft warnings (SEED usage)
 */
export function validateCode(code: string): CodeValidationResult {
  const errors: CodeValidationResult['errors'] = [];
  const warnings: CodeValidationResult['warnings'] = [];
  
  // Check for createCanvas (hard block)
  const canvasResult = validateNoCreateCanvas(code);
  if (!canvasResult.valid) {
    errors.push({
      type: 'createCanvas',
      message: `createCanvas() is not allowed. Canvas is provided by the Canonical Renderer (1950x2400). Found at line ${canvasResult.lineNumber}.`,
      lineNumber: canvasResult.lineNumber,
      lineContent: canvasResult.lineContent,
    });
  }
  
  // Check for SEED usage (soft warning)
  const seedResult = validateNoSeedUsage(code);
  if (seedResult.hasSeedUsage) {
    warnings.push({
      type: 'seed',
      message: seedResult.warning,
      lineNumber: seedResult.lineNumber,
      lineContent: seedResult.lineContent,
    });
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
