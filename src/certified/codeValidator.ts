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
